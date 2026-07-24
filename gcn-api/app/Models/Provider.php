<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class Provider extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    public function accounts()
    {
        return $this->hasMany(Account::class);
    }
}
