<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ArtPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    // ── ARTIST: View all orders for their listings ───────────────
    public function artistIndex(): Response
    {
        $artist = Auth::user();

        $orders = Order::with(['buyer', 'items.artPost'])
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
        $orders = Order::with(['items.artPost.media', 'artist.artistProfile', 'delivery'])
            ->where('buyer_id', Auth::id())
            ->latest()
            ->get()
            ->map(fn ($o) => $this->formatOrderForBuyer($o));


        return Inertia::render('Buyer/Orders', [
            'orders' => $orders,
        ]);
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
            'items' => $order->items->map(fn ($i) => [
                'title'     => $i->title,
                'price'     => (float) $i->price,
                'thumbnail' => $i->artPost?->media->where('type', 'image')->first()?->url,
            ]),
        ];
    }

}
