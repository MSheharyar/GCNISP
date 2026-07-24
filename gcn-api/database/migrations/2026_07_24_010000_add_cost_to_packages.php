<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Per-package "cutting amount" (what the dealer pays their upstream). Combined
// with `price` (what the dealer charges the customer) this gives each dealer
// their margin — useful for dealers on portals other than Connect/Fiber who
// enter packages manually.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $t) {
            $t->integer('cost')->nullable()->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('packages', fn (Blueprint $t) => $t->dropColumn('cost'));
    }
};
