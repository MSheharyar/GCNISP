<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use BelongsToDealer;
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = ['received_date' => 'date', 'is_arrears' => 'boolean'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
