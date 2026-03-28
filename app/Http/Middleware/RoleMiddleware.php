<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Usage: middleware('role:admin')  or  middleware('role:admin,artist')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        if (!in_array($user->role, $roles)) {
            abort(403, 'Unauthorized.');
        }

        // Unverified drivers can only access /driver/pending
        if ($user->isDriver() && !$user->is_verified) {
            if (!$request->routeIs('driver.pending')) {
                return redirect()->route('driver.pending');
            }
        }

        return $next($request);
    }
}