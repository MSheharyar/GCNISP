<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;

class SyncRun extends Model
{
    use BelongsToDealer;
    protected $guarded = [];

    protected $casts = [
        'for_date' => 'date',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function rows()
    {
        return $this->hasMany(SyncRow::class, 'run_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
