<?php

namespace App\Http\Controllers;

use App\Models\Charge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MonthlyController extends Controller
{
    // A per-month register (like the old monthly Excel sheet): every user billed
    // that month with package/speed, charge date, amount, payment and running
    // balance. `?month=YYYY-MM` selects the month (defaults to the latest).
    public function index(Request $request)
    {
        $d = \App\Support\Tenant::id();
        // Months that actually have real (non-opening) charges, newest first.
        $chargeMonths = DB::table('charges')->where('dealer_id', $d)->where('source', '!=', 'opening')
            ->selectRaw("to_char(charge_date,'YYYY-MM') as ym")->distinct()->pluck('ym');
        $payMonths = DB::table('payments')->where('dealer_id', $d)
            ->selectRaw("to_char(received_date,'YYYY-MM') as ym")->distinct()->pluck('ym');
        $months = $chargeMonths->merge($payMonths)->unique()->sortDesc()->values();

        $ym = $request->query('month');
        if (! $ym || ! $months->contains($ym)) {
            $ym = $months->first() ?? now()->format('Y-m');
        }
        $monthEnd = date('Y-m-t', strtotime($ym.'-01'));

        // Running balance per customer = Σ charges − Σ payments through month-end
        // (includes the synthetic opening-balance entries so it ties to the ledger).
        $chargeSums = DB::table('charges')->where('dealer_id', $d)->where('charge_date', '<=', $monthEnd)
            ->select('customer_id', DB::raw('sum(amount_charged) s'))->groupBy('customer_id')->pluck('s', 'customer_id');
        $paySums = DB::table('payments')->where('dealer_id', $d)->where('received_date', '<=', $monthEnd)
            ->select('customer_id', DB::raw('sum(amount_received) s'))->groupBy('customer_id')->pluck('s', 'customer_id');

        $packages = DB::table('packages')->where('dealer_id', $d)->get()->keyBy('id');

        $charges = Charge::with(['customer:id,name,login_id,house_no,sector', 'account:id,name', 'payments'])
            ->where('source', '!=', 'opening')
            ->whereRaw("to_char(charge_date,'YYYY-MM') = ?", [$ym])
            ->orderBy('charge_date')->orderBy('customer_id')->get();

        $rows = $charges->map(function ($c) use ($chargeSums, $paySums, $packages) {
            $pkg = $c->package_id ? $packages->get($c->package_id) : null;
            $pay = $c->payments->first();

            return [
                'chargeId' => $c->id,
                'customerId' => $c->customer_id,
                'loginId' => $c->customer?->login_id,
                'name' => $c->customer?->name,
                'houseNo' => $c->customer?->house_no,
                'sector' => $c->customer?->sector,
                'account' => $c->account?->name,
                'accountId' => $c->account_id,
                'package' => $pkg?->name,
                'packageId' => $c->package_id,
                'speedMbps' => $pkg?->speed_mbps,
                'chargeDate' => $c->charge_date->toDateString(),
                'amount' => (int) $c->amount_charged,
                'paid' => (bool) $pay,
                'paidDate' => optional($pay?->received_date)->toDateString(),
                'method' => $pay?->method,
                'balance' => (int) (($chargeSums[$c->customer_id] ?? 0) - ($paySums[$c->customer_id] ?? 0)),
                'arrears' => false,
            ];
        });

        // Money COLLECTED this month against a bill from another month (or a
        // charge-less payment) — so the register reflects cash received now, not
        // only this month's billing. Shown as clearly-flagged arrears rows.
        $arrears = DB::table('payments as p')
            ->leftJoin('charges as c', 'p.charge_id', '=', 'c.id')
            ->join('customers as cu', 'p.customer_id', '=', 'cu.id')
            ->leftJoin('accounts as a', 'c.account_id', '=', 'a.id')
            ->where('p.dealer_id', $d)
            ->whereRaw("to_char(p.received_date,'YYYY-MM') = ?", [$ym])
            ->where(fn ($q) => $q->whereNull('p.charge_id')->orWhereRaw("to_char(c.charge_date,'YYYY-MM') <> ?", [$ym]))
            ->orderBy('p.received_date')
            ->get(['p.id as pid', 'p.amount_received', 'p.received_date', 'p.method',
                'c.id as charge_id', 'c.charge_date', 'c.package_id', 'c.account_id', 'a.name as account',
                'cu.id as customer_id', 'cu.name', 'cu.login_id', 'cu.house_no', 'cu.sector']);

        $arrearsRows = $arrears->map(function ($r) use ($chargeSums, $paySums, $packages) {
            $pkg = $r->package_id ? $packages->get($r->package_id) : null;

            return [
                'chargeId' => -$r->pid, // negative → unique key, not an editable charge
                'customerId' => $r->customer_id,
                'loginId' => $r->login_id,
                'name' => $r->name,
                'houseNo' => $r->house_no,
                'sector' => $r->sector,
                'account' => $r->account,
                'accountId' => $r->account_id,
                'package' => $pkg->name ?? null,
                'packageId' => $r->package_id,
                'speedMbps' => $pkg->speed_mbps ?? null,
                'chargeDate' => substr($r->received_date, 0, 10),
                'amount' => (int) $r->amount_received,
                'paid' => true,
                'paidDate' => substr($r->received_date, 0, 10),
                'method' => $r->method,
                'balance' => (int) (($chargeSums[$r->customer_id] ?? 0) - ($paySums[$r->customer_id] ?? 0)),
                'arrears' => true,
                'arrearsFor' => $r->charge_date ? \Illuminate\Support\Carbon::parse($r->charge_date)->format('M Y') : null,
            ];
        });

        $rows = $rows->concat($arrearsRows);

        return [
            'months' => $months->values(),
            'month' => $ym,
            'rows' => $rows,
            'summary' => [
                'count' => $charges->count(),
                'charged' => (int) $charges->sum('amount_charged'),
                'collected' => (int) DB::table('payments')->where('dealer_id', $d)->whereRaw("to_char(received_date,'YYYY-MM') = ?", [$ym])->sum('amount_received'),
                'paidCount' => $charges->filter(fn ($c) => $c->payments->isNotEmpty())->count(),
            ],
        ];
    }
}
