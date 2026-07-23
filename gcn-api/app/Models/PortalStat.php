<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortalStat extends Model
{
    protected $guarded = [];

    protected $casts = ['captured_at' => 'datetime', 'packages' => 'array'];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
