<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Charge;
use App\Models\Customer;
use App\Models\MonthlyTopup;
use App\Models\PortalStat;
use App\Models\SyncRow;
use App\Models\SyncRun;
use App\Services\Scrapers\ConnectConnector;
use App\Services\Scrapers\FiberBeamConnector;
use App\Support\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

class PortalSyncService
{
    public function __construct(
        private ConnectConnector $connect,
        private FiberBeamConnector $fiber,
    ) {}

    /**
     * Sync one account using its resolved credentials (stored per-dealer, or the
     * shared .env fallback for GCN). Returns null when the account has no usable
     * credentials for either portal.
     */
    public function runAccount(Account $account, ?string $date = null, string $onlySource = 'all'): ?SyncRun
    {
        $cred = $this->credentialsFor($account);
        if (! $cred || ($onlySource !== 'all' && $onlySource !== $cred['source'])) {
            return null;
        }

        // Catch-up window: from the last sync up to today, so a click never misses
        // recharges that happened since you last synced. An explicit --date (CLI)
        // pins the run to that single day instead.
        $to = now()->toDateString();
        [$from, $to] = $date ? [$date, $date] : [$this->lastSyncedDate($account) ?? $to, $to];

        return match ($cred['source']) {
            'connect' => $this->runConnect($account, $cred['user'], $cred['pass'], $from, $to),
            'fiberbeam' => $this->runFiberBeam($account, $from, $to, $cred['dealer'], $cred['user'], $cred['pass']),
            default => null,
        };
    }

    /** The latest day we successfully synced this account (the catch-up watermark). */
    private function lastSyncedDate(Account $account): ?string
    {
        $d = SyncRun::where('account_id', $account->id)->whereIn('status', ['success', 'partial'])->max('for_date');

        return $d ? Carbon::parse($d)->toDateString() : null;
    }

    /** Sync one Connect reseller account (GCNDIGITAL / MRGNET) over a date range. */
    public function runConnect(Account $account, string $user, string $pass, string $from, string $to): SyncRun
    {
        // Connect's report returns the recent ~100 recharges (no server-side date
        // filter); we window them client-side in process().
        return $this->guarded('connect', $account, $from, $to, function () use ($user, $pass) {
            return collect($this->connect->fetchRecharges($user, $pass))->map(fn ($r) => [
                'portalUser' => $r['userName'],
                'speedLabel' => $r['packageLabel'],
                'cost' => $r['amount'],
                'rechargedAt' => Carbon::parse($r['dateTime']),
            ]);
        });
    }

    /** Sync a Fiber Beam panel over a date range (its own creds, or GCN's .env). */
    public function runFiberBeam(Account $account, string $from, string $to, ?string $dealer = null, ?string $user = null, ?string $pass = null): SyncRun
    {
        return $this->guarded('fiberbeam', $account, $from, $to, function () use ($from, $to, $dealer, $user, $pass) {
            return collect($this->fiber->fetchRecharges($from, $to, $dealer, $user, $pass))->map(fn ($r) => [
                'portalUser' => $r['userId'],
                'speedLabel' => $r['packageLabel'],
                'cost' => $r['price'],
                'rechargedAt' => Carbon::parse($r['loadDate']),
            ]);
        });
    }

    /**
     * Resolve an account's portal credentials. Prefers the dealer's own stored
     * (encrypted) credentials; falls back to the shared .env config by account
     * name so GCN keeps working until it migrates. Returns null if neither exists.
     *
     * @return array{source:string,user:string,pass:?string,dealer:?string}|null
     */
    private function credentialsFor(Account $account): ?array
    {
        if ($account->hasPortalCredentials()) {
            return [
                'source' => $account->portal_source,
                'user' => $account->portal_username,
                'pass' => $account->portal_password,
                'dealer' => $account->portal_dealer,
            ];
        }

        // Legacy .env fallback — only for the original tenant's known accounts.
        $connect = config('scrapers.connect.accounts');
        if (! empty($connect[$account->name]['user'])) {
            return ['source' => 'connect', 'user' => $connect[$account->name]['user'], 'pass' => $connect[$account->name]['pass'], 'dealer' => null];
        }
        if ($account->name === config('scrapers.fiberbeam.account') && ! empty(config('scrapers.fiberbeam.user'))) {
            $fb = config('scrapers.fiberbeam');

            return ['source' => 'fiberbeam', 'user' => $fb['user'], 'pass' => $fb['pass'], 'dealer' => $fb['dealer']];
        }

        return null;
    }

