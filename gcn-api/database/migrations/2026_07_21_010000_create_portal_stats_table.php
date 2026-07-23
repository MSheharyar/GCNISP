<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Latest dashboard snapshot scraped from each upstream portal account
// (Connect GCNDIGITAL / MRGNET, Fiber Beam). One row per account, upserted.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portal_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('source'); // connect | fiberbeam
            $table->unsignedInteger('total')->nullable();
            $table->unsignedInteger('active')->nullable();
            $table->unsignedInteger('online')->nullable();
            $table->unsignedInteger('offline')->nullable();
            $table->unsignedInteger('disabled')->nullable();
            $table->unsignedInteger('inactive')->nullable();
            $table->unsignedInteger('expired')->nullable();
            $table->unsignedInteger('expiring')->nullable();
            $table->unsignedInteger('new_users')->nullable();
            $table->integer('balance')->nullable();
            $table->integer('topup_received')->nullable();
            $table->integer('topup_send')->nullable();
            $table->string('error')->nullable(); // last scrape error, if any
            $table->timestamp('captured_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_stats');
    }
};
