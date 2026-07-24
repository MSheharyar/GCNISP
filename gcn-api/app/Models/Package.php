<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class Package extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    protected $casts = ['is_active' => 'boolean'];
}
