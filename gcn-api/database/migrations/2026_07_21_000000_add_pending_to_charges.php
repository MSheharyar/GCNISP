<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A portal-synced recharge is now STAGED for human review: it lands as a
// `pending` charge that does NOT affect the customer's balance until staff
// confirm the opening balance and click "Add to record" on Charged Today.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charges', function (Blueprint $table) {
            $table->boolean('pending')->default(false)->index();
        });
    }

    public function down(): void
    {
        Schema::table('charges', function (Blueprint $table) {
            $table->dropColumn('pending');
        });
    }
};
