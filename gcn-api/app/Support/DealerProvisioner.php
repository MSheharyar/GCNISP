<?php

namespace App\Support;

use App\Models\Account;
use App\Models\Package;
use App\Models\Provider;
use App\Models\Setting;
use App\Models\SpeedMap;

/**
 * Sets a brand-new dealer up with sensible defaults so they can start entering
 * data immediately (they have no Excel history). Seeds the standard speed-tier
 * packages, the portal speed→package map, and starter org settings — all scoped
 * to the new dealer. Everything is editable by the dealer afterwards.
 */
class DealerProvisioner
{
    /** speed => default customer price (dealers edit these + add cost later). */
    private const TIERS = [5 => 1200, 15 => 1300, 20 => 1500, 25 => 1800, 30 => 1800, 35 => 2000, 40 => 1800, 50 => 2500, 60 => 3500, 75 => 3500, 100 => 8000];

    public function seedDefaults(int $dealerId, string $businessName): void
    {
        Tenant::run($dealerId, function () use ($businessName) {
            $idBySpeed = [];
            foreach (self::TIERS as $speed => $price) {
                $pkg = Package::create(['name' => "$speed MB", 'speed_mbps' => $speed, 'price' => $price, 'is_active' => true]);
                $idBySpeed[$speed] = $pkg->id;
            }

            foreach (self::TIERS as $speed => $price) {
                foreach (["{$speed}Mbps", "FB-{$speed}Mbps"] as $label) {
                    SpeedMap::create(['speed_label' => $label, 'package_id' => $idBySpeed[$speed]]);
                }
            }

            // Portal-capable accounts, disabled until the dealer enters their own
            // credentials (Settings → Portal Credentials). Dealers on other ISPs
            // can rename/repurpose these or just enter data manually.
            $connect = Provider::create(['name' => 'Connect Communication', 'type' => 'reseller']);
            Account::create(['provider_id' => $connect->id, 'name' => 'Connect', 'portal_source' => 'connect', 'portal_enabled' => false]);

            $fiber = Provider::create(['name' => 'Fiber ISP', 'type' => 'in_house']);
            Account::create(['provider_id' => $fiber->id, 'name' => 'Fiber ISP', 'portal_source' => 'fiberbeam', 'portal_enabled' => false]);

            $settings = [
                'business_name' => $businessName,
                'office_contact1' => '',
                'office_contact2' => '',
                'jazzcash_title' => '',
                'jazzcash_number' => '',
                'connection_tech' => 'GPON (FTTH) Fiber',
                'office_address' => '',
            ];
            foreach ($settings as $key => $value) {
                Setting::create(['key' => $key, 'value' => $value]);
            }
        });
    }
}
