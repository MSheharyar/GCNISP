<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Nightly portal sync (Connect + Fiber Beam) — pulls the previous day's
// recharges. Requires the OS scheduler to run `php artisan schedule:run` each
// minute (Task Scheduler on Windows / cron on Linux).
Schedule::command('sync:portals --date='.now()->subDay()->toDateString())
    ->dailyAt('02:00')
    ->withoutOverlapping();
