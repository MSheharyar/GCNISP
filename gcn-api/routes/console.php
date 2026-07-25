<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Portal sync is manual now — trigger it from the Connect Sync screen's
// "Run sync now" button (it catches up every recharge since the last sync).
// The `sync:portals` command is still available for ad-hoc/CLI runs.