    /**
     * Scrape each account's dashboard KPIs into portal_stats. In a request this
     * runs only the current dealer's accounts (Account is tenant-scoped); from the
     * scheduler (no tenant) it runs every dealer's accounts.
     */
    public function syncDashboards(): void
    {
        foreach (Account::all() as $account) {
            $cred = $this->credentialsFor($account);
            if (! $cred) {
                continue;
            }
            Tenant::run($account->dealer_id, function () use ($account, $cred) {
                $this->captureDashboard($account, $cred['source'], fn () => $cred['source'] === 'connect'
                    ? $this->connect->fetchDashboard($cred['user'], $cred['pass'])
                    : $this->fiber->fetchDashboard($cred['user'], $cred['pass']));
            });
        }
    }

    /**
     * Cache each account's wallet top-up (company credit) for the last N months
     * into monthly_topups. In a request this covers the current dealer's accounts;
     * from the scheduler (no tenant) it covers everyone's.
     */
    public function syncTopups(int $months = 6): void
    {
        $window = [];
        $cur = now()->startOfMonth()->subMonths($months - 1);
        for ($i = 0; $i < $months; $i++) {
            $window[] = $cur->format('Y-m');
            $cur->addMonth();
        }
        $from = $window[0].'-01';
        $to = now()->endOfMonth()->toDateString();

        foreach (Account::all() as $account) {
            $cred = $this->credentialsFor($account);
            if (! $cred) {
                continue;
            }
            Tenant::run($account->dealer_id, function () use ($account, $cred, $from, $to, $window) {
                try {
                    $byMonth = $cred['source'] === 'connect'
                        ? $this->connect->fetchTopupByMonth($cred['user'], $cred['pass'], $from, $to)
                        : $this->fiber->fetchTopupByMonth($from, $to, $cred['dealer'], $cred['user'], $cred['pass']);
                } catch (Throwable $e) {
                    return; // skip this account; others still run
                }
                foreach ($window as $ym) {
                    MonthlyTopup::updateOrCreate(
                        ['account_id' => $account->id, 'ym' => $ym],
                        ['amount' => $byMonth[$ym] ?? 0, 'captured_at' => now()]
                    );
                }
            });
        }
    }

    private function captureDashboard(Account $account, string $source, callable $fetch): void
    {
        try {
            // On success write the fresh numbers; on failure keep the last known
            // snapshot and just record the error.
            $stats = array_merge($fetch(), ['error' => null]);
        } catch (Throwable $e) {
            $stats = ['error' => $e->getMessage()];
        }

        PortalStat::updateOrCreate(
            ['account_id' => $account->id],
            array_merge($stats, ['source' => $source, 'captured_at' => now()])
        );
    }

    private function guarded(string $source, Account $account, string $from, string $to, callable $fetch): SyncRun
    {
        // Pin the tenant to THIS account's dealer for the whole run so customer /
        // charge lookups (and the new rows) stay within the right dealer — critical
        // in the scheduler where no request has set the tenant.
        return Tenant::run($account->dealer_id, function () use ($source, $account, $from, $to, $fetch) {
            // for_date stores the newest day scanned — it's the catch-up watermark.
            $run = SyncRun::create([
                'account_id' => $account->id, 'source' => $source, 'for_date' => $to,
                'started_at' => now(), 'status' => 'running',
            ]);
            try {
                $rows = $fetch();
                $this->process($run, $account, $rows, $from, $to);
            } catch (Throwable $e) {
                $run->update(['status' => 'failed', 'finished_at' => now(), 'error_message' => $e->getMessage()]);
            }

            return $run->fresh();
        });
    }

