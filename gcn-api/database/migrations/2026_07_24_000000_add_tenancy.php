<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Multi-tenant SaaS foundation: a `dealers` table (one tenant per dealer) and a
// `dealer_id` on every tenant-owned table. Isolation is enforced in the app via
// a global scope (Eloquent) + explicit dealer_id on raw queries. Existing data
// is assigned to dealer #1 by the seeder. `is_super_admin` users (the SaaS owner)
// have no dealer and can manage all dealers.
return new class extends Migration
{
    private array $tenantTables = [
        'providers', 'accounts', 'packages', 'settings', 'speed_maps',
        'customers', 'subscriptions', 'charges', 'payments',
        'cable_customers', 'cable_payments', 'expenses', 'invoices',
        'audit_logs', 'sync_runs', 'sync_rows', 'portal_stats',
    ];

    public function up(): void
    {
        Schema::create('dealers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->string('status')->default('active'); // active | suspended | trial
            $t->string('contact_name')->nullable();
            $t->string('contact_phone')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });

        foreach ($this->tenantTables as $table) {
            Schema::table($table, function (Blueprint $b) {
                $b->unsignedBigInteger('dealer_id')->nullable()->index();
            });
        }

        Schema::table('users', function (Blueprint $b) {
            $b->unsignedBigInteger('dealer_id')->nullable()->index();
            $b->boolean('is_super_admin')->default(false);
        });
    }

    public function down(): void
    {
        foreach ($this->tenantTables as $table) {
            Schema::table($table, fn (Blueprint $b) => $b->dropColumn('dealer_id'));
        }
        Schema::table('users', fn (Blueprint $b) => $b->dropColumn(['dealer_id', 'is_super_admin']));
        Schema::dropIfExists('dealers');
    }
};
