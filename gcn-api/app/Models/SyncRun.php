<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncRun extends Model
{
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
