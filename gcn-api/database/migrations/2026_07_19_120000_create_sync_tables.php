<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_runs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('account_id')->constrained('accounts');
            $t->string('source'); // connect | fiberbeam
            $t->date('for_date');
            $t->timestamp('started_at');
            $t->timestamp('finished_at')->nullable();
            $t->string('status')->default('running'); // success | partial | failed | running
            $t->integer('rows_fetched')->default(0);
            $t->integer('imported')->default(0);
            $t->integer('duplicates')->default(0);
            $t->integer('needs_attention')->default(0);
            $t->text('error_message')->nullable();
            $t->timestamps();
        });

        Schema::create('sync_rows', function (Blueprint $t) {
            $t->id();
            $t->foreignId('run_id')->constrained('sync_runs')->cascadeOnDelete();
            $t->foreignId('account_id')->constrained('accounts');
            $t->string('portal_user_name');
            $t->foreignId('matched_customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $t->foreignId('charge_id')->nullable()->constrained('charges')->nullOnDelete();
            $t->string('speed_label')->nullable();
            $t->integer('cost_amount')->default(0);
            $t->integer('charged_amount')->nullable();
            $t->boolean('payment_settled')->default(false);
            $t->timestamp('recharged_at')->nullable();
            $t->string('status'); // imported | duplicate | unmatched_user | unmapped_speed
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_rows');
        Schema::dropIfExists('sync_runs');
    }
};
