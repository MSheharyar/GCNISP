<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class PortalStat extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    protected $casts = ['captured_at' => 'datetime', 'packages' => 'array'];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
