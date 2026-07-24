<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;
use Illuminate\Database\Eloquent\SoftDeletes;

class Charge extends Model
{
    use BelongsToDealer;
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = ['charge_date' => 'date'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
