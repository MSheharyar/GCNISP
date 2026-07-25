<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// SaaS sales leads captured from the public landing page's "Request access" form.
// Not tenant-scoped — they belong to the owner (super-admin) before any dealer
// exists.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('business_name')->nullable();
            $t->string('phone');
            $t->string('city')->nullable();
            $t->string('subscribers')->nullable();   // free text bucket e.g. "300-500"
            $t->string('portals')->nullable();        // which ISP portal(s) they use
            $t->text('message')->nullable();
            $t->string('status')->default('new');     // new | contacted | converted | dropped
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
