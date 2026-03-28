<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    // ── Views ────────────────────────────────────────────────────

    public function showRoleSelection(): Response
    {
        return Inertia::render('Auth/RoleSelection');
    }

    public function showBuyerForm(): Response
    {
        return Inertia::render('Auth/RegisterBuyer');
    }

    public function showArtistForm(): Response
    {
        return Inertia::render('Auth/RegisterArtist');
    }

    public function showDriverForm(): Response
    {
        return Inertia::render('Auth/RegisterDriver');
    }

    // ── Store: Buyer ─────────────────────────────────────────────

    public function storeBuyer(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'email'        => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users'],
            'password'     => ['required', 'confirmed', Password::defaults()],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'city'         => ['nullable', 'string', 'max:100'],
            'province'     => ['nullable', 'string', 'max:100'],
            'postal_code'  => ['nullable', 'string', 'max:20'],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'        => $validated['name'],
                'email'       => $validated['email'],
                'password'    => Hash::make($validated['password']),
                'role'        => 'buyer',
                'is_verified' => true,
            ]);

            $user->buyerProfile()->create([
                'phone_number' => $validated['phone_number'] ?? null,
                'address_line' => $validated['address_line'] ?? null,
                'city'         => $validated['city'] ?? null,
                'province'     => $validated['province'] ?? null,
                'postal_code'  => $validated['postal_code'] ?? null,
            ]);

            return $user;
        });

        event(new Registered($user));
        Auth::login($user);

        return redirect(RedirectController::redirectBasedOnRole($user));
    }

    // ── Store: Artist ────────────────────────────────────────────

    public function storeArtist(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'email'            => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users'],
            'password'         => ['required', 'confirmed', Password::defaults()],
            'display_name'     => ['required', 'string', 'max:100'],
            'phone_number'     => ['nullable', 'string', 'max:20'],
            'gcash_number'     => ['nullable', 'string', 'max:20'],
            'bio'              => ['nullable', 'string', 'max:1000'],
            'specialty'        => ['nullable', 'string', 'max:100'],
            'portfolio_url'    => ['nullable', 'url', 'max:255'],
            'instagram_handle' => ['nullable', 'string', 'max:100'],
            'facebook_url'     => ['nullable', 'url', 'max:255'],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'        => $validated['name'],
                'email'       => $validated['email'],
                'password'    => Hash::make($validated['password']),
                'role'        => 'artist',
                'is_verified' => true,
            ]);

            $user->artistProfile()->create([
                'display_name'     => $validated['display_name'],
                'phone_number'     => $validated['phone_number'] ?? null,
                'gcash_number'     => $validated['gcash_number'] ?? null,
                'bio'              => $validated['bio'] ?? null,
                'specialty'        => $validated['specialty'] ?? null,
                'portfolio_url'    => $validated['portfolio_url'] ?? null,
                'instagram_handle' => $validated['instagram_handle'] ?? null,
                'facebook_url'     => $validated['facebook_url'] ?? null,
            ]);

            return $user;
        });

        event(new Registered($user));
        Auth::login($user);

        return redirect(RedirectController::redirectBasedOnRole($user));
    }

    // ── Store: Driver ────────────────────────────────────────────

    public function storeDriver(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'email'          => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users'],
            'password'       => ['required', 'confirmed', Password::defaults()],
            'phone_number'   => ['required', 'string', 'max:20'],
            'vehicle_type'   => ['required', 'string', 'in:motorcycle,car,van'],
            'plate_number'   => ['required', 'string', 'max:20'],
            'license_number' => ['nullable', 'string', 'max:50'],
            'license_expiry' => ['nullable', 'date', 'after:today'],
            'city_coverage'  => ['nullable', 'string', 'max:100'],
            'license_image'  => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $file      = $request->file('license_image');
        $extension = $file->getClientOriginalExtension();
        $filename  = 'license_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $extension;
        $path      = 'driver-licenses/' . $filename;

        Storage::disk('s3')->put($path, file_get_contents($file), 'private');

        $user = DB::transaction(function () use ($validated, $path) {
            $user = User::create([
                'name'        => $validated['name'],
                'email'       => $validated['email'],
                'password'    => Hash::make($validated['password']),
                'role'        => 'driver',
                'is_verified' => false,
            ]);

            $user->driverProfile()->create([
                'phone_number'       => $validated['phone_number'],
                'vehicle_type'       => $validated['vehicle_type'],
                'plate_number'       => strtoupper($validated['plate_number']),
                'license_image_path' => $path,
                'license_number'     => $validated['license_number'] ?? null,
                'license_expiry'     => $validated['license_expiry'] ?? null,
                'city_coverage'      => $validated['city_coverage'] ?? null,
                'is_verified'        => false,
            ]);

            return $user;
        });

        event(new Registered($user));
        Auth::login($user);

        return redirect(RedirectController::redirectBasedOnRole($user));
    }
}