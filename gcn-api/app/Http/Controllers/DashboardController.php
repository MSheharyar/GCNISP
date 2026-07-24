<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Customer;
use App\Support\Tenant;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $d = Tenant::id(); // current dealer — every raw query is scoped to it

        $latestMonth = DB::table('payments')->where('dealer_id', $d)->max(DB::raw("to_char(received_date,'YYYY-MM')")) ?? '2020-01';
        $latestDay = DB::table('payments')->where('dealer_id', $d)->max('received_date');

        $collectedThisMonth = (int) DB::table('payments')->where('dealer_id', $d)->whereRaw("to_char(received_date,'YYYY-MM') = ?", [$latestMonth])->sum('amount_received');
        $collectedToday = (int) DB::table('payments')->where('dealer_id', $d)->where('received_date', $latestDay)->sum('amount_received');
        $totalOutstanding = (int) DB::table('customers')->where('dealer_id', $d)->sum('outstanding_balance');

        $byStatus = DB::table('customers')->where('dealer_id', $d)->select('status', DB::raw('count(*) as n'))->groupBy('status')->pluck('n', 'status');

        // Active subscribers come from the LIVE portal snapshot (Connect + Fiber),
        // summed across accounts — that's the real current roster. Fall back to the
        // Excel-derived status only if the portals haven't been scraped yet.
        $portalActive = (int) DB::table('portal_stats')->where('dealer_id', $d)->sum('active');
        $portalTotal = (int) DB::table('portal_stats')->where('dealer_id', $d)->sum('total');
        $activeSubscribers = $portalActive ?: (int) ($byStatus['active'] ?? 0);
        $subscriberBase = $portalTotal ?: (int) DB::table('customers')->where('dealer_id', $d)->count();

        // Current-month collections per live account. Legacy/retired portals (e.g.
        // Transworld) are excluded — flagged by "(legacy)" on the provider name.
        $legacyProviderIds = DB::table('providers')->where('dealer_id', $d)->where('name', 'ilike', '%legacy%')->pluck('id');
        $perAccount = Account::whereNotIn('provider_id', $legacyProviderIds)->orderBy('id')->get()->map(function ($a) use ($latestMonth, $d) {
            $collected = (int) DB::table('payments as p')
                ->join('charges as c', 'p.charge_id', '=', 'c.id')
                ->where('p.dealer_id', $d)
                ->where('c.account_id', $a->id)
                ->whereRaw("to_char(p.received_date,'YYYY-MM') = ?", [$latestMonth])
                ->sum('p.amount_received');
            // Current roster = active subscribers (billed within the last ~2 months),
            // not every customer ever seen on this account since 2021.
            $custCount = DB::table('customers')->where('dealer_id', $d)->where('current_account_id', $a->id)->where('status', 'active')->count();

            return ['account' => ['id' => $a->id, 'providerId' => $a->provider_id, 'name' => $a->name], 'collected' => $collected, 'customers' => $custCount];
        })->values();

        $unsetPackage = DB::table('charges')->where('dealer_id', $d)->whereNull('package_id')->count();

        // Customers overdue 2+ months straight — the arrears warning list.
        $overdueCount = DB::table('customers')->where('dealer_id', $d)->where('months_overdue', '>=', 2)->count();

        // Recovery: surface the most recently-charged debtors first (last month's
        // dues), then work back through older arrears — recent money is the most
        // collectable. Ties break on the larger balance.
        $recovery = Customer::with('subscription')->where('outstanding_balance', '>', 0)
            ->orderByDesc(DB::raw('(select max(charge_date) from charges where charges.customer_id = customers.id)'))
            ->orderByDesc('outstanding_balance')->limit(12)->get()
            ->map(fn ($c) => (new CustomerController)->show($c));

        $methods = ['cash', 'jazz', 'bank', 'other'];
        $methodBreakdown = collect($methods)->map(fn ($m) => [
            'method' => $m,
            'amount' => (int) DB::table('payments')->where('dealer_id', $d)->where('method', $m)->whereRaw("to_char(received_date,'YYYY-MM') = ?", [$latestMonth])->sum('amount_received'),
        ]);

        $trend = DB::table('payments')->where('dealer_id', $d)
            ->select(DB::raw("to_char(received_date,'YYYY-MM') as month"), DB::raw('sum(amount_received) as amount'))
            ->groupBy('month')->orderBy('month')->get()
            ->map(fn ($r) => ['month' => $r->month, 'amount' => (int) $r->amount])
            ->reverse()->take(6)->reverse()->values();

        // Viewers (restricted staff) never see the money totals — only the
        // operational figures (active/overdue counts, recovery, portal snapshot).
        if (request()->user()?->role === 'viewer') {
            $collectedThisMonth = $collectedToday = $totalOutstanding = 0;
            $perAccount = collect();
            $methodBreakdown = collect();
            $trend = collect();
        }

        return [
            'latestMonth' => $latestMonth,
            'collectedThisMonth' => $collectedThisMonth,
            'collectedToday' => $collectedToday,
            'totalOutstanding' => $totalOutstanding,
            'byStatus' => $byStatus,
            'perAccount' => $perAccount,
            'unsetPackage' => $unsetPackage,
            'overdueCount' => $overdueCount,
            'recovery' => $recovery,
            'methodBreakdown' => $methodBreakdown,
            'trend' => $trend,
            'totalCustomers' => DB::table('customers')->where('dealer_id', $d)->count(),
            'activeSubscribers' => $activeSubscribers,
            'subscriberBase' => $subscriberBase,
            'portalActive' => $portalActive,
        ];
    }
}
