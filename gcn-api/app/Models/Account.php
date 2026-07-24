<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class Account extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }
}
