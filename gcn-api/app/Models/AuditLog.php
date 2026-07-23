<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['changes' => 'array', 'created_at' => 'datetime'];

    public static function record(Request $request, string $action, string $entity, ?int $entityId, array $changes = []): void
    {
        self::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'changes' => $changes,
            'ip' => $request->ip(),
            'created_at' => now(),
        ]);
    }
}
