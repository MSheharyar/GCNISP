<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class CablePayment extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    protected $casts = ['date' => 'date'];
}
