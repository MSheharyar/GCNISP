<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Charge;
use App\Models\Customer;
use App\Models\Payment;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ChargeController extends Controller
{
    // Cards charged today, newest first. Portal recharges arrive as `pending`
    // rows staff must review (edit package / amount / opening balance) and then
    // "Add to record"; posted rows are already in the ledger.
    public function today()
    {
        $today = now()->toDateString();

        // "Charged today" is the day's genuine operational activity: charges logged by
        // staff today, and recharges pulled from the Connect/Fiber portals today. It
        // must NOT include historical rows backfilled from the old Excel files (those
        // carry their original state). Excel backfill is stamped recorded_by='Excel import'.
        $charges = Charge::with(['customer:id,name,login_id,house_no,sector,outstanding_balance', 'account:id,name'])
            ->whereDate('charge_date', $today)
            ->where(fn ($q) => $q->whereNull('recorded_by')->orWhere('recorded_by', '!=', 'Excel import'))
            ->orderByDesc('created_at')->orderByDesc('id')
            ->get();

        $d = \App\Support\Tenant::id();
        // Portal metadata per charge: the speed reported AND the real recharge
        // timestamp from the portal (Connect date/time, Fiber load date) — that's
        // the actual moment the card was charged, not when our sync wrote the row.
        $syncMeta = DB::table('sync_rows')->where('dealer_id', $d)->whereIn('charge_id', $charges->pluck('id'))
            ->get(['charge_id', 'speed_label', 'recharged_at'])->keyBy('charge_id');

        return $charges->map(function ($c) use ($syncMeta, $d) {
            $pkg = $c->package_id ? DB::table('packages')->where('dealer_id', $d)->where('id', $c->package_id)->first() : null;
            $meta = $syncMeta->get($c->id);
            $rechargedAt = $meta && $meta->recharged_at ? \Illuminate\Support\Carbon::parse($meta->recharged_at) : null;

            return [
                'id' => $c->id,
                'customerId' => $c->customer_id,
                'loginId' => $c->customer?->login_id,
                'name' => $c->customer?->name,
                'houseNo' => $c->customer?->house_no,
                'sector' => $c->customer?->sector,
                'account' => $c->account?->name,
                // Prefer the portal's real recharge date/time; fall back to our record.
                // Fiber reports date-only (no clock time) → show the date, no fake 00:00.
                'chargeDate' => ($rechargedAt ?? $c->charge_date)->toDateString(),
                'time' => $rechargedAt
                    ? ($rechargedAt->format('H:i:s') === '00:00:00' ? null : $rechargedAt->format('H:i'))
                    : $c->created_at->format('H:i'),
                'packageId' => $c->package_id,
                'package' => $pkg?->name,
                'speedMbps' => $pkg?->speed_mbps,
                'portalSpeed' => $meta->speed_label ?? null,
                'amount' => (int) $c->amount_charged,
                // For a pending row the "opening balance" to confirm is the customer's
                // live outstanding; once posted we show the snapshot that was applied.
                'previousBalance' => $c->pending ? (int) ($c->customer?->outstanding_balance ?? 0) : (int) $c->previous_balance,
                'source' => $c->source,
                'pending' => (bool) $c->pending,
            ];
        });
    }

    // "Add to record": commit a staged portal recharge. Staff confirm (and may
    // correct) the package, the month's amount, and the opening balance; we set
    // the customer's outstanding to opening + amount and post the charge.
    public function commit(Request $request, Charge $charge)
    {
        $data = $request->validate([
            'openingBalance' => ['required', 'numeric'],
            'amount' => ['required', 'numeric', 'min:0'],
            'packageId' => ['nullable', 'integer', 'exists:packages,id'],
        ]);

        if (! $charge->pending) {
            return response()->json(['message' => 'This recharge has already been added to the record.'], 422);
        }

        return DB::transaction(function () use ($data, $charge, $request) {
            $customer = Customer::with('subscription', 'package')->findOrFail($charge->customer_id);

            if (! is_null($data['packageId'])) {
                $charge->package_id = $data['packageId'];
                $customer->current_package_id = $data['packageId'];
            }
            $charge->amount_charged = $data['amount'];
            $charge->previous_balance = $data['openingBalance'];
            $charge->pending = false;
            $charge->save();

            // The confirmed opening balance is authoritative — it replaces any drifted
            // value, so the new outstanding is exactly opening + this month's charge.
            $customer->outstanding_balance = $data['openingBalance'] + $data['amount'];
            $customer->current_account_id = $charge->account_id; // recharge = switch pointer
            $customer->save();
            $this->syncArrears($customer);

            AuditLog::record($request, 'commit_charge', 'charge', $charge->id, [
                'openingBalance' => (int) $data['openingBalance'],
                'amount' => (int) $data['amount'],
                'packageId' => $data['packageId'] ?? null,
            ]);

            $pkg = $charge->package_id ? DB::table('packages')->where('dealer_id', \App\Support\Tenant::id())->where('id', $charge->package_id)->first() : null;

            return response()->json([
                'chargeId' => $charge->id,
                'pending' => false,
                'amount' => (int) $charge->amount_charged,
                'previousBalance' => (int) $charge->previous_balance,
                'newBalance' => (int) $customer->outstanding_balance,
                'packageId' => $charge->package_id,
                'package' => $pkg?->name,
                'speedMbps' => $pkg?->speed_mbps,
            ]);
        });
    }

    // Toggle a charge as paid/unpaid — creates or removes the linked payment.
    public function markPaid(Request $request, Charge $charge)
    {
        $data = $request->validate([
            'paid' => ['required', 'boolean'],
            'method' => ['nullable', 'in:cash,jazz,bank,other'],
        ]);

        return DB::transaction(function () use ($data, $charge, $request) {
            $customer = Customer::with('subscription')->findOrFail($charge->customer_id);
            $existing = Payment::where('charge_id', $charge->id)->get();

            if ($data['paid'] && $existing->isEmpty()) {
                Payment::create([
                    'customer_id' => $customer->id, 'charge_id' => $charge->id,
                    'amount_received' => $charge->amount_charged, 'received_date' => now()->toDateString(),
                    'method' => $data['method'] ?? 'cash', 'is_arrears' => false, 'recorded_by' => $request->user()->name,
                ]);
                $customer->outstanding_balance -= $charge->amount_charged;
            } elseif (! $data['paid'] && $existing->isNotEmpty()) {
                foreach ($existing as $p) {
                    $customer->outstanding_balance += $p->amount_received;
                    $p->delete();
                }
            }

            $customer->save();
            $this->syncArrears($customer);
            AuditLog::record($request, $data['paid'] ? 'mark_paid' : 'mark_unpaid', 'charge', $charge->id, ['method' => $data['method'] ?? null]);

            return response()->json([
                'chargeId' => $charge->id,
                'paid' => $data['paid'],
                'paidMethod' => $data['paid'] ? ($data['method'] ?? 'cash') : null,
            ]);
        });
    }

    // ── Monthly Register edit ───────────────────────────────────────────────
    // Correct a register row: the charge (date / amount / account / package) and
    // its payment (paid, amount, date, method). Balance is recomputed from the
    // full ledger afterwards so it can never drift.
    public function update(Request $request, Charge $charge)
    {
        $data = $request->validate([
            'chargeDate' => ['required', 'date'],
            'amount' => ['required', 'integer', 'min:0'],
            'accountId' => ['nullable', 'integer', Rule::exists('accounts', 'id')->where('dealer_id', Tenant::id())],
            'packageId' => ['nullable', 'integer', Rule::exists('packages', 'id')->where('dealer_id', Tenant::id())],
            'paid' => ['required', 'boolean'],
            'receivedAmount' => ['nullable', 'integer', 'min:0'],
            'receivedDate' => ['nullable', 'date'],
            'method' => ['nullable', 'in:cash,jazz,bank,other'],
            // Optional: reconcile the customer's outstanding to this exact figure
            // (matches a physical register). Any difference is absorbed into a
            // single hidden "Balance adjustment" entry.
            'balance' => ['nullable', 'integer'],
        ]);

        return DB::transaction(function () use ($data, $charge, $request) {
            $customer = Customer::findOrFail($charge->customer_id);

            $charge->update([
                'charge_date' => $data['chargeDate'],
                'amount_charged' => $data['amount'],
                'account_id' => $data['accountId'] ?? $charge->account_id,
                'package_id' => array_key_exists('packageId', $data) ? $data['packageId'] : $charge->package_id,
                'billing_period_label' => Carbon::parse($data['chargeDate'])->format('F Y'),
                'pending' => false, // an edited row is a confirmed record
            ]);

            $existing = Payment::where('charge_id', $charge->id)->get();
            if ($data['paid']) {
                $attrs = [
                    'amount_received' => $data['receivedAmount'] ?? $data['amount'],
                    'received_date' => $data['receivedDate'] ?? $data['chargeDate'],
                    'method' => $data['method'] ?? 'cash',
                ];
                if ($existing->isNotEmpty()) {
                    $existing->first()->update($attrs);
                    $existing->slice(1)->each->delete(); // collapse any duplicates
                } else {
                    Payment::create(array_merge($attrs, [
                        'customer_id' => $customer->id, 'charge_id' => $charge->id,
                        'is_arrears' => false, 'recorded_by' => $request->user()->name,
                    ]));
                }
            } else {
                $existing->each->delete();
            }

            // If a target balance was given, reconcile to it exactly; otherwise
            // let the balance fall out of the ledger naturally.
            if (array_key_exists('balance', $data) && $data['balance'] !== null) {
                $this->reconcileBalance($customer, (int) $data['balance']);
            } else {
                $this->recomputeBalance($customer);
            }
            AuditLog::record($request, 'edit_charge', 'charge', $charge->id, ['amount' => $data['amount'], 'paid' => $data['paid'], 'balance' => $data['balance'] ?? null]);

            return response()->json(['ok' => true]);
        });
    }

    // Delete a register row (charge + its payments). Soft-deleted, so recoverable.
    public function destroy(Request $request, Charge $charge)
    {
        return DB::transaction(function () use ($charge, $request) {
            $customer = Customer::findOrFail($charge->customer_id);
            Payment::where('charge_id', $charge->id)->get()->each->delete();
            $charge->delete();
            $this->recomputeBalance($customer);
            AuditLog::record($request, 'delete_charge', 'charge', $charge->id, ['amount' => $charge->amount_charged]);

            return response()->json(['deleted' => true]);
        });
    }

    private const RECONCILE = 'Balance adjustment';

    // Force the customer's outstanding to $target (a physically-verified figure).
    // The gap between the natural ledger and $target is parked in ONE hidden
    // adjustment entry (a charge if they owe more, a credit payment if less), so
    // the balance sticks and still reconciles against Σcharges − Σpayments.
    private function reconcileBalance(Customer $c, int $target): void
    {
        // Clear any prior adjustment (both directions) so it never stacks.
        Charge::where('customer_id', $c->id)->where('recorded_by', self::RECONCILE)->forceDelete();
        Payment::where('customer_id', $c->id)->where('recorded_by', self::RECONCILE)->forceDelete();

        $natural = (int) Charge::where('customer_id', $c->id)->sum('amount_charged')
                 - (int) Payment::where('customer_id', $c->id)->sum('amount_received');
        $diff = $target - $natural;
        $date = optional($c->created_at)->toDateString() ?? now()->toDateString();

        if ($diff > 0) {
            Charge::create([
                'customer_id' => $c->id,
                'account_id' => $c->current_account_id ?? Account::query()->value('id'),
                'amount_charged' => $diff, 'charge_date' => $date,
                'billing_period_label' => 'Balance adjustment', 'source' => 'opening',
                'recorded_by' => self::RECONCILE, 'pending' => false,
            ]);
        } elseif ($diff < 0) {
            Payment::create([
                'customer_id' => $c->id, 'charge_id' => null, 'amount_received' => -$diff,
                'received_date' => $date, 'method' => 'other', 'is_arrears' => false,
                'recorded_by' => self::RECONCILE,
            ]);
        }

        $c->outstanding_balance = $target;
        $fee = optional($c->loadMissing('package')->package)->price ?? $c->loadMissing('subscription')->subscription?->frozen_amount ?? 0;
        $c->months_overdue = ($fee > 0 && $target > 0) ? (int) round($target / $fee) : 0;
        $c->save();
    }

    // Outstanding = Σ charges − Σ payments across the customer's whole ledger
    // (the seeded opening-balance entry is a charge, so this ties out exactly).
    private function recomputeBalance(Customer $c): void
    {
        $charges = (int) Charge::where('customer_id', $c->id)->sum('amount_charged');
        $pays = (int) Payment::where('customer_id', $c->id)->sum('amount_received');
        $c->outstanding_balance = $charges - $pays;
        $fee = optional($c->loadMissing('package')->package)->price ?? $c->loadMissing('subscription')->subscription?->frozen_amount ?? 0;
        $c->months_overdue = ($fee > 0 && $c->outstanding_balance > 0) ? (int) round($c->outstanding_balance / $fee) : 0;
        $c->save();
    }

    private function syncArrears(Customer $c): void
    {
        $c->loadMissing('subscription', 'package');
        $fee = optional($c->package)->price ?? $c->subscription?->frozen_amount ?? 0;
        $c->months_overdue = ($fee > 0 && $c->outstanding_balance > 0) ? (int) round($c->outstanding_balance / $fee) : 0;
        $c->save();
    }
}
