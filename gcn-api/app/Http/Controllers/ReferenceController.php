<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Dealer;
use App\Models\Package;
use App\Models\Provider;
use App\Models\Setting;
use App\Models\SpeedMap;
use App\Support\Tenant;

class ReferenceController extends Controller
{
    // Public branding for a subdomain (pre-login theming). No auth, safe subset:
    // just name/colour/logo. Unknown slug → nulls (client falls back to default).
    public function publicBranding(string $slug)
    {
        $dealer = Dealer::where('slug', $slug)->first();

        return [
            'name' => $dealer?->name,
            'primaryColor' => $dealer?->primary_color,
            'logoUrl' => $dealer?->logo_url,
        ];
    }

    // The current dealer's branding — applied app-wide on load. Null values fall
    // back to the default GCN theme + bundled logo on the client.
    public function branding()
    {
        $dealer = Dealer::find(Tenant::id());

        return [
            'name' => $dealer?->name,
            'primaryColor' => $dealer?->primary_color,
            'logoUrl' => $dealer?->logo_url,
            // Effective mobile-app download link: the dealer's own, else the global default.
            'apkUrl' => ($dealer?->apk_url ?: config('mobile.apk_url')) ?: null,
        ];
    }

    public function providers()
    {
        return Provider::orderBy('id')->get()->map(fn ($p) => [
            'id' => $p->id, 'name' => $p->name, 'type' => $p->type,
        ]);
    }

    public function accounts()
    {
        return Account::orderBy('id')->get()->map(fn ($a) => [
            'id' => $a->id, 'providerId' => $a->provider_id, 'name' => $a->name, 'notes' => $a->notes,
        ]);
    }

    public function packages()
    {
        return Package::orderBy('id')->get()->map(fn ($p) => [
            'id' => $p->id, 'name' => $p->name, 'speedMbps' => $p->speed_mbps, 'price' => $p->price, 'cost' => $p->cost, 'isActive' => (bool) $p->is_active,
        ]);
    }

    public function speedMap()
    {
        return SpeedMap::orderBy('id')->get()->map(fn ($s) => [
            'speedLabel' => $s->speed_label, 'packageId' => $s->package_id,
        ]);
    }

    public function orgSettings()
    {
        $s = Setting::pluck('value', 'key');

        return [
            'businessName' => $s['business_name'] ?? '', 'officeContact1' => $s['office_contact1'] ?? '',
            'officeContact2' => $s['office_contact2'] ?? '', 'jazzCashTitle' => $s['jazzcash_title'] ?? '',
            'jazzCashNumber' => $s['jazzcash_number'] ?? '', 'connectionTech' => $s['connection_tech'] ?? '',
            'officeAddress' => $s['office_address'] ?? '',
        ];
    }

    // Connect sync is parked — return empty runs/rows so the screen renders.
    public function connectSync()
    {
        return ['runs' => [], 'rows' => []];
    }
}
