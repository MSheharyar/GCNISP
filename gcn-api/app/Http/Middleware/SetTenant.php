<?php

namespace App\Http\Middleware;

use App\Support\Tenant;
use Closure;
use Illuminate\Http\Request;

/**
 * Sets the current dealer (tenant) from the authenticated user, so every scoped
 * query is isolated to that dealer. Runs after auth:sanctum. Super-admin users
 * (no dealer) leave the tenant unset — they operate across dealers explicitly.
 * A suspended dealer is blocked from the API (billing gate).
 */
class SetTenant
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user && $user->dealer_id) {
            $dealer = $user->dealer;
            if ($dealer && ! $dealer->isActive()) {
                return response()->json([
                    'message' => 'This account is suspended. Please contact your provider.',
                ], 403);
            }
            Tenant::set($user->dealer_id);
        }

        return $next($request);
    }
}
