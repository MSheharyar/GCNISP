<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\PortalStat;
use App\Models\SyncRow;
use App\Models\SyncRun;
use App\Services\PortalSyncService;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    // Latest run per account + their rows (what the Connect Sync screen shows).
    public function index()
    {
        $latestIds = SyncRun::selectRaw('max(id) as id')->groupBy('account_id')->pluck('id');
        $runs = SyncRun::whereIn('id', $latestIds)->orderBy('account_id')->get();
        $rows = SyncRow::with('customer:id,name')->whereIn('run_id', $runs->pluck('id'))->orderByDesc('recharged_at')->get();

        return [
            'runs' => $runs->map(fn ($r) => $this->runPayload($r)),
            'rows' => $rows->map(fn ($r) => $this->rowPayload($r)),
        ];
    }

    // Trigger a sync now for today (all accounts).
    public function run(Request $request, PortalSyncService $sync)
    {
        $date = $request->input('date'); // optional YYYY-MM-DD

        foreach (config('scrapers.connect.accounts') as $name => $cred) {
            if (empty($cred['user'])) {
                continue;
            }
            $account = Account::where('name', $name)->first();
            if ($account) {
                $sync->runConnect($account, $cred['user'], $cred['pass'], $date);
            }
        }
        $fiber = Account::where('name', config('scrapers.fiberbeam.account'))->first();
        if ($fiber) {
            $sync->runFiberBeam($fiber, $date);
        }

        $sync->syncDashboards(); // refresh the live portal KPIs too

        return $this->index();
    }

    // Latest dashboard KPIs scraped from each portal account (for our dashboard).
    public function stats()
    {
        return PortalStat::with('account:id,name,provider_id')->orderBy('account_id')->get()
            ->map(fn ($s) => $this->statPayload($s));
    }

    // On-demand refresh of just the portal dashboard KPIs (no recharge import).
    public function refreshStats(PortalSyncService $sync)
    {
        $sync->syncDashboards();

        return $this->stats();
    }

    private function statPayload(PortalStat $s): array
    {
        return [
            'accountId' => $s->account_id, 'account' => $s->account?->name, 'source' => $s->source,
            'total' => $s->total, 'active' => $s->active, 'online' => $s->online, 'offline' => $s->offline,
            'disabled' => $s->disabled, 'inactive' => $s->inactive, 'expired' => $s->expired, 'expiring' => $s->expiring,
            'newUsers' => $s->new_users, 'balance' => $s->balance,
            'topupReceived' => $s->topup_received, 'topupSend' => $s->topup_send,
            'packages' => $s->packages,
            'error' => $s->error, 'capturedAt' => optional($s->captured_at)->toDateTimeString(),
        ];
    }

    private function runPayload(SyncRun $r): array
    {
        return [
            'id' => $r->id, 'accountId' => $r->account_id, 'source' => $r->source,
            'startedAt' => optional($r->started_at)->toDateTimeString(),
            'finishedAt' => optional($r->finished_at)->toDateTimeString(),
            'status' => $r->status, 'rowsFetched' => $r->rows_fetched, 'imported' => $r->imported,
            'duplicates' => $r->duplicates, 'needsAttention' => $r->needs_attention,
            'errorMessage' => $r->error_message,
        ];
    }

    private function rowPayload(SyncRow $r): array
    {
        return [
            'id' => $r->id, 'runId' => $r->run_id, 'accountId' => $r->account_id,
            'portalUserName' => $r->portal_user_name, 'matchedCustomerId' => $r->matched_customer_id,
            'matchedName' => $r->customer?->name,
            'speedLabel' => $r->speed_label, 'costAmount' => $r->cost_amount, 'chargedAmount' => $r->charged_amount,
            'paymentSettled' => (bool) $r->payment_settled,
            'rechargedAt' => optional($r->recharged_at)->toDateTimeString(),
            'status' => $r->status,
        ];
    }
}
