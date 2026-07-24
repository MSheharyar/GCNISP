<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Settings keys and invoice numbers are unique PER DEALER, not globally —
// otherwise a second dealer can't have a 'business_name' setting or an invoice
// numbered like the first dealer's.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $t) {
            $t->dropUnique('settings_key_unique');
            $t->unique(['dealer_id', 'key']);
        });
        Schema::table('invoices', function (Blueprint $t) {
            $t->dropUnique('invoices_invoice_no_unique');
            $t->unique(['dealer_id', 'invoice_no']);
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $t) {
            $t->dropUnique(['dealer_id', 'key']);
            $t->unique('key');
        });
        Schema::table('invoices', function (Blueprint $t) {
            $t->dropUnique(['dealer_id', 'invoice_no']);
            $t->unique('invoice_no');
        });
    }
};
