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

        // Which portal each row came from — the run's source + the account label.
        $sourceByRun = $runs->pluck('source', 'id');
        $accountName = Account::whereIn('id', $runs->pluck('account_id'))->pluck('name', 'id');

        return [
            'runs' => $runs->map(fn ($r) => $this->runPayload($r)),
            'rows' => $rows->map(fn ($r) => array_merge($this->rowPayload($r), [
                'source' => $sourceByRun[$r->run_id] ?? null,
                'portal' => $this->portalLabel($sourceByRun[$r->run_id] ?? null),
                'account' => $accountName[$r->account_id] ?? null,
            ])),
        ];
    }

    // Friendly portal name for the rows table.
    private function portalLabel(?string $source): ?string
    {
        return match ($source) {
            'connect' => 'Connect',
            'fiberbeam' => 'Fiber ISP',
            default => null,
        };
    }

    // Trigger a sync now — pulls every recharge since the last sync (all accounts).
    public function run(Request $request, PortalSyncService $sync)
    {
        $date = $request->input('date'); // optional YYYY-MM-DD to pin a single day

        // Account is tenant-scoped, so this only runs the current dealer's accounts.
        // runAccount() no-ops on accounts without portal credentials.
        foreach (Account::all() as $account) {
            $sync->runAccount($account, $date);
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

    // ── Portal credentials (admin) ──────────────────────────────────────────
    // The dealer's own accounts + their portal login state. The password is never
    // returned — only whether one is set.
    public function portalAccounts()
    {
        return Account::with('provider:id,name,type')->orderBy('id')->get()->map(fn ($a) => [
            'id' => $a->id,
            'name' => $a->name,
            'provider' => $a->provider?->name,
            'source' => $a->portal_source,
            'username' => $a->portal_username,
            'dealer' => $a->portal_dealer,
            'enabled' => (bool) $a->portal_enabled,
            'hasPassword' => filled($a->portal_password),
        ]);
    }

    // Save an account's portal credentials. Password is only overwritten when a
    // (non-empty) new one is supplied, so toggling "enabled" won't wipe it.
    public function updatePortalAccount(Request $request, Account $account)
    {
        $data = $request->validate([
            'source' => ['nullable', 'in:connect,fiberbeam'],
            'username' => ['nullable', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'max:200'],
            'dealer' => ['nullable', 'string', 'max:120'],
            'enabled' => ['boolean'],
        ]);

        if (blank($data['source'] ?? null)) {
            // Disconnecting: wipe every credential field so no secret lingers.
            $account->forceFill([
                'portal_source' => null, 'portal_username' => null, 'portal_password' => null,
                'portal_dealer' => null, 'portal_enabled' => false,
            ]);
        } else {
            $account->portal_source = $data['source'];
            $account->portal_username = $data['username'] ?? null;
            $account->portal_dealer = $data['dealer'] ?? null;
            $account->portal_enabled = $data['enabled'] ?? false;
            if (filled($data['password'] ?? null)) {
                $account->portal_password = $data['password']; // only overwrite when a new one is typed
            }
        }
        $account->save();

        return [
            'id' => $account->id,
            'name' => $account->name,
            'source' => $account->portal_source,
            'username' => $account->portal_username,
            'dealer' => $account->portal_dealer,
            'enabled' => (bool) $account->portal_enabled,
            'hasPassword' => filled($account->portal_password),
        ];
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
