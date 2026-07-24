<?php

namespace App\Support;

use App\Models\Package;
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
