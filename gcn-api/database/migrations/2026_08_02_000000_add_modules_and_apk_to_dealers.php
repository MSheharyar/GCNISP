<?php

use App\Models\Dealer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Per-dealer feature toggles (which modules their workspace shows) + the APK
// download link shown as a QR on their console.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dealers', function (Blueprint $t) {
            $t->json('enabled_modules')->nullable();
            $t->text('apk_url')->nullable();
        });

        // Existing dealers keep every module (nothing hidden by the upgrade).
        DB::table('dealers')->update(['enabled_modules' => json_encode(Dealer::MODULES)]);
    }

    public function down(): void
    {
        Schema::table('dealers', function (Blueprint $t) {
            $t->dropColumn(['enabled_modules', 'apk_url']);
        });
    }
};
