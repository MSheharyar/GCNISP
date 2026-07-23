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

        if ($source === 'all' || $source === 'connect') {
            foreach (config('scrapers.connect.accounts') as $name => $cred) {
                if (empty($cred['user'])) {
                    continue;
                }
                $account = Account::where('name', $name)->first();
                if (! $account) {
                    $this->warn("No account row for {$name}, skipping.");

                    continue;
                }
                $run = $sync->runConnect($account, $cred['user'], $cred['pass'], $date);
                $this->line("Connect {$name}: {$run->status} — imported {$run->imported}, dup {$run->duplicates}, attention {$run->needs_attention}".($run->error_message ? " ({$run->error_message})" : ''));
            }
        }

        if ($source === 'all' || $source === 'fiberbeam') {
            $account = Account::where('name', config('scrapers.fiberbeam.account'))->first();
            if ($account) {
                $run = $sync->runFiberBeam($account, $date);
                $this->line("Fiber Beam: {$run->status} — imported {$run->imported}, dup {$run->duplicates}, attention {$run->needs_attention}".($run->error_message ? " ({$run->error_message})" : ''));
            }
        }

        return self::SUCCESS;
    }
}