    private function process(SyncRun $run, Account $account, $rows, string $from, string $to): void
    {
        $imported = 0;
        $dupes = 0;
        $attention = 0;
        $fetched = 0;
        $postDate = now()->toDateString(); // stage every catch-up recharge under today so it lands on "Charged Today" for review

        foreach ($rows as $r) {
            // Keep only recharges inside the catch-up window [from, to].
            $rd = $r['rechargedAt']->toDateString();
            if ($rd < $from || $rd > $to) {
                continue;
            }
            $fetched++;
            $login = strtolower(trim($r['portalUser']));
            $customer = Customer::with('subscription', 'package')->whereRaw('lower(login_id) = ?', [$login])->first();

            if (! $customer) {
                SyncRow::create([
                    'run_id' => $run->id, 'account_id' => $account->id, 'portal_user_name' => $r['portalUser'],
                    'speed_label' => $r['speedLabel'], 'cost_amount' => $r['cost'], 'recharged_at' => $r['rechargedAt'],
                    'status' => 'unmatched_user',
                ]);
                $attention++;

                continue;
            }

            // Dedup on the portal RECHARGE EVENT (customer + exact recharge time),
            // not the post date — so re-syncing an overlapping window never
            // re-imports the same top-up.
            $already = SyncRow::where('matched_customer_id', $customer->id)
                ->where('recharged_at', $r['rechargedAt'])
                ->where('status', 'imported')->exists();
            if ($already) {
                SyncRow::create([
                    'run_id' => $run->id, 'account_id' => $account->id, 'portal_user_name' => $r['portalUser'],
                    'matched_customer_id' => $customer->id, 'speed_label' => $r['speedLabel'],
                    'cost_amount' => $r['cost'], 'recharged_at' => $r['rechargedAt'], 'status' => 'duplicate',
                ]);
                $dupes++;

                continue;
            }

            DB::transaction(function () use ($run, $account, $customer, $r, $postDate, &$imported) {
                // Pick the package from the portal's reported speed (via speed_maps) so
                // a 25 Mbps recharge maps to the "25 MB" tier — not the customer's stale
                // (often legacy) stored package. Fall back to their current package.
                $mappedPkgId = DB::table('speed_maps')->where('dealer_id', $account->dealer_id)->where('speed_label', $r['speedLabel'])->value('package_id');
                $packageId = $mappedPkgId ?? $customer->current_package_id;
                $pkgPrice = $packageId ? DB::table('packages')->where('dealer_id', $account->dealer_id)->where('id', $packageId)->value('price') : null;
                // Default the charge to the package's standard fee (NOT any stale
                // frozen_amount, which the Excel import sometimes inflated with arrears).
                $charged = $pkgPrice ?? $customer->subscription?->frozen_amount ?? $r['cost'];
                $charge = Charge::create([
                    'customer_id' => $customer->id, 'account_id' => $account->id,
                    'package_id' => $packageId,
                    'amount_charged' => $charged, 'cost_amount' => $r['cost'],
                    'previous_balance' => $customer->outstanding_balance,
                    'charge_date' => $postDate, 'billing_period_label' => $r['rechargedAt']->format('F Y'),
                    'source' => 'connect_sync', 'recorded_by' => 'Portal Sync',
                    'pending' => true, // staged — does NOT touch the balance until confirmed
                ]);
                // A portal recharge = the card was topped up, but we do NOT commit it
                // to the ledger yet. Staff review the opening balance + amount on the
                // Charged Today page and click "Add to record" to apply it. The
                // customer's balance / account pointer stay untouched here.

                SyncRow::create([
                    'run_id' => $run->id, 'account_id' => $account->id, 'portal_user_name' => $r['portalUser'],
                    'matched_customer_id' => $customer->id, 'charge_id' => $charge->id, 'speed_label' => $r['speedLabel'],
                    'cost_amount' => $r['cost'], 'charged_amount' => $charged, 'payment_settled' => false,
                    'recharged_at' => $r['rechargedAt'], 'status' => 'imported',
                ]);
                $imported++;
            });
        }

        $run->update([
            'finished_at' => now(), 'rows_fetched' => $fetched, 'imported' => $imported,
            'duplicates' => $dupes, 'needs_attention' => $attention,
            'status' => $attention > 0 ? 'partial' : 'success',
        ]);
    }

    private function syncArrears(Customer $c): void
    {
        $c->loadMissing('subscription');
        $fee = $c->subscription?->frozen_amount ?? optional($c->package)->price ?? 0;
        $c->months_overdue = ($fee > 0 && $c->outstanding_balance > 0) ? (int) round($c->outstanding_balance / $fee) : 0;
        $c->save();
    }
}
