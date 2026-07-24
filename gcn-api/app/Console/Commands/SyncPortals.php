<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Services\PortalSyncService;
use Illuminate\Console\Command;

class SyncPortals extends Command
{
    protected $signature = 'sync:portals {--date= : YYYY-MM-DD (defaults to today)} {--source=all : all|connect|fiberbeam}';

    protected $description = 'Pull recharges from Connect + Fiber Beam and import them as charges/payments';

    public function handle(PortalSyncService $sync): int
    {
        $date = $this->option('date');
        $source = $this->option('source');

        // No tenant is set in the scheduler, so Account::all() spans EVERY dealer.
        // runAccount() pins the tenant to each account's dealer for its run, so
        // customer matching + new charges stay isolated per dealer.
        foreach (Account::all() as $account) {
            $run = $sync->runAccount($account, $date, $source);
            if (! $run) {
                continue;
            }
            $this->line("[dealer {$account->dealer_id}] {$account->name} ({$run->source}): {$run->status} — imported {$run->imported}, dup {$run->duplicates}, attention {$run->needs_attention}".($run->error_message ? " ({$run->error_message})" : ''));
        }

        return self::SUCCESS;
    }
}
