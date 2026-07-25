<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class Invoice extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    protected $casts = ['line_items' => 'array', 'issue_date' => 'date', 'valid_until' => 'date'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
