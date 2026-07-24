<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Per-dealer branding the owner can tweak: a primary brand colour (hex, the app
// derives the full ramp from it) and a logo image URL. Null = fall back to the
// default GCN theme + bundled logo.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dealers', function (Blueprint $t) {
            $t->string('primary_color', 9)->nullable();  // e.g. #1a66e0
            $t->text('logo_url')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('dealers', function (Blueprint $t) {
            $t->dropColumn(['primary_color', 'logo_url']);
        });
    }
};
