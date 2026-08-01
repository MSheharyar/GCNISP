<?php

namespace App\Models;

use App\Models\Concerns\BelongsToDealer;
use Illuminate\Database\Eloquent\Model;

class MonthlyTopup extends Model
{
    use BelongsToDealer;

    protected $guarded = [];

    protected $casts = ['captured_at' => 'datetime'];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
