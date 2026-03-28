<?php

namespace App\Http\Controllers;

use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /**
     * Admin dashboard with real stats.
     */
    public function dashboard(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalUsers'     => User::count(),
                'pendingDrivers' => User::where('role', 'driver')->where('is_verified', false)->count(),
                'activeListings' => \App\Models\ArtPost::where('is_for_sale', true)->where('is_sold', false)->count(),
                'ordersToday'    => \App\Models\Order::whereDate('created_at', today())->count(),
            ],
        ]);
    }

    /**
     * Show all driver applications (pending first, then approved/rejected).
     */
    public function approvals(Request $request): Response
    {
        $filter = $request->get('filter', 'pending'); // pending | approved | all

        $query = User::where('role', 'driver')
            ->with('driverProfile')
            ->orderByDesc('created_at');

        if ($filter === 'pending') {
            $query->where('is_verified', false);
        } elseif ($filter === 'approved') {
            $query->where('is_verified', true);
        }

        $drivers = $query->paginate(20)->through(function (User $user) {
            $profile = $user->driverProfile;
            return [
                'id'                => $user->id,
                'name'              => $user->name,
                'email'             => $user->email,
                'is_verified'       => $user->is_verified,
                'created_at'        => $user->created_at->toDateTimeString(),
                'phone_number'      => $profile?->phone_number,
                'vehicle_type'      => $profile?->vehicle_type,
                'plate_number'      => $profile?->plate_number,
                'license_number'    => $profile?->license_number,
                'license_expiry'    => $profile?->license_expiry?->toDateString(),
                'city_coverage'     => $profile?->city_coverage,
                'license_image_url' => $this->getLicenseUrl($profile?->license_image_path),
                'verified_at'       => $profile?->verified_at?->toDateTimeString(),
            ];
        });

        return Inertia::render('Admin/Approvals', [
            'drivers' => $drivers,
            'filter'  => $filter,
        ]);
    }

    /**
     * Approve a driver application.
     */
    public function approveDriver(User $user): RedirectResponse
    {
        if ($user->role !== 'driver') {
            abort(404);
        }

        $user->update(['is_verified' => true]);

        $user->driverProfile?->update([
            'is_verified' => true,
            'verified_at' => now(),
        ]);

        return back()->with('success', "{$user->name} has been approved as a driver.");
    }

    /**
     * Reject (un-verify) a driver application.
     */
    public function rejectDriver(User $user): RedirectResponse
    {
        if ($user->role !== 'driver') {
            abort(404);
        }

        $user->update(['is_verified' => false]);

        $user->driverProfile?->update([
            'is_verified' => false,
            'verified_at' => null,
        ]);

        return back()->with('success', "{$user->name}'s driver status has been revoked.");
    }

    /**
     * Safely generate a temporary URL for the license image.
     */
    private function getLicenseUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        try {
            return \Illuminate\Support\Facades\Storage::disk('s3')
                ->temporaryUrl($path, now()->addMinutes(30));
        } catch (\Throwable) {
            // Fallback for drivers that don't support temporaryUrl
            try {
                return \Illuminate\Support\Facades\Storage::disk('s3')->url($path);
            } catch (\Throwable) {
                return null;
            }
        }
    }
}
