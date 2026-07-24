<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'is_active', 'last_active_at', 'dealer_id', 'is_super_admin'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    // NOTE: User intentionally does NOT use BelongsToDealer — login must find a
    // user by email before the tenant is known. Staff listings are scoped
    // explicitly to the current dealer in StaffController.

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_active_at' => 'datetime',
            'is_active' => 'boolean',
            'is_super_admin' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function dealer()
    {
        return $this->belongsTo(Dealer::class);
    }
}
