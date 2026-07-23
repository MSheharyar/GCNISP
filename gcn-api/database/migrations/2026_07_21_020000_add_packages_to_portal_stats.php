<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Per-speed online/active breakdown scraped from Connect's "Online Customers
// Package wise" component (JSON; null for portals that don't expose it).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portal_stats', function (Blueprint $table) {
            $table->json('packages')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('portal_stats', function (Blueprint $table) {
            $table->dropColumn('packages');
        });
    }
};
