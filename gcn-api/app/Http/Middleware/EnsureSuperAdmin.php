<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Restricts a route to the SaaS owner (super-admin) — the only person who can
 * create dealers, approve their admins, and suspend/activate accounts.
 */
class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user()?->is_super_admin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}
