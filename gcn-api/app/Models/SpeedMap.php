<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class SpeedMap extends Model
{
    use BelongsToDealer;
    protected $guarded = [];
}
