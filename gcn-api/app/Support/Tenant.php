<?php

namespace App\Support;

/**
 * The current dealer (tenant) context. Set once per request by the SetTenant
 * middleware (from the authenticated user), and per-dealer by the sync command.
 * The BelongsToDealer global scope and raw queries read Tenant::id() to isolate
 * every dealer's data.
 */
class Tenant
{
    protected static ?int $id = null;

    public static function set(?int $id): void
    {
        static::$id = $id;
    }

    public static function id(): ?int
    {
        return static::$id;
    }

    public static function check(): bool
    {
        return static::$id !== null;
    }

    public static function forget(): void
    {
        static::$id = null;
    }

    /** Run a callback scoped to a specific dealer, restoring the previous context after. */
    public static function run(int $id, callable $callback)
    {
        $previous = static::$id;
        static::$id = $id;
        try {
            return $callback();
        } finally {
            static::$id = $previous;
        }
    }
}
