<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class CableCustomer extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    protected $casts = ['last_paid_date' => 'date'];

    public function payments()
    {
        return $this->hasMany(CablePayment::class);
    }
}
