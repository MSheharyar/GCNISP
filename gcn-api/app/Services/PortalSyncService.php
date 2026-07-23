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
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

class PortalSyncService
{
    public function __construct(
        private ConnectConnector $connect,
        private FiberBeamConnector $fiber,
    ) {}

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

    /** Sync the in-house Fiber Beam panel. */
    public function runFiberBeam(Account $account, ?string $date = null): SyncRun
    {
        return $this->guarded('fiberbeam', $account, $date, function ($forDate) {
            return collect($this->fiber->fetchRecharges($forDate, $forDate))->map(fn ($r) => [
                'portalUser' => $r['userId'],
                'speedLabel' => $r['packageLabel'],
                'cost' => $r['price'],
                'rechargedAt' => Carbon::parse($r['loadDate']),
            ]);
        });
    }

    /** Scrape each portal account's dashboard KPIs into portal_stats (latest snapshot). */
    public function syncDashboards(): void
    {
        foreach (config('scrapers.connect.accounts') as $name => $cred) {
            if (empty($cred['user'])) {
                continue;
            }
            $account = Account::where('name', $name)->first();
            if ($account) {
                $this->captureDashboard($account, 'connect', fn () => $this->connect->fetchDashboard($cred['user'], $cred['pass']));
            }
        }

        $fiber = Account::where('name', config('scrapers.fiberbeam.account'))->first();
        if ($fiber) {
            $this->captureDashboard($fiber, 'fiberbeam', fn () => $this->fiber->fetchDashboard());
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
                // Default the charge to the customer's standard package fee (NOT any
                // stale frozen_amount, which the Excel import sometimes inflated with
                // arrears). Staff can correct it on Charged Today before adding it.
                $charged = optional($customer->package)->price ?? $customer->subscription?->frozen_amount ?? $r['cost'];
                $charge = Charge::create([
                    'customer_id' => $customer->id, 'account_id' => $account->id,
                    'package_id' => $customer->current_package_id,
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
