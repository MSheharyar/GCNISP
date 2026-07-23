<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Charge;
use App\Models\Customer;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        // Portal metadata per charge: the speed reported AND the real recharge
        // timestamp from the portal (Connect date/time, Fiber load date) — that's
        // the actual moment the card was charged, not when our sync wrote the row.
        $syncMeta = DB::table('sync_rows')->whereIn('charge_id', $charges->pluck('id'))
            ->get(['charge_id', 'speed_label', 'recharged_at'])->keyBy('charge_id');

        return $charges->map(function ($c) use ($syncMeta) {
            $pkg = $c->package_id ? DB::table('packages')->where('id', $c->package_id)->first() : null;
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

            $pkg = $charge->package_id ? DB::table('packages')->where('id', $charge->package_id)->first() : null;

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

    private function syncArrears(Customer $c): void
    {
        $c->loadMissing('subscription', 'package');
        $fee = optional($c->package)->price ?? $c->subscription?->frozen_amount ?? 0;
        $c->months_overdue = ($fee > 0 && $c->outstanding_balance > 0) ? (int) round($c->outstanding_balance / $fee) : 0;
        $c->save();
    }
}
