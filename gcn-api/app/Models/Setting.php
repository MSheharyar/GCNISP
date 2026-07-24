<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class Setting extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    public $timestamps = true;
}
