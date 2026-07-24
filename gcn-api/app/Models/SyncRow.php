<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class SyncRow extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    protected $casts = [
        'payment_settled' => 'boolean',
        'recharged_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'matched_customer_id');
    }
}
