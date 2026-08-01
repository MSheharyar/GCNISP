<?php

namespace App\Http\Middleware;

use App\Models\Dealer;
use App\Support\Tenant;
use Closure;
use Illuminate\Http\Request;

/**
 * Blocks a route group unless the current dealer has that module enabled. The
 * super-admin (no dealer) always passes. Defense-in-depth behind the frontend,
 * which already hides disabled modules from the nav.
 */
class EnsureModule
{
    public function handle(Request $request, Closure $next, string $module)
    {
        $user = $request->user();
        if ($user && $user->is_super_admin) {
            return $next($request);
        }

        $dealerId = Tenant::id() ?: $user?->dealer_id;
        $dealer = $dealerId ? Dealer::find($dealerId) : null;

        if ($dealer && ! $dealer->hasModule($module)) {
            abort(403, 'This module is not enabled for your account.');
        }

        return $next($request);
    }
}
