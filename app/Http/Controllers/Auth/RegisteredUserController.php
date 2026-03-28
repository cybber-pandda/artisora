<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Redirect Breeze's default /register GET to our role selection page.
     * The POST /register from auth.php is no longer used — our new routes
     * in web.php handle /register/buyer, /register/artist, /register/driver.
     */
    public function create(): Response|RedirectResponse
    {
        return redirect()->route('register');
    }

    public function store(Request $request): RedirectResponse
    {
        // Not used — kept to satisfy Breeze's auth.php route binding.
        return redirect()->route('register');
    }
}