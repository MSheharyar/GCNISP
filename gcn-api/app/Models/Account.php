<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class Account extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    // Portal login is stored encrypted at rest (never returned to the client).
    protected $casts = [
        'portal_username' => 'encrypted',
        'portal_password' => 'encrypted',
        'portal_enabled' => 'boolean',
    ];

    protected $hidden = ['portal_username', 'portal_password'];

    /** Does this account have its own stored portal credentials, ready to sync? */
    public function hasPortalCredentials(): bool
    {
        return $this->portal_enabled && $this->portal_source && filled($this->portal_username);
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }
}
