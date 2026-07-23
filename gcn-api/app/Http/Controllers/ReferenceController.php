<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Package;
use App\Models\Provider;
use App\Models\Setting;
use App\Models\SpeedMap;

class ReferenceController extends Controller
{
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
            'id' => $p->id, 'name' => $p->name, 'speedMbps' => $p->speed_mbps, 'price' => $p->price, 'isActive' => (bool) $p->is_active,
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
