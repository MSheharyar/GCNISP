<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CableCustomer;
use App\Models\CablePayment;
use Illuminate\Http\Request;

class CableController extends Controller
{
    public function index()
    {
        return CableCustomer::orderBy('id')->get()->map(fn ($c) => $this->payload($c));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string'],
            'houseNo' => ['required', 'string'],
            'sector' => ['required', 'string'],
            'monthlyFee' => ['required', 'integer', 'min:0'],
            'balance' => ['nullable', 'integer'],
        ]);
        $c = CableCustomer::create([
            'name' => $data['name'] ?? null, 'house_no' => $data['houseNo'], 'sector' => $data['sector'],
            'monthly_fee' => $data['monthlyFee'], 'balance' => $data['balance'] ?? 0, 'status' => 'active',
        ]);
        AuditLog::record($request, 'create', 'cable_customer', $c->id, $data);

        return response()->json($this->payload($c), 201);
    }

    public function storePayment(Request $request, CableCustomer $cable)
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'date' => ['required', 'date'],
            'label' => ['nullable', 'string'],
        ]);
        $pay = CablePayment::create([
            'cable_customer_id' => $cable->id, 'amount' => $data['amount'], 'date' => $data['date'],
            'label' => $data['label'] ?? 'Cable collection',
        ]);
        $cable->balance = max(0, $cable->balance - $data['amount']);
        $cable->last_paid_date = $data['date'];
        $cable->save();
        AuditLog::record($request, 'cable_payment', 'cable_customer', $cable->id, ['payment' => $pay->id, 'amount' => $data['amount']]);

        return $this->payload($cable->fresh());
    }

    public function show(CableCustomer $cable)
    {
        return $this->payload($cable);
    }

    public function ledger(CableCustomer $cable)
    {
        $pays = CablePayment::where('cable_customer_id', $cable->id)->get();
        $rows = collect();
        foreach ($pays as $p) {
            $date = $p->date->toDateString();
            $rows->push(['id' => 'c'.$p->id, 'date' => $date, 'kind' => 'charge', 'label' => str_replace('collection', 'cable charge', (string) $p->label), 'debit' => $cable->monthly_fee ?: $p->amount, 'credit' => 0]);
            $rows->push(['id' => 'p'.$p->id, 'date' => $date, 'kind' => 'payment', 'label' => $p->label, 'debit' => 0, 'credit' => $p->amount]);
        }
        $rows = $rows->sortBy('date')->values();
        $running = 0;

        return $rows->map(function ($r) use (&$running) {
            $running += $r['debit'] - $r['credit'];

            return array_merge($r, ['balance' => $running]);
        });
    }

    private function payload(CableCustomer $c): array
    {
        return [
            'id' => $c->id, 'name' => $c->name, 'houseNo' => $c->house_no, 'sector' => $c->sector,
            'monthlyFee' => $c->monthly_fee, 'balance' => $c->balance, 'status' => $c->status,
            'lastPaidDate' => optional($c->last_paid_date)->toDateString(),
        ];
    }
}
