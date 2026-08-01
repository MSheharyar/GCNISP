<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Per-account, per-month wallet top-up received from the upstream company
// (Connect balance-logs / Fiber ledger). Cached so the report is instant; a
// "Refresh" re-scrapes the recent months.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_topups', function (Blueprint $t) {
            $t->id();
            $t->foreignId('dealer_id')->nullable()->index();
            $t->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $t->string('ym', 7);          // YYYY-MM
            $t->integer('amount')->default(0);
            $t->timestamp('captured_at')->nullable();
            $t->timestamps();
            $t->unique(['account_id', 'ym']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_topups');
    }
};
