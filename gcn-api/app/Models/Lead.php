<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Public SaaS lead. Intentionally NOT tenant-scoped (owner-level).
class Lead extends Model
{
    protected $guarded = [];
}
