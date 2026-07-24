<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToDealer;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use BelongsToDealer;
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = ['outstanding_balance' => 'integer'];

    public function subscription()
    {
        return $this->hasOne(Subscription::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'current_account_id');
    }

    public function package()
    {
        return $this->belongsTo(Package::class, 'current_package_id');
    }

    public function charges()
    {
        return $this->hasMany(Charge::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
