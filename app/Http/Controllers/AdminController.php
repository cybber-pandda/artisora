<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
                'totalUsers'       => User::count(),
                'pendingDrivers'   => User::where('role', 'driver')->where('is_verified', false)->count(),
                'activeListings'   => \App\Models\ArtPost::where('is_for_sale', true)->where('is_sold', false)->count(),
                'ordersToday'      => \App\Models\Order::whereDate('created_at', today())->count(),
                'activeDeliveries' => \App\Models\Delivery::whereIn('status', ['picked_up', 'in_transit'])->count(),
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

    // ══════════════════════════════════════════════════════════════
    //  ADMIN — Orders
    // ══════════════════════════════════════════════════════════════

    /**
     * List all orders platform-wide with buyer, artist and driver data.
     */
    public function orders(): Response
    {
        $orders = Order::with([
            'buyer',
            'artist.artistProfile',
            'items',
            'delivery.driver.driverProfile',
            'reviews',
        ])
        ->latest()
        ->get()
        ->map(function (Order $order) {
            $delivery = $order->delivery;
            $driver   = $delivery?->driver;

            // Meetup proof URL (S3 signed)
            $proofUrl = null;
            if ($order->meetup_proof_path) {
                try {
                    $proofUrl = \Illuminate\Support\Facades\Storage::disk('s3')
                        ->temporaryUrl($order->meetup_proof_path, now()->addMinutes(30));
                } catch (\Throwable) {}
            }

            return [
                'id'              => $order->id,
                'status'          => $order->status,
                'subtotal'        => $order->subtotal,
                'delivery_method' => $order->delivery_method,
                'payment_method'  => $order->payment_method,
                'created_at'      => $order->created_at->toDateTimeString(),
                'buyer_name'      => $order->full_name,
                'buyer_email'     => $order->email,
                'buyer_phone'     => $order->phone_number,
                'buyer_address'   => implode(', ', array_filter([
                    $order->address_line, $order->city,
                    $order->province, $order->postal_code,
                ])),
                'artist_name'  => $order->artist?->artistProfile?->display_name ?? $order->artist?->name,
                'artist_email' => $order->artist?->email,
                'has_delivery' => (bool) $delivery,
                'items'        => $order->items->map(fn($i) => [
                    'title' => $i->title,
                    'price' => $i->price,
                ]),
                'driver' => $driver ? [
                    'name'         => $driver->name,
                    'email'        => $driver->email,
                    'phone'        => $driver->driverProfile?->phone_number,
                    'vehicle_type' => $driver->driverProfile?->vehicle_type,
                    'plate_number' => $driver->driverProfile?->plate_number,
                ] : null,
                // Meetup proof + experience
                'meetup_proof_url'         => $proofUrl,
                'meetup_proof_at'          => $order->meetup_proof_at?->toDateTimeString(),
                'meetup_completed_at'      => $order->meetup_completed_at?->toDateTimeString(),
                'meetup_experience_rating' => $order->meetup_experience_rating,
                'meetup_experience_comment'=> $order->meetup_experience_comment,
                // Product review
                'review' => $order->reviews->first() ? [
                    'rating'  => $order->reviews->first()->rating,
                    'comment' => $order->reviews->first()->comment,
                ] : null,
            ];
        });

        return Inertia::render('Admin/Orders', [
            'orders' => $orders,
            'counts' => [
                'total'     => $orders->count(),
                'pending'   => $orders->where('status', 'pending')->count(),
                'confirmed' => $orders->where('status', 'confirmed')->count(),
                'shipped'   => $orders->where('status', 'shipped')->count(),
            ],
        ]);
    }

    /**
     * Admin live tracking view — shows map + buyer + artist + driver.
     */
    public function adminTrackingView(Order $order): Response
    {
        $delivery = $order->delivery;
        abort_if(!$delivery, 404, 'No delivery found for this order.');

        $order->load(['buyer', 'artist.artistProfile', 'items']);
        $delivery->load('driver.driverProfile');

        $driver = $delivery->driver;

        return Inertia::render('Admin/TrackOrder', [
            'order' => [
                'id'           => $order->id,
                'delivery_lat' => $order->delivery_lat,
                'delivery_lng' => $order->delivery_lng,
                'items'        => $order->items->map(fn($i) => [
                    'title' => $i->title,
                    'price' => $i->price,
                ]),
            ],
            'delivery' => [
                'id'                   => $delivery->id,
                'status'               => $delivery->status,
                'type'                 => $delivery->type,
                'dimensions'           => $delivery->dimensions,
                'weight'               => $delivery->weight,
                'buffer_time'          => $delivery->buffer_time,
                'pickup_lat'           => $delivery->pickup_lat,
                'pickup_lng'           => $delivery->pickup_lng,
                'dropoff_lat'          => $delivery->dropoff_lat,
                'dropoff_lng'          => $delivery->dropoff_lng,
                'driver_lat'           => $delivery->driver_lat,
                'driver_lng'           => $delivery->driver_lng,
                'estimated_arrival_at' => $delivery->estimated_arrival_at?->toIso8601String(),
                'adjusted_eta'         => $delivery->adjustedEta(),
                'driver'               => $driver ? [
                    'name'         => $driver->name,
                    'vehicle_type' => $driver->driverProfile?->vehicle_type,
                    'plate_number' => $driver->driverProfile?->plate_number,
                ] : null,
            ],
            'buyer' => [
                'name'    => $order->full_name,
                'email'   => $order->email,
                'phone'   => $order->phone_number,
                'address' => implode(', ', array_filter([
                    $order->address_line, $order->city,
                    $order->province, $order->postal_code,
                ])),
            ],
            'artist' => [
                'name'  => $order->artist?->artistProfile?->display_name ?? $order->artist?->name,
                'email' => $order->artist?->email,
                'phone' => $order->artist?->phone_number,
                'city'  => $order->artist?->artistProfile?->city_coverage,
            ],
            'driver' => $driver ? [
                'name'         => $driver->name,
                'email'        => $driver->email,
                'phone'        => $driver->driverProfile?->phone_number,
                'vehicle_type' => $driver->driverProfile?->vehicle_type,
                'plate_number' => $driver->driverProfile?->plate_number,
            ] : null,
        ]);
    }

    /**
     * Admin polls live driver position (no buyer/artist ownership check needed).
     */
    public function adminPollLocation(Delivery $delivery): JsonResponse
    {
        return response()->json([
            'driver_lat'           => $delivery->driver_lat,
            'driver_lng'           => $delivery->driver_lng,
            'status'               => $delivery->status,
            'estimated_arrival_at' => $delivery->estimated_arrival_at?->toIso8601String(),
            'adjusted_eta'         => $delivery->adjustedEta(),
        ]);
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
