<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dealer extends Model
{
    protected $guarded = [];

    protected $casts = ['enabled_modules' => 'array'];

    /**
     * Toggleable feature modules. Dashboard + Settings are always-on core and are
     * intentionally NOT here. Keep in sync with the frontend module registry.
     */
    public const MODULES = [
        'internet',    // Customers, Charged Today, Recovery, Log Charge, Quick Payment
        'monthly',     // Monthly Register
        'sync',        // Portal Sync (Connect Sync)
        'invoices',    // Commercial Invoices
        'quotations',  // Quotations
        'cable',       // TV Cable
        'cashbook',    // Cash Book
        'expenses',    // Expenses (Kharcha)
        'reports',     // Reports
        'topups',      // Top-up received
        'staff',       // Staff Management
    ];

    /** Enabled modules, defaulting to all when unset. */
    public function modules(): array
    {
        return $this->enabled_modules ?? self::MODULES;
    }

    public function hasModule(string $key): bool
    {
        return in_array($key, $this->modules(), true);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['active', 'trial'], true);
    }
}
