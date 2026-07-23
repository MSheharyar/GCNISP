<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CableCustomer extends Model
{
    protected $guarded = [];

    protected $casts = ['last_paid_date' => 'date'];

    public function payments()
    {
        return $this->hasMany(CablePayment::class);
    }
}
