<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\MonthlyTopup;
use App\Services\PortalSyncService;

/**
 * Monthly wallet top-up received from the upstream companies (Connect + Fiber),
 * per portal account, for the last N months. Cached in monthly_topups; `refresh`
 * re-scrapes the portals.
 */
class TopupController extends Controller
{
    private const MONTHS = 6;

    public function index()
    {
        $window = $this->window();
        $accounts = Account::orderBy('id')->get()->keyBy('id');
        $rows = MonthlyTopup::whereIn('ym', $window)->get();

        // account_id => [ym => amount]
        $byAccount = [];
        foreach ($rows as $r) {
            $byAccount[$r->account_id][$r->ym] = (int) $r->amount;
        }

        // Only accounts that have any captured top-up data.
        $accountsOut = [];
        foreach ($byAccount as $accId => $months) {
            $acc = $accounts->get($accId);
            $accountsOut[] = [
                'accountId' => $accId,
                'account' => $acc?->name ?? ('Account '.$accId),
                'byMonth' => array_map(fn ($ym) => $months[$ym] ?? 0, array_combine($window, $window)),
                'total' => array_sum($months),
            ];
        }

        $captured = MonthlyTopup::max('captured_at');

        return [
            'months' => $window,
            'accounts' => $accountsOut,
            'totalsByMonth' => array_map(
                fn ($ym) => array_sum(array_map(fn ($a) => $a['byMonth'][$ym] ?? 0, $accountsOut)),
                array_combine($window, $window)
            ),
            'capturedAt' => $captured ? \Illuminate\Support\Carbon::parse($captured)->toDateTimeString() : null,
        ];
    }

    public function refresh(PortalSyncService $sync)
    {
        $sync->syncTopups(self::MONTHS);

        return $this->index();
    }

    /** @return array<string> last N months as YYYY-MM, oldest first */
    private function window(): array
    {
        $out = [];
        $cur = now()->startOfMonth()->subMonths(self::MONTHS - 1);
        for ($i = 0; $i < self::MONTHS; $i++) {
            $out[] = $cur->format('Y-m');
            $cur->addMonth();
        }

        return $out;
    }
}
