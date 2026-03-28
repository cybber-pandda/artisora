<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;

class RedirectController
{
    public static function redirectBasedOnRole(User $user): string
    {
        return match(true) {
            $user->isAdmin()                         => '/admin/dashboard',
            $user->isArtist()                        => '/artist/portfolio',
            $user->isBuyer()                         => '/buyer/shop',
            $user->isDriver() && !$user->is_verified => '/driver/pending',
            $user->isDriver() && $user->is_verified  => '/driver/jobs',
            default                                  => '/dashboard',
        };
    }
}