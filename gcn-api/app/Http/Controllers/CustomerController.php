<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Charge;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    // Recompute derived arrears from the current outstanding + monthly fee.
    private function syncArrears(Customer $c): void
    {
        $c->load('subscription');
        $fee = $c->subscription?->frozen_amount ?? optional($c->package)->price ?? 0;
        $c->months_overdue = ($fee > 0 && $c->outstanding_balance > 0) ? (int) round($c->outstanding_balance / $fee) : 0;
        $c->save();
    }

    // ── The daily loop: log a monthly charge + optional payment ──────────
    public function logChargePayment(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'accountId' => ['nullable', 'exists:accounts,id'],
            'packageId' => ['nullable', 'exists:packages,id'],
            'chargeAmount' => ['nullable', 'integer', 'min:1'],
            'chargeDate' => ['nullable', 'date', 'required_with:chargeAmount'],
            'billingPeriodLabel' => ['nullable', 'string', 'required_with:chargeAmount'],
            'logPayment' => ['boolean'],
            'receivedAmount' => ['nullable', 'integer', 'min:1'],
            'receivedDate' => ['nullable', 'date'],
            'method' => ['nullable', 'in:cash,jazz,bank,other'],
        ]);

        $hasCharge = ! empty($data['chargeAmount']);
        $hasPayment = ! empty($data['logPayment']) && ! empty($data['receivedAmount']);
        if (! $hasCharge && ! $hasPayment) {
            return response()->json(['message' => 'Nothing to log — enter a charge, a payment, or both.'], 422);
        }
        if ($hasCharge && empty($data['accountId'])) {
            return response()->json(['message' => 'An account is required to log a charge.'], 422);
        }

        $recordedBy = $request->user()->name;

        return DB::transaction(function () use ($data, $customer, $hasCharge, $hasPayment, $recordedBy, $request) {
            $charge = null;
            if ($hasCharge) {
                $account = Account::with('provider')->findOrFail($data['accountId']);
                $isConnect = $account->provider?->type === 'reseller';
                $charge = Charge::create([
                    'customer_id' => $customer->id,
                    'account_id' => $account->id,
                    'package_id' => $data['packageId'] ?? null,
                    'amount_charged' => $data['chargeAmount'],
                    'cost_amount' => $isConnect ? (int) (round(($data['chargeAmount'] * 0.48) / 10) * 10) : null,
                    'previous_balance' => $customer->outstanding_balance,
                    'charge_date' => $data['chargeDate'],
                    'billing_period_label' => $data['billingPeriodLabel'],
                    'source' => 'manual',
                    'recorded_by' => $recordedBy,
                ]);
                $customer->outstanding_balance += $data['chargeAmount'];
                // A charge under a new account is the account switch.
                $customer->current_account_id = $account->id;
                if (! empty($data['packageId'])) {
                    $customer->current_package_id = $data['packageId'];
                    Subscription::where('customer_id', $customer->id)->update(['package_id' => $data['packageId']]);
                }
            }

            $payment = null;
            if ($hasPayment) {
                $receivedDate = $data['receivedDate'] ?? now()->toDateString();
                $payment = Payment::create([
                    'customer_id' => $customer->id,
                    'charge_id' => $charge?->id,
                    'amount_received' => $data['receivedAmount'],
                    'received_date' => $receivedDate,
                    'method' => $data['method'] ?? 'cash',
                    // payment-only settles prior dues → arrears; with a charge, compare months.
                    'is_arrears' => $hasCharge ? substr($receivedDate, 0, 7) > substr($data['chargeDate'], 0, 7) : true,
                    'recorded_by' => $recordedBy,
                ]);
                $customer->outstanding_balance -= $data['receivedAmount'];
            }

            $customer->save();
            $this->syncArrears($customer);

            AuditLog::record($request, 'log_charge_payment', 'customer', $customer->id, [
                'charge' => $charge?->id,
                'payment' => $payment?->id,
                'amount' => $data['chargeAmount'] ?? 0,
                'received' => $data['receivedAmount'] ?? 0,
            ]);

            return response()->json(['customer' => $this->payload($customer->fresh('subscription'))]);
        });
    }

    // ── Create / update customer ─────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $this->validateCustomer($request, null);

        return DB::transaction(function () use ($data, $request) {
            $customer = Customer::create($this->customerAttributes($data));
            Subscription::create([
                'customer_id' => $customer->id,
                'package_id' => $data['currentPackageId'] ?? null,
                'frozen_amount' => $data['frozenAmount'] ?? null,
                'typical_charge_day' => $data['typicalChargeDay'] ?? null,
                'is_active' => $data['status'] === 'active',
            ]);
            AuditLog::record($request, 'create', 'customer', $customer->id, $data);

            return response()->json($this->payload($customer->fresh('subscription')), 201);
        });
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $this->validateCustomer($request, $customer->id);
        $customer->update($this->customerAttributes($data));
        Subscription::updateOrCreate(
            ['customer_id' => $customer->id],
            [
                'package_id' => $data['currentPackageId'] ?? null,
                'frozen_amount' => $data['frozenAmount'] ?? null,
                'typical_charge_day' => $data['typicalChargeDay'] ?? null,
                'is_active' => $data['status'] === 'active',
            ]
        );
        $this->syncArrears($customer);
        AuditLog::record($request, 'update', 'customer', $customer->id, $data);

        return $this->payload($customer->fresh('subscription'));
    }

    public function switchAccount(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'accountId' => ['required', 'exists:accounts,id'],
            'packageId' => ['nullable', 'exists:packages,id'],
        ]);
        $customer->current_account_id = $data['accountId'];
        if (! empty($data['packageId'])) {
            $customer->current_package_id = $data['packageId'];
        }
        $customer->save();
        AuditLog::record($request, 'switch_account', 'customer', $customer->id, $data);

        return $this->payload($customer->fresh('subscription'));
    }

    private function validateCustomer(Request $request, ?int $id): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'loginId' => ['required', 'string', 'max:255', Rule::unique('customers', 'login_id')->ignore($id)],
            'type' => ['required', 'in:residential,commercial'],
            'companyName' => ['nullable', 'string'],
            'houseNo' => ['nullable', 'string'],
            'sector' => ['nullable', 'string'],
            'billingAddress' => ['nullable', 'string'],
            'currentAccountId' => ['required', 'exists:accounts,id'],
            'currentPackageId' => ['nullable', 'exists:packages,id'],
            'status' => ['required', 'in:active,inactive,suspended,pending'],
            'phone' => ['nullable', 'string'],
            'collectionModel' => ['required', 'in:prepaid,credit'],
            'frozenAmount' => ['nullable', 'integer'],
            'typicalChargeDay' => ['nullable', 'integer', 'min:1', 'max:28'],
        ]);
    }

    private function customerAttributes(array $data): array
    {
        return [
            'name' => $data['name'],
            'login_id' => $data['loginId'],
            'type' => $data['type'],
            'company_name' => $data['companyName'] ?? null,
            'house_no' => $data['houseNo'] ?? null,
            'sector' => $data['sector'] ?? null,
            'billing_address' => $data['billingAddress'] ?? null,
            'current_account_id' => $data['currentAccountId'],
            'current_package_id' => $data['currentPackageId'] ?? null,
            'status' => $data['status'],
            'phone' => $data['phone'] ?? null,
            'collection_model' => $data['collectionModel'],
        ];
    }

    public function index()
    {
        return Customer::with('subscription')->orderBy('id')->get()->map(fn ($c) => $this->payload($c));
    }

    public function show(Customer $customer)
    {
        return $this->payload($customer->load('subscription'));
    }

    public function recovery()
    {
        return Customer::with('subscription')
            ->where('outstanding_balance', '>', 0)
            ->orderByDesc('months_overdue')
            ->orderByDesc('outstanding_balance')
            ->get()->map(fn ($c) => $this->payload($c));
    }

    public function ledger(Customer $customer)
    {
        $charges = Charge::where('customer_id', $customer->id)->get()->map(fn ($c) => [
            'id' => 'c'.$c->id, 'date' => $c->charge_date->toDateString(), 'kind' => 'charge',
            'label' => $c->billing_period_label, 'accountId' => $c->account_id, 'packageId' => $c->package_id,
            'debit' => $c->amount_charged, 'credit' => 0, 'source' => $c->source, 'costAmount' => $c->cost_amount,
        ]);
        $payments = Payment::where('customer_id', $customer->id)->get()->map(fn ($p) => [
            'id' => 'p'.$p->id, 'date' => $p->received_date->toDateString(), 'kind' => 'payment',
            'label' => $p->is_arrears ? 'Payment (arrears)' : 'Payment', 'method' => $p->method,
            'debit' => 0, 'credit' => $p->amount_received, 'isArrears' => (bool) $p->is_arrears,
        ]);

        $rows = $charges->concat($payments)->sortBy('date')->values();
        $running = 0;

        return $rows->map(function ($r) use (&$running) {
            $running += $r['debit'] - $r['credit'];

            return array_merge($r, ['balance' => $running]);
        });
    }

    private function payload(Customer $c): array
    {
        $s = $c->subscription;

        return [
            'id' => $c->id, 'name' => $c->name, 'loginId' => $c->login_id, 'type' => $c->type,
            'companyName' => $c->company_name, 'houseNo' => $c->house_no, 'sector' => $c->sector,
            'billingAddress' => $c->billing_address, 'currentAccountId' => $c->current_account_id,
            'currentPackageId' => $c->current_package_id, 'status' => $c->status, 'phone' => $c->phone,
            'createdAt' => optional($c->created_at)->toDateString(),
            'subscription' => [
                'packageId' => $s?->package_id, 'frozenAmount' => $s?->frozen_amount,
                'typicalChargeDay' => $s?->typical_charge_day, 'isActive' => (bool) ($s?->is_active ?? false),
            ],
            'outstandingBalance' => $c->outstanding_balance,
            'monthsOverdue' => $c->months_overdue,
            'collectionModel' => $c->collection_model,
        ];
    }
}
