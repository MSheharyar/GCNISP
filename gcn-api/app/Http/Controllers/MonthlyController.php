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
        $months = DB::table('charges')->where('dealer_id', $d)->where('source', '!=', 'opening')
            ->select(DB::raw("to_char(charge_date,'YYYY-MM') as ym"))
            ->distinct()->orderByDesc('ym')->pluck('ym');

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
                'package' => $pkg?->name,
                'speedMbps' => $pkg?->speed_mbps,
                'chargeDate' => $c->charge_date->toDateString(),
                'amount' => (int) $c->amount_charged,
                'paid' => (bool) $pay,
                'paidDate' => optional($pay?->received_date)->toDateString(),
                'method' => $pay?->method,
                'balance' => (int) (($chargeSums[$c->customer_id] ?? 0) - ($paySums[$c->customer_id] ?? 0)),
            ];
        });

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
