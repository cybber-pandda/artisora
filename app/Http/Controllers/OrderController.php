<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Review;
use App\Models\ArtPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    // ── ARTIST: View all orders for their listings ───────────────
    public function artistIndex(): Response
    {
        $artist = Auth::user();

        $orders = Order::with(['buyer', 'items.artPost', 'reviews', 'delivery', 'artist.artistProfile'])
            ->where('artist_id', $artist->id)
            ->latest()
            ->get()
            ->map(fn ($o) => $this->formatOrderForArtist($o));

        $counts = [
            'pending'   => Order::where('artist_id', $artist->id)->where('status', 'pending')->count(),
            'confirmed' => Order::where('artist_id', $artist->id)->where('status', 'confirmed')->count(),
            'total'     => Order::where('artist_id', $artist->id)->count(),
        ];

        return Inertia::render('Artist/Orders', [
            'orders' => $orders,
            'counts' => $counts,
        ]);
    }

    // ── ARTIST: Accept an order ──────────────────────────────────
    public function accept(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);

        abort_if($order->status !== 'pending', 422, 'This order is no longer pending.');

        $order->update([
            'status'       => 'confirmed',
            'responded_at' => now(),
        ]);

        return back()->with('success', "Order #{$order->id} accepted! The buyer will be notified.");
    }

    // ── ARTIST: Decline an order ─────────────────────────────────
    public function decline(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);

        abort_if($order->status !== 'pending', 422, 'This order is no longer pending.');

        $request->validate([
            'decline_reason' => ['required', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($order, $request) {
            $order->update([
                'status'         => 'cancelled',
                'decline_reason' => $request->decline_reason,
                'responded_at'   => now(),
            ]);

            // Restore artworks to available so buyers can purchase them again
            foreach ($order->items as $item) {
                $item->artPost?->update(['is_sold' => false]);
            }
        });

        return back()->with('success', "Order #{$order->id} declined. The artwork has been restored to available.");
    }

    // ── ARTIST: Mark as Shipped ──────────────────────────────────
    public function markShipped(Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);
        abort_if($order->status !== 'confirmed', 422, 'Order must be confirmed before marking as shipped.');

        $order->update(['status' => 'shipped']);
        return back()->with('success', "Order #{$order->id} marked as shipped.");
    }

    // ── BUYER: View their own orders ─────────────────────────────
    public function buyerIndex(): Response
    {
        $orders = Order::with(['items.artPost.media', 'artist.artistProfile', 'delivery', 'reviews'])
            ->where('buyer_id', Auth::id())
            ->latest()
            ->get()
            ->map(fn ($o) => $this->formatOrderForBuyer($o));


        return Inertia::render('Buyer/Orders', [
            'orders' => $orders,
        ]);
    }

    // ── ARTIST: Upload proof-of-handoff photo (meetup or pickup) ──
    public function artistMeetupProof(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);
        abort_if(!in_array($order->delivery_method, ['meetup', 'pickup']), 422, 'Not a meetup or pickup order.');
        abort_if(!in_array($order->status, ['confirmed', 'completed']), 422, 'Order cannot be updated at this stage.');

        $request->validate([
            'proof' => ['required', 'image', 'max:5120'], // 5 MB
        ]);

        $path = $request->file('proof')->store(
            'meetup-proofs',
            's3'
        );

        $order->update([
            'meetup_proof_path' => $path,
            'meetup_proof_at'   => now(),
        ]);

        return back()->with('success', "Proof photo uploaded for Order #{$order->id}. Awaiting buyer confirmation.");
    }

    // ── BUYER: Confirm artwork received + optional review (meetup or pickup) ──
    public function buyerMeetupReceived(Request $request, Order $order): RedirectResponse
    {
        abort_if($order->buyer_id !== Auth::id(), 403, 'Unauthorized.');
        abort_if(!in_array($order->delivery_method, ['meetup', 'pickup']), 422, 'Not a meetup or pickup order.');
        abort_if(!in_array($order->status, ['confirmed', 'completed']), 422, 'Order cannot be completed at this stage.');
        abort_if(!$order->meetup_proof_path, 422, 'Artist has not uploaded proof of handoff yet.');

        $request->validate([
            'rating'                     => ['required', 'integer', 'between:1,5'],
            'comment'                    => ['nullable', 'string', 'max:1000'],
            'photo'                      => ['nullable', 'image', 'max:5120'],
            'meetup_experience_rating'   => ['nullable', 'integer', 'between:1,5'],
            'meetup_experience_comment'  => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($request, $order) {
            // Optional review photo
            $reviewPhotoPath = null;
            if ($request->hasFile('photo')) {
                $reviewPhotoPath = $request->file('photo')->store('review-photos', 's3');
            }

            // Create a product review for each order item
            foreach ($order->items as $item) {
                Review::create([
                    'order_id'      => $order->id,
                    'order_item_id' => $item->id,
                    'art_post_id'   => $item->art_post_id,
                    'buyer_id'      => Auth::id(),
                    'artist_id'     => $order->artist_id,
                    'rating'        => $request->rating,
                    'comment'       => $request->comment,
                    'photo_path'    => $reviewPhotoPath,
                ]);
            }

            // Complete the order
            $order->update([
                'status'                     => 'completed',
                'meetup_completed_at'        => now(),
                'meetup_experience_rating'   => $request->meetup_experience_rating,
                'meetup_experience_comment'  => $request->meetup_experience_comment,
            ]);
        });

        return back()->with('success', "Order #{$order->id} marked as received! Thank you for your review.");
    }

    // ── BUYER: Confirm delivery received + optional review ───────
    public function buyerDeliveryReceived(Request $request, Order $order): RedirectResponse
    {
        abort_if($order->buyer_id !== Auth::id(), 403, 'Unauthorized.');
        abort_if($order->delivery_method !== 'delivery', 422, 'Not a delivery order.');
        abort_if(!in_array($order->status, ['shipped', 'completed']), 422, 'Order cannot be completed at this stage.');

        // Ensure driver has uploaded proof
        $delivery = $order->delivery;
        abort_if(!$delivery || !$delivery->proof_path, 422, 'Driver has not uploaded proof of delivery yet.');

        $request->validate([
            'rating'                       => ['required', 'integer', 'between:1,5'],
            'comment'                      => ['nullable', 'string', 'max:1000'],
            'photo'                        => ['nullable', 'image', 'max:5120'],
            'delivery_experience_rating'   => ['nullable', 'integer', 'between:1,5'],
            'delivery_experience_comment'  => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($request, $order) {
            // Optional review photo
            $reviewPhotoPath = null;
            if ($request->hasFile('photo')) {
                $reviewPhotoPath = $request->file('photo')->store('review-photos', 's3');
            }

            // Create a product review for each order item
            foreach ($order->items as $item) {
                Review::create([
                    'order_id'      => $order->id,
                    'order_item_id' => $item->id,
                    'art_post_id'   => $item->art_post_id,
                    'buyer_id'      => Auth::id(),
                    'artist_id'     => $order->artist_id,
                    'rating'        => $request->rating,
                    'comment'       => $request->comment,
                    'photo_path'    => $reviewPhotoPath,
                ]);
            }

            // Complete the order
            $order->update([
                'status'                       => 'completed',
                'delivery_completed_at'        => now(),
                'delivery_experience_rating'   => $request->delivery_experience_rating,
                'delivery_experience_comment'  => $request->delivery_experience_comment,
            ]);
        });

        return back()->with('success', "Order #{$order->id} marked as received! Thank you for your review.");
    }

    // ── Helper: authorize artist owns this order ─────────────────
    private function authorizeArtist(Order $order): void
    {
        abort_if($order->artist_id !== Auth::id(), 403, 'Unauthorized.');
    }

    // ── Helper: format order for artist view ─────────────────────
    private function formatOrderForArtist(Order $order): array
    {
        return [
            'id'              => $order->id,
            'status'          => $order->status,
            'decline_reason'  => $order->decline_reason,
            'responded_at'    => $order->responded_at?->toDateTimeString(),
            'created_at'      => $order->created_at->toDateTimeString(),
            'subtotal'        => (float) $order->subtotal,
            'delivery_method' => $order->delivery_method,
            'payment_method'  => $order->payment_method,
            'notes'           => $order->notes,
            'meetup_location' => $order->meetup_location,
            // Meetup negotiation
            'meetup_lat'           => $order->meetup_lat,
            'meetup_lng'           => $order->meetup_lng,
            'meetup_label'         => $order->meetup_label,
            'meetup_note'          => $order->meetup_note,
            'meetup_status'        => $order->meetup_status,
            'meetup_round'         => $order->meetup_round,
            'meetup_proposed_lat'  => $order->meetup_proposed_lat,
            'meetup_proposed_lng'  => $order->meetup_proposed_lng,
            'meetup_proposed_label'=> $order->meetup_proposed_label,
            'meetup_proposal_by'   => $order->meetup_proposal_by,
            'meetup_expires_at'    => $order->meetup_expires_at?->toDateTimeString(),
            // Meetup proof
            'meetup_proof_url'     => $order->meetup_proof_path
                ? Storage::disk('s3')->temporaryUrl($order->meetup_proof_path, now()->addMinutes(30))
                : null,
            'meetup_proof_at'      => $order->meetup_proof_at?->toDateTimeString(),
            'meetup_completed_at'  => $order->meetup_completed_at?->toDateTimeString(),
            'meetup_experience_rating' => $order->meetup_experience_rating,
            // Product review summary
            'review' => $order->reviews->first() ? [
                'rating'  => $order->reviews->first()->rating,
                'comment' => $order->reviews->first()->comment,
            ] : null,
            // Delivery proof (from delivery record)
            'delivery_proof_url' => $order->delivery?->proof_path
                ? Storage::disk('s3')->temporaryUrl($order->delivery->proof_path, now()->addMinutes(30))
                : null,
            'delivery_completed_at' => $order->delivery_completed_at?->toDateTimeString(),
            'buyer' => [
                'name'         => $order->full_name,
                'email'        => $order->email,
                'phone_number' => $order->phone_number,
                'address'      => $order->delivery_method === 'delivery'
                    ? implode(', ', array_filter([
                        $order->address_line, $order->city,
                        $order->province, $order->postal_code,
                    ]))
                    : null,
            ],
            'items' => $order->items->map(fn ($i) => [
                'title'     => $i->title,
                'price'     => (float) $i->price,
                'thumbnail' => $i->artPost?->media->where('type', 'image')->first()?->url,
            ]),
            // Pickup location (from artist profile)
            'pickup_lat'   => $order->artist?->artistProfile?->pickup_lat ?? $order->artist?->artistProfile?->latitude,
            'pickup_lng'   => $order->artist?->artistProfile?->pickup_lng ?? $order->artist?->artistProfile?->longitude,
            'pickup_label' => $order->artist?->artistProfile?->pickup_location_label ?? $order->artist?->artistProfile?->meetup_location_label,
        ];
    }

    // ── Helper: format order for buyer view ──────────────────────
    private function formatOrderForBuyer(Order $order): array
    {
        return [
            'id'              => $order->id,
            'status'          => $order->status,
            'decline_reason'  => $order->decline_reason,
            'responded_at'    => $order->responded_at?->toDateTimeString(),
            'created_at'      => $order->created_at->toDateTimeString(),
            'subtotal'        => (float) $order->subtotal,
            'delivery_method' => $order->delivery_method,
            'payment_method'  => $order->payment_method,
            'notes'           => $order->notes,
            'artist_name'     => $order->artist?->artistProfile?->display_name
                                 ?? $order->artist?->name ?? 'Artist',
            'has_delivery'    => $order->delivery !== null,
            // Meetup negotiation
            'meetup_location'      => $order->meetup_location,
            'meetup_lat'           => $order->meetup_lat,
            'meetup_lng'           => $order->meetup_lng,
            'meetup_label'         => $order->meetup_label,
            'meetup_note'          => $order->meetup_note,
            'meetup_status'        => $order->meetup_status,
            'meetup_round'         => $order->meetup_round,
            'meetup_proposed_lat'  => $order->meetup_proposed_lat,
            'meetup_proposed_lng'  => $order->meetup_proposed_lng,
            'meetup_proposed_label'=> $order->meetup_proposed_label,
            'meetup_proposal_by'   => $order->meetup_proposal_by,
            'meetup_expires_at'    => $order->meetup_expires_at?->toDateTimeString(),
            // Meetup proof
            'meetup_proof_url'     => $order->meetup_proof_path
                ? Storage::disk('s3')->temporaryUrl($order->meetup_proof_path, now()->addMinutes(30))
                : null,
            'meetup_proof_at'      => $order->meetup_proof_at?->toDateTimeString(),
            'meetup_completed_at'  => $order->meetup_completed_at?->toDateTimeString(),
            // Product review (buyer's own)
            'review' => $order->reviews->first() ? [
                'rating'  => $order->reviews->first()->rating,
                'comment' => $order->reviews->first()->comment,
            ] : null,
            'items' => $order->items->map(fn ($i) => [
                'title'     => $i->title,
                'price'     => (float) $i->price,
                'thumbnail' => $i->artPost?->media->where('type', 'image')->first()?->url,
            ]),
            // Delivery proof (from delivery record)
            'delivery_proof_url' => $order->delivery?->proof_path
                ? Storage::disk('s3')->temporaryUrl($order->delivery->proof_path, now()->addMinutes(30))
                : null,
            'delivery_completed_at' => $order->delivery_completed_at?->toDateTimeString(),
            // Pickup location (from artist profile)
            'pickup_lat'   => $order->artist?->artistProfile?->pickup_lat ?? $order->artist?->artistProfile?->latitude,
            'pickup_lng'   => $order->artist?->artistProfile?->pickup_lng ?? $order->artist?->artistProfile?->longitude,
            'pickup_label' => $order->artist?->artistProfile?->pickup_location_label ?? $order->artist?->artistProfile?->meetup_location_label,
        ];
    }

}
