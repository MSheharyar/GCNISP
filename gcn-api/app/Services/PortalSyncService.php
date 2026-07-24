<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Charge;
use App\Models\Customer;
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

        return match ($cred['source']) {
            'connect' => $this->runConnect($account, $cred['user'], $cred['pass'], $date),
            'fiberbeam' => $this->runFiberBeam($account, $date, $cred['dealer'], $cred['user'], $cred['pass']),
            default => null,
        };
    }

    /** Sync one Connect reseller account (GCNDIGITAL / MRGNET). */
    public function runConnect(Account $account, string $user, string $pass, ?string $date = null): SyncRun
    {
        return $this->guarded('connect', $account, $date, function ($forDate) use ($user, $pass) {
            return collect($this->connect->fetchRecharges($user, $pass))->map(fn ($r) => [
                'portalUser' => $r['userName'],
                'speedLabel' => $r['packageLabel'],
                'cost' => $r['amount'],
                'rechargedAt' => Carbon::parse($r['dateTime']),
            ]);
        });
    }

    /** Sync a Fiber Beam panel (defaults to GCN's .env creds, or a dealer's own). */
    public function runFiberBeam(Account $account, ?string $date = null, ?string $dealer = null, ?string $user = null, ?string $pass = null): SyncRun
    {
        return $this->guarded('fiberbeam', $account, $date, function ($forDate) use ($dealer, $user, $pass) {
            return collect($this->fiber->fetchRecharges($forDate, $forDate, $dealer, $user, $pass))->map(fn ($r) => [
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

    private function guarded(string $source, Account $account, ?string $date, callable $fetch): SyncRun
    {
        // Pin the tenant to THIS account's dealer for the whole run so customer /
        // charge lookups (and the new rows) stay within the right dealer — critical
        // in the scheduler where no request has set the tenant.
        return Tenant::run($account->dealer_id, function () use ($source, $account, $date, $fetch) {
            $forDate = $date ?? now()->toDateString();
            $run = SyncRun::create([
                'account_id' => $account->id, 'source' => $source, 'for_date' => $forDate,
                'started_at' => now(), 'status' => 'running',
            ]);
            try {
                $rows = $fetch($forDate);
                $this->process($run, $account, $rows, $forDate);
            } catch (Throwable $e) {
                $run->update(['status' => 'failed', 'finished_at' => now(), 'error_message' => $e->getMessage()]);
            }

            return $run->fresh();
        });
    }

    private function process(SyncRun $run, Account $account, $rows, string $forDate): void
    {
        $imported = 0;
        $dupes = 0;
        $attention = 0;
        $fetched = 0;

        foreach ($rows as $r) {
            // Only the target day's recharges (Connect returns recent 100).
            if ($r['rechargedAt']->toDateString() !== $forDate) {
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

            $already = Charge::where('customer_id', $customer->id)->where('source', 'connect_sync')
                ->whereDate('charge_date', $forDate)->exists();
            if ($already) {
                SyncRow::create([
                    'run_id' => $run->id, 'account_id' => $account->id, 'portal_user_name' => $r['portalUser'],
                    'matched_customer_id' => $customer->id, 'speed_label' => $r['speedLabel'],
                    'cost_amount' => $r['cost'], 'recharged_at' => $r['rechargedAt'], 'status' => 'duplicate',
                ]);
                $dupes++;

                continue;
            }

            DB::transaction(function () use ($run, $account, $customer, $r, $forDate, &$imported) {
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
                    'charge_date' => $forDate, 'billing_period_label' => $r['rechargedAt']->format('F Y'),
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
