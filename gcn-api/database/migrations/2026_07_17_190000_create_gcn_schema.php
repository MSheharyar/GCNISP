<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('providers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('type'); // reseller | in_house
            $t->timestamps();
        });

        Schema::create('accounts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('provider_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('notes')->nullable();
            $t->timestamps();
        });

        Schema::create('packages', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->integer('speed_mbps')->default(0);
            $t->integer('price')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('settings', function (Blueprint $t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value')->nullable();
            $t->timestamps();
        });

        Schema::create('speed_maps', function (Blueprint $t) {
            $t->id();
            $t->string('speed_label');
            $t->foreignId('package_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('customers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('login_id')->index();
            $t->string('type')->default('residential'); // residential | commercial
            $t->string('company_name')->nullable();
            $t->string('house_no')->nullable();
            $t->string('sector')->nullable();
            $t->text('billing_address')->nullable();
            $t->foreignId('current_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $t->foreignId('current_package_id')->nullable()->constrained('packages')->nullOnDelete();
            $t->string('status')->default('active'); // active|inactive|suspended|pending
            $t->string('phone')->nullable();
            $t->string('collection_model')->default('prepaid'); // prepaid | credit
            $t->integer('outstanding_balance')->default(0);
            $t->integer('months_overdue')->default(0); // derived arrears depth
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('subscriptions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $t->foreignId('package_id')->nullable()->constrained()->nullOnDelete();
            $t->integer('frozen_amount')->nullable();
            $t->integer('typical_charge_day')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('charges', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $t->foreignId('account_id')->constrained('accounts');
            $t->foreignId('package_id')->nullable()->constrained('packages')->nullOnDelete();
            $t->integer('amount_charged');
            $t->integer('cost_amount')->nullable();
            $t->integer('previous_balance')->nullable(); // customer balance snapshot before this charge
            $t->date('charge_date');
            $t->string('billing_period_label');
            $t->string('source')->default('manual'); // manual | connect_sync
            $t->string('recorded_by')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index('charge_date');
        });

        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $t->foreignId('charge_id')->nullable()->constrained('charges')->nullOnDelete();
            $t->integer('amount_received');
            $t->date('received_date');
            $t->string('method')->default('cash'); // cash|jazz|bank|other
            $t->boolean('is_arrears')->default(false);
            $t->string('recorded_by')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index('received_date');
        });

        Schema::create('cable_customers', function (Blueprint $t) {
            $t->id();
            $t->string('name')->nullable();
            $t->string('house_no');
            $t->string('sector');
            $t->integer('monthly_fee')->default(0);
            $t->integer('balance')->default(0);
            $t->string('status')->default('active');
            $t->date('last_paid_date')->nullable();
            $t->timestamps();
        });

        Schema::create('cable_payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cable_customer_id')->constrained()->cascadeOnDelete();
            $t->date('date');
            $t->integer('amount');
            $t->string('label')->nullable();
            $t->timestamps();
        });

        Schema::create('expenses', function (Blueprint $t) {
            $t->id();
            $t->date('date');
            $t->integer('amount');
            $t->string('category'); // salary|utility|supplies|household|owner_draw|recovery|other
            $t->string('description');
            $t->string('paid_from')->default('net'); // net|cable|other
            $t->string('person')->nullable();
            $t->string('period_label');
            $t->timestamps();
            $t->index('date');
        });

        Schema::create('invoices', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $t->string('invoice_no')->unique();
            $t->date('issue_date');
            $t->string('period_label');
            $t->json('line_items');
            $t->integer('total_amount');
            $t->string('generated_by')->nullable();
            $t->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('action');
            $t->string('entity');
            $t->unsignedBigInteger('entity_id')->nullable();
            $t->json('changes')->nullable();
            $t->string('ip')->nullable();
            $t->timestamp('created_at')->useCurrent();
        });

        Schema::table('users', function (Blueprint $t) {
            $t->string('role')->default('operator')->after('email'); // admin|operator|viewer
            $t->boolean('is_active')->default(true)->after('role');
            $t->timestamp('last_active_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropColumn(['role', 'is_active', 'last_active_at']);
        });
        foreach ([
            'audit_logs', 'invoices', 'expenses', 'cable_payments', 'cable_customers',
            'payments', 'charges', 'subscriptions', 'customers', 'speed_maps',
            'settings', 'packages', 'accounts', 'providers',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
