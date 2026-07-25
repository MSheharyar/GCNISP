<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Quotations reuse the invoices table with a `type` discriminator. Unlike an
// invoice, a quotation can be addressed to a NOT-yet-existing customer (free-form
// recipient), has no billing period, and carries a validity date + notes.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $t) {
            $t->string('type')->default('invoice')->index();   // invoice | quotation
            $t->string('recipient_name')->nullable();          // used when no customer_id
            $t->string('recipient_phone')->nullable();
            $t->text('recipient_address')->nullable();
            $t->date('valid_until')->nullable();               // quotation validity
            $t->text('notes')->nullable();
        });

        // A quotation may not reference an existing customer, and has no period.
        Schema::table('invoices', function (Blueprint $t) {
            $t->foreignId('customer_id')->nullable()->change();
            $t->string('period_label')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $t) {
            $t->dropColumn(['type', 'recipient_name', 'recipient_phone', 'recipient_address', 'valid_until', 'notes']);
        });
    }
};
