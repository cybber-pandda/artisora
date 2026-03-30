<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryController extends Controller
{
    // ══════════════════════════════════════════════════════════════
    //  ARTIST — Dispatch flow
    // ══════════════════════════════════════════════════════════════

    /**
     * Show dispatch options for a confirmed order.
     */
    public function dispatchIndex(Order $order): Response
    {
        $this->authorizeArtist($order);
        abort_if($order->status !== 'confirmed', 422, 'Only confirmed orders can be dispatched.');

        $order->load(['items.artPost', 'buyer']);

        $trustedDrivers = Auth::user()
            ->trustedDrivers()
            ->with('driverProfile')
            ->get()
            ->map(fn($d) => [
                'id'           => $d->id,
                'name'         => $d->name,
                'vehicle_type' => $d->driverProfile?->vehicle_type,
                'plate_number' => $d->driverProfile?->plate_number,
                'city_coverage'=> $d->driverProfile?->city_coverage,
            ]);

        // Pull artwork logistics from first item
        $firstItem = $order->items->first();
        $artPost   = $firstItem?->artPost;

        return Inertia::render('Artist/Dispatch', [
            'order' => [
                'id'              => $order->id,
                'subtotal'        => (float) $order->subtotal,
                'delivery_method' => $order->delivery_method,
                'buyer_name'      => $order->full_name,
                'buyer_address'   => implode(', ', array_filter([
                    $order->address_line, $order->city,
                    $order->province, $order->postal_code,
                ])),
                'delivery_lat'    => $order->delivery_lat,
                'delivery_lng'    => $order->delivery_lng,
                'items' => $order->items->map(fn($i) => [
                    'title'      => $i->title,
                    'dimensions' => $i->artPost?->dimensions,
                    'weight'     => $i->artPost?->weight,
                ]),
            ],

            'artPost' => $artPost ? [
                'dimensions' => $artPost->dimensions,
                'weight'     => $artPost->weight,
            ] : null,
            'trustedDrivers'  => $trustedDrivers,
            'artistCoords'    => [
                'lat' => Auth::user()->artistProfile?->latitude,
                'lng' => Auth::user()->artistProfile?->longitude,
            ],
            'existingDelivery' => $order->delivery ? $order->delivery->id : null,
        ]);
    }

    /**
     * Assign a trusted driver (private job).
     */
    public function assignTrustedDriver(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);
        abort_if($order->status !== 'confirmed', 422, 'Only confirmed orders can be dispatched.');
        abort_if($order->delivery()->exists(), 422, 'A delivery already exists for this order.');

        $request->validate([
            'driver_id'   => ['required', 'integer', 'exists:users,id'],
            'dimensions'  => ['nullable', 'string', 'max:100'],
            'weight'      => ['nullable', 'numeric', 'min:0'],
            'buffer_time' => ['nullable', 'integer', 'min:0', 'max:240'],
            'pickup_lat'  => ['nullable', 'numeric'],
            'pickup_lng'  => ['nullable', 'numeric'],
        ]);

        // Ensure the chosen driver is actually trusted
        abort_unless(
            Auth::user()->trustedDrivers()->where('driver_id', $request->driver_id)->exists(),
            403,
            'That driver is not in your trusted list.'
        );

        Delivery::create([
            'order_id'    => $order->id,
            'artist_id'   => Auth::id(),
            'driver_id'   => $request->driver_id,
            'type'        => 'private',
            'status'      => Delivery::STATUS_PENDING_DRIVER,
            'dimensions'  => $request->dimensions,
            'weight'      => $request->weight,
            'buffer_time' => $request->buffer_time ?? 30,
            'pickup_lat'  => $request->pickup_lat,
            'pickup_lng'  => $request->pickup_lng,
            // Auto-fill dropoff from order's saved buyer coordinates
            'dropoff_lat' => $order->delivery_lat,
            'dropoff_lng' => $order->delivery_lng,
        ]);

        // Mark order as shipped so buyer sees the tracking button
        $order->update(['status' => 'shipped']);

        return redirect()->route('artist.orders')
            ->with('success', "Delivery assigned privately to driver. They will be notified.");

    }

    /**
     * Publish delivery to the freelance marketplace.
     */
    public function publishToFreelance(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);
        abort_if($order->status !== 'confirmed', 422, 'Only confirmed orders can be dispatched.');
        abort_if($order->delivery()->exists(), 422, 'A delivery already exists for this order.');

        $request->validate([
            'dimensions'  => ['nullable', 'string', 'max:100'],
            'weight'      => ['nullable', 'numeric', 'min:0'],
            'buffer_time' => ['nullable', 'integer', 'min:0', 'max:240'],
            'pickup_lat'  => ['nullable', 'numeric'],
            'pickup_lng'  => ['nullable', 'numeric'],
            'dropoff_lat' => ['nullable', 'numeric'],
            'dropoff_lng' => ['nullable', 'numeric'],
        ]);

        Delivery::create([
            'order_id'    => $order->id,
            'artist_id'   => Auth::id(),
            'driver_id'   => null,
            'type'        => 'public',
            'status'      => Delivery::STATUS_SEARCHING,
            'dimensions'  => $request->dimensions,
            'weight'      => $request->weight,
            'buffer_time' => $request->buffer_time ?? 30,
            'pickup_lat'  => $request->pickup_lat,
            'pickup_lng'  => $request->pickup_lng,
            // Auto-fill dropoff from order's saved buyer coordinates
            'dropoff_lat' => $order->delivery_lat,
            'dropoff_lng' => $order->delivery_lng,
        ]);

        // Mark order as shipped so buyer sees the tracking button
        $order->update(['status' => 'shipped']);

        return redirect()->route('artist.orders')
            ->with('success', "Delivery published to the marketplace. Drivers can now claim it.");

    }

    // ══════════════════════════════════════════════════════════════
    //  ARTIST — Trusted Driver Management
    // ══════════════════════════════════════════════════════════════

    public function trustedDriversIndex(): Response
    {
        $trusted = Auth::user()
            ->trustedDrivers()
            ->with('driverProfile')
            ->get()
            ->map(fn($d) => [
                'id'           => $d->id,
                'name'         => $d->name,
                'email'        => $d->email,
                'vehicle_type' => $d->driverProfile?->vehicle_type,
                'plate_number' => $d->driverProfile?->plate_number,
                'city_coverage'=> $d->driverProfile?->city_coverage,
                'is_verified'  => $d->driverProfile?->is_verified,
            ]);

        return Inertia::render('Artist/TrustedDrivers', [
            'trustedDrivers' => $trusted,
        ]);
    }

    /**
     * Search for verified drivers by name or email.
     */
    public function searchDrivers(Request $request): JsonResponse
    {
        $q = $request->get('q', '');

        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $results = User::where('role', 'driver')
            ->whereHas('driverProfile', fn($query) => $query->where('is_verified', true))
            ->where(fn($query) => $query
                ->where('name', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
            )
            ->with('driverProfile')
            ->limit(10)
            ->get()
            ->map(fn($d) => [
                'id'           => $d->id,
                'name'         => $d->name,
                'email'        => $d->email,
                'vehicle_type' => $d->driverProfile?->vehicle_type,
                'plate_number' => $d->driverProfile?->plate_number,
                'city_coverage'=> $d->driverProfile?->city_coverage,
            ]);

        return response()->json($results);
    }

    public function addTrustedDriver(Request $request): RedirectResponse
    {
        $request->validate([
            'driver_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $driver = User::findOrFail($request->driver_id);
        abort_if($driver->role !== 'driver', 422, 'User is not a driver.');

        Auth::user()->trustedDrivers()->syncWithoutDetaching([$request->driver_id]);

        return back()->with('success', "{$driver->name} added to your trusted drivers.");
    }

    public function removeTrustedDriver(User $driver): RedirectResponse
    {
        Auth::user()->trustedDrivers()->detach($driver->id);

        return back()->with('success', "{$driver->name} removed from your trusted list.");
    }

    // ══════════════════════════════════════════════════════════════
    //  DRIVER — Job Board & Claims
    // ══════════════════════════════════════════════════════════════

    /**
     * Public freelance job board — all open deliveries.
     */
    public function jobBoard(): Response
    {
        $jobs = Delivery::where('type', 'public')
            ->where('status', Delivery::STATUS_SEARCHING)
            ->whereNull('driver_id')
            ->with(['order.items', 'artist.artistProfile'])
            ->latest()
            ->get()
            ->map(fn($d) => $this->formatJobCard($d));

        return Inertia::render('Driver/Jobs', [
            'jobs' => $jobs,
        ]);
    }

    /**
     * Driver's own assigned / active jobs (both private + public they claimed).
     */
    public function myJobs(): Response
    {
        $jobs = Delivery::where('driver_id', Auth::id())
            ->with(['order.items', 'artist.artistProfile'])
            ->latest()
            ->get()
            ->map(fn($d) => $this->formatJobCard($d));

        return Inertia::render('Driver/MyJobs', [
            'jobs' => $jobs,
        ]);
    }

    /**
     * Claim a public delivery — uses pessimistic lock to prevent double-claim.
     */
    public function claimDelivery(Delivery $delivery): RedirectResponse
    {
        abort_unless($delivery->isClaimable(), 422, 'This delivery is no longer available.');

        DB::transaction(function () use ($delivery) {
            // Lock the row; if another transaction already grabbed it, this waits and then sees status changed
            $fresh = Delivery::lockForUpdate()->find($delivery->id);

            abort_if(
                $fresh->driver_id !== null || $fresh->status !== Delivery::STATUS_SEARCHING,
                409,
                'Sorry, another driver just claimed this delivery.'
            );

            $fresh->update([
                'driver_id'  => Auth::id(),
                'status'     => Delivery::STATUS_PICKED_UP,
                'claimed_at' => now(),
                // Set ETA to 1.5 hours from now (driver adjusts later)
                'estimated_arrival_at' => now()->addMinutes(90),
            ]);
        });

        // Redirect to the active delivery view
        $delivery->refresh();
        return redirect()->route('driver.active-delivery', $delivery->id)
            ->with('success', 'Delivery claimed! Head over to the pickup location.');
    }

    /**
     * Accept a private assignment.
     */
    public function acceptPrivateJob(Delivery $delivery): RedirectResponse
    {
        abort_if($delivery->driver_id !== Auth::id(), 403, 'Unauthorized.');
        abort_if($delivery->status !== Delivery::STATUS_PENDING_DRIVER, 422, 'Job is no longer pending acceptance.');

        $delivery->update([
            'status'               => Delivery::STATUS_PICKED_UP,
            'claimed_at'           => now(),
            'estimated_arrival_at' => now()->addMinutes(90),
        ]);

        return redirect()->route('driver.active-delivery', $delivery->id)
            ->with('success', 'Job accepted! Head to the pickup location.');
    }

    /**
     * Driver updates live location.
     *
     * Pipeline:
     *  1. Auth check (existing)
     *  2. Validate payload (lat, lng, bearing, accuracy, snap_mode)
     *  3. Rate limit — max 1 update per 3 seconds per delivery (Cache::add)
     *  4. Distance dedup — skip if moved < 5 meters (saves Pusher messages)
     *  5. Persist to DB
     *  6. Fire DriverLocationUpdated event → Pusher → Buyer's Echo listener
     */
    public function updateLocation(Request $request, Delivery $delivery): JsonResponse
    {
        abort_if($delivery->driver_id !== Auth::id(), 403);

        $request->validate([
            'lat'       => ['required', 'numeric', 'between:-90,90'],
            'lng'       => ['required', 'numeric', 'between:-180,180'],
            'raw_lat'   => ['nullable', 'numeric', 'between:-90,90'],
            'raw_lng'   => ['nullable', 'numeric', 'between:-180,180'],
            'bearing'   => ['nullable', 'numeric', 'between:0,360'],
            'accuracy'  => ['nullable', 'numeric', 'min:0'],
            'snap_mode' => ['nullable', 'string', 'in:snapped,offroad'],
        ]);

        // ── Rate limit: max 1 update per 3 seconds per delivery ──
        $throttleKey = "loc_throttle:{$delivery->id}";
        if (! Cache::add($throttleKey, true, 3)) {
            return response()->json(['ok' => true, 'throttled' => true]);
        }

        // ── Distance-based deduplication: skip if < 5 meters ──
        $cacheKey = "loc_last:{$delivery->id}";
        $lastPos  = Cache::get($cacheKey);

        $shouldBroadcast = true;
        if ($lastPos) {
            $dist = $this->haversineMeters(
                $lastPos['lat'], $lastPos['lng'],
                $request->lat, $request->lng
            );
            if ($dist < 5) {
                $shouldBroadcast = false; // Save Pusher messages
            }
        }

        // Always cache the latest position (5 min TTL)
        Cache::put($cacheKey, ['lat' => $request->lat, 'lng' => $request->lng], 300);

        // ── Persist to database ──
        $delivery->update([
            'driver_lat'     => $request->lat,
            'driver_lng'     => $request->lng,
            'raw_driver_lat' => $request->raw_lat ?? $request->lat,
            'raw_driver_lng' => $request->raw_lng ?? $request->lng,
        ]);

        // ── Broadcast to buyer via Pusher (only if moved significantly) ──
        if ($shouldBroadcast) {
            $orderId = $delivery->order_id;

            event(new \App\Events\DriverLocationUpdated(
                orderId:  $orderId,
                latitude:  (float) $request->lat,
                longitude: (float) $request->lng,
                bearing:   (float) ($request->bearing ?? 0),
                accuracy:  (float) ($request->accuracy ?? 0),
                snapMode:  $request->snap_mode ?? 'snapped',
            ));
        }

        return response()->json([
            'ok'        => true,
            'broadcast' => $shouldBroadcast,
        ]);
    }

    /**
     * Driver's active delivery detail view — shown after claiming.
     */
    public function activeDelivery(Delivery $delivery): Response
    {
        abort_if($delivery->driver_id !== Auth::id(), 403, 'Unauthorized.');

        $delivery->load(['order.items.artPost', 'artist.artistProfile', 'order.buyer']);

        $order = $delivery->order;

        return Inertia::render('Driver/ActiveDelivery', [
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
                'claimed_at'           => $delivery->claimed_at?->toIso8601String(),
                'picked_up_at'         => $delivery->picked_up_at?->toIso8601String(),
                'delivered_at'         => $delivery->delivered_at?->toIso8601String(),
            ],
            'order' => [
                'id'             => $order->id,
                'buyer_name'     => $order->full_name,
                'buyer_phone'    => $order->phone_number,
                'delivery_method'=> $order->delivery_method,
                'address'        => implode(', ', array_filter([
                    $order->address_line, $order->city,
                    $order->province, $order->postal_code,
                ])),
                'delivery_lat'   => $order->delivery_lat,
                'delivery_lng'   => $order->delivery_lng,
                'items' => $order->items->map(fn($i) => [
                    'title'      => $i->title,
                    'dimensions' => $i->artPost?->dimensions,
                    'weight'     => $i->artPost?->weight,
                    'thumbnail'  => $i->artPost?->cover_image
                        ? \Illuminate\Support\Facades\Storage::disk('s3')->temporaryUrl($i->artPost->cover_image, now()->addHour())
                        : null,
                ]),
            ],
            'artist' => [
                'name'    => $delivery->artist?->artistProfile?->display_name ?? $delivery->artist?->name,
                'address' => $delivery->artist?->artistProfile?->city_coverage ?? 'Artist Location',
                'lat'     => $delivery->artist?->artistProfile?->latitude,
                'lng'     => $delivery->artist?->artistProfile?->longitude,
            ],
        ]);
    }

    /**
     * Driver marks artwork as in transit (just confirmed pickup from artist).
     */
    public function markInTransit(Delivery $delivery): RedirectResponse
    {
        abort_if($delivery->driver_id !== Auth::id(), 403);
        abort_if($delivery->status !== Delivery::STATUS_PICKED_UP, 422, 'Must be in picked_up status first.');

        $delivery->update([
            'status'       => Delivery::STATUS_IN_TRANSIT,
            'picked_up_at' => now(),
        ]);

        return redirect()->route('driver.active-delivery', $delivery->id)
            ->with('success', 'Artwork picked up! GPS tracking started. Head to the buyer now.');
    }

    /**
     * Driver marks delivery as completed.
     */
    public function markDelivered(Delivery $delivery): RedirectResponse
    {
        abort_if($delivery->driver_id !== Auth::id(), 403);
        abort_if(!in_array($delivery->status, [Delivery::STATUS_IN_TRANSIT, Delivery::STATUS_PICKED_UP]), 422, 'Cannot mark as delivered yet.');

        $delivery->update([
            'status'       => Delivery::STATUS_DELIVERED,
            'delivered_at' => now(),
        ]);

        // Also mark the order as completed for the buyer
        $delivery->order->update(['status' => 'completed']);

        return redirect()->route('driver.active-delivery', $delivery->id)
            ->with('success', '🎉 Delivery completed! Great work.');
    }


    // ══════════════════════════════════════════════════════════════
    //  BUYER — Live Tracking
    // ══════════════════════════════════════════════════════════════

    public function trackingView(Order $order): Response
    {
        abort_if($order->buyer_id !== Auth::id(), 403);

        $delivery = $order->delivery;
        abort_if(!$delivery, 404, 'No delivery found for this order.');

        $delivery->load('driver.driverProfile');

        return Inertia::render('Buyer/TrackOrder', [
            'order' => [
                'id'           => $order->id,
                'buyer_name'   => $order->full_name,
                'address'      => implode(', ', array_filter([
                    $order->address_line, $order->city,
                    $order->province, $order->postal_code,
                ])),
                'delivery_lat' => $order->delivery_lat,
                'delivery_lng' => $order->delivery_lng,
            ],
            'delivery' => $this->formatDeliveryForBuyer($delivery),
        ]);
    }

    /**
     * Buyer polls driver location (JSON endpoint).
     */
    public function pollLocation(Delivery $delivery): JsonResponse
    {
        // Ensure the buyer owns the order
        abort_if($delivery->order->buyer_id !== Auth::id(), 403);

        return response()->json([
            'driver_lat'           => $delivery->driver_lat,
            'driver_lng'           => $delivery->driver_lng,
            'raw_driver_lat'       => $delivery->raw_driver_lat,
            'raw_driver_lng'       => $delivery->raw_driver_lng,
            'status'               => $delivery->status,
            'estimated_arrival_at' => $delivery->estimated_arrival_at?->toIso8601String(),
            'adjusted_eta'         => $delivery->adjustedEta(),
        ]);
    }

    // ════════════════════════════════════════════════════════════
    //  ARTIST — Live Tracking View
    // ════════════════════════════════════════════════════════════

    /**
     * Show the artist their own dispatched order on a live map.
     */
    public function artistTrackingView(Order $order): Response
    {
        $this->authorizeArtist($order);

        $delivery = $order->delivery;
        abort_if(!$delivery, 404, 'No delivery found for this order.');

        $delivery->load('driver.driverProfile');

        return Inertia::render('Artist/TrackOrder', [
            'order' => [
                'id'           => $order->id,
                'buyer_name'   => $order->full_name,
                'address'      => implode(', ', array_filter([
                    $order->address_line, $order->city,
                    $order->province, $order->postal_code,
                ])),
                'delivery_lat' => $order->delivery_lat,
                'delivery_lng' => $order->delivery_lng,
            ],
            'delivery' => $this->formatDeliveryForBuyer($delivery),
        ]);
    }

    /**
     * Artist polls driver location (JSON endpoint).
     */
    public function artistPollLocation(Delivery $delivery): JsonResponse
    {
        // Ensure the artist owns the order
        abort_if($delivery->artist_id !== Auth::id(), 403);

        return response()->json([
            'driver_lat'           => $delivery->driver_lat,
            'driver_lng'           => $delivery->driver_lng,
            'status'               => $delivery->status,
            'estimated_arrival_at' => $delivery->estimated_arrival_at?->toIso8601String(),
            'adjusted_eta'         => $delivery->adjustedEta(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  Private helpers
    // ══════════════════════════════════════════════════════════════

    private function authorizeArtist(Order $order): void
    {
        abort_if($order->artist_id !== Auth::id(), 403, 'Unauthorized.');
    }

    private function formatJobCard(Delivery $d): array
    {
        $item = $d->order?->items?->first();

        return [
            'id'                   => $d->id,
            'order_id'             => $d->order_id,
            'type'                 => $d->type,
            'status'               => $d->status,
            'dimensions'           => $d->dimensions,
            'weight'               => $d->weight,
            'buffer_time'          => $d->buffer_time,
            'pickup_lat'           => $d->pickup_lat,
            'pickup_lng'           => $d->pickup_lng,
            'dropoff_lat'          => $d->dropoff_lat,
            'dropoff_lng'          => $d->dropoff_lng,
            'artist_name'          => $d->artist?->artistProfile?->display_name ?? $d->artist?->name,
            'artist_city'          => $d->artist?->artistProfile?->city_coverage ?? '-',
            'artwork_title'        => $item?->title ?? 'Artwork',
            'estimated_arrival_at' => $d->estimated_arrival_at?->toIso8601String(),
            'adjusted_eta'         => $d->adjustedEta(),
            'claimed_at'           => $d->claimed_at?->toIso8601String(),
            'created_at'           => $d->created_at->toDateTimeString(),
        ];
    }

    /**
     * Calculate distance between two coordinates in meters using the Haversine formula.
     */
    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371000; // Earth radius in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2)
           + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
           * sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $R * $c;
    }

    private function formatDeliveryForBuyer(Delivery $d): array
    {
        return [
            'id'                   => $d->id,
            'status'               => $d->status,
            'type'                 => $d->type,
            'dimensions'           => $d->dimensions,
            'weight'               => $d->weight,
            'buffer_time'          => $d->buffer_time,
            'pickup_lat'           => $d->pickup_lat,
            'pickup_lng'           => $d->pickup_lng,
            'dropoff_lat'          => $d->dropoff_lat,
            'dropoff_lng'          => $d->dropoff_lng,
            'driver_lat'           => $d->driver_lat,
            'driver_lng'           => $d->driver_lng,
            'estimated_arrival_at' => $d->estimated_arrival_at?->toIso8601String(),
            'adjusted_eta'         => $d->adjustedEta(),
            'picked_up_at'         => $d->picked_up_at?->toIso8601String(),
            'delivered_at'         => $d->delivered_at?->toIso8601String(),
            'driver' => $d->driver ? [
                'name'         => $d->driver->name,
                'vehicle_type' => $d->driver->driverProfile?->vehicle_type,
                'plate_number' => $d->driver->driverProfile?->plate_number,
            ] : null,
        ];
    }
}
