<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CablePayment extends Model
{
    protected $guarded = [];

    protected $casts = ['date' => 'date'];
}
