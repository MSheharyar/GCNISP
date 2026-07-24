<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Each dealer stores their OWN portal login on their account rows (SaaS): the
// scraper reads these instead of the shared .env. Username/password are encrypted
// at rest (Eloquent 'encrypted' cast). GCN (dealer 1) keeps using .env until it
// fills these in — PortalSyncService falls back to config by account name.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $t) {
            $t->string('portal_source')->nullable();      // connect | fiberbeam
            $t->text('portal_username')->nullable();       // encrypted
            $t->text('portal_password')->nullable();       // encrypted
            $t->string('portal_dealer')->nullable();       // fiberbeam dealer slug
            $t->boolean('portal_enabled')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $t) {
            $t->dropColumn(['portal_source', 'portal_username', 'portal_password', 'portal_dealer', 'portal_enabled']);
        });
    }
};
