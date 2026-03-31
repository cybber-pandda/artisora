<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    // ── Show checkout page ─────────────────────────────────────────────
    public function show(): Response|\Illuminate\Http\RedirectResponse
    {
        $user    = Auth::user()->load('buyerProfile');
        $profile = $user->buyerProfile;

        $cartItems = CartItem::with(['artPost.media', 'artPost.user.artistProfile'])
            ->where('user_id', $user->id)
            ->get()
            ->map(fn ($ci) => [
                'art_post_id' => $ci->artPost->id,
                'title'       => $ci->artPost->title,
                'price'       => (float) $ci->artPost->price,
                'thumbnail'   => $ci->artPost->media->where('type', 'image')->first()?->url ?? null,
                'is_sold'     => $ci->artPost->is_sold,
                'artist_id'   => $ci->artPost->user_id,
            ]);

        // If cart is empty redirect back
        if ($cartItems->isEmpty()) {
            return redirect()->route('buyer.cart')->with('error', 'Your cart is empty.');
        }

        $subtotal = $cartItems->sum('price');

        // Fetch primary artist's meet-up anchor (single-artist checkout)
        $primaryArtistId = $cartItems->first()['artist_id'] ?? null;
        $artistMeetup    = null;
        $artistPickup    = null;
        if ($primaryArtistId) {
            $artistProfile = \App\Models\User::find($primaryArtistId)?->artistProfile;
            if ($artistProfile?->hasMeetupLocation()) {
                $artistMeetup = [
                    'lat'    => $artistProfile->latitude,
                    'lng'    => $artistProfile->longitude,
                    'label'  => $artistProfile->meetup_location_label,
                    'radius' => $artistProfile->meetup_radius_km,
                ];
            }
            if ($artistProfile?->hasPickupLocation()) {
                $artistPickup = [
                    'label' => $artistProfile->pickup_location_label,
                ];
            }
        }

        return Inertia::render('Buyer/Checkout', [
            'cartItems'    => $cartItems,
            'subtotal'     => $subtotal,
            'artistMeetup' => $artistMeetup,
            'artistPickup' => $artistPickup,
            'prefill'      => [
                'full_name'    => $user->name,
                'email'        => $user->email,
                'phone_number' => $profile?->phone_number ?? '',
                'gcash_number' => $profile?->gcash_number ?? '',
                'address_line' => $profile?->address_line ?? '',
                'city'         => $profile?->city ?? '',
                'province'     => $profile?->province ?? '',
                'postal_code'  => $profile?->postal_code ?? '',
            ],
        ]);
    }

    // ── Process checkout ─────────────────────────────────────────
    public function store(Request $request): RedirectResponse
    {
        $rules = [
            'full_name'       => ['required', 'string', 'max:255'],
            'email'           => ['required', 'email', 'max:255'],
            'phone_number'    => ['required', 'string', 'max:20'],
            'delivery_method' => ['required', 'in:meetup,delivery,pickup'],
            'payment_method'  => ['required', 'in:gcash,cod'],
            'notes'           => ['nullable', 'string', 'max:1000'],
        ];

        // Conditional delivery fields
        if ($request->delivery_method === 'delivery') {
            $rules['address_line']  = ['required', 'string', 'max:255'];
            $rules['city']         = ['required', 'string', 'max:100'];
            $rules['province']     = ['required', 'string', 'max:100'];
            $rules['postal_code']  = ['required', 'string', 'max:20'];
            $rules['delivery_lat'] = ['nullable', 'numeric', 'between:-90,90'];
            $rules['delivery_lng'] = ['nullable', 'numeric', 'between:-180,180'];
        }


        if ($request->delivery_method === 'meetup') {
            $rules['meetup_lat']           = ['nullable', 'numeric', 'between:-90,90'];
            $rules['meetup_lng']           = ['nullable', 'numeric', 'between:-180,180'];
            $rules['meetup_label']         = ['required', 'string', 'max:255'];
            $rules['meetup_note']          = ['nullable', 'string', 'max:500'];
            $rules['used_artist_default']  = ['nullable', 'boolean'];
            // Legacy: keep meetup_location for backward compat display
            $rules['meetup_location']      = ['nullable', 'string', 'max:255'];
        }

        // GCash number required if paying via GCash
        if ($request->payment_method === 'gcash') {
            $rules['gcash_number'] = ['required', 'string', 'regex:/^09[0-9]{9}$/'];
        }

        $validated = $request->validate($rules);

        $user      = Auth::user();
        $cartItems = CartItem::with(['artPost.user'])
            ->where('user_id', $user->id)
            ->get();

        if ($cartItems->isEmpty()) {
            return back()->withErrors(['cart' => 'Your cart is empty.']);
        }

        // Ensure no sold items slipped through
        $soldTitles = $cartItems->filter(fn ($ci) => $ci->artPost->is_sold)->pluck('artPost.title');
        if ($soldTitles->isNotEmpty()) {
            return back()->withErrors(['cart' => 'Some items are already sold: ' . $soldTitles->join(', ')]);
        }

        $subtotal = $cartItems->sum(fn ($ci) => $ci->artPost->price);
        // Derive artist_id from the first cart item (single-artist checkout for now)
        $artistId = $cartItems->first()->artPost->user_id;

        DB::transaction(function () use ($user, $validated, $cartItems, $subtotal, $artistId) {
            $order = Order::create([
                'buyer_id'        => $user->id,
                'artist_id'       => $artistId,
                'full_name'       => $validated['full_name'],
                'email'           => $validated['email'],
                'phone_number'    => $validated['phone_number'],
                'delivery_method' => $validated['delivery_method'],
                'address_line'    => $validated['address_line'] ?? null,
                'city'            => $validated['city'] ?? null,
                'province'        => $validated['province'] ?? null,
                'postal_code'     => $validated['postal_code'] ?? null,
                'delivery_lat'    => $validated['delivery_lat'] ?? null,
                'delivery_lng'    => $validated['delivery_lng'] ?? null,
                'meetup_location'  => $validated['meetup_label']   ?? $validated['meetup_location'] ?? null,
                'meetup_lat'       => $validated['meetup_lat']       ?? null,
                'meetup_lng'       => $validated['meetup_lng']       ?? null,
                'meetup_label'     => $validated['meetup_label']     ?? null,
                'meetup_note'      => $validated['meetup_note']      ?? null,
                // Determine negotiation status at order creation time
                'meetup_status'    => ($validated['used_artist_default'] ?? true)
                    ? 'agreed'
                    : 'pending_artist',
                'meetup_expires_at'=> ($validated['used_artist_default'] ?? true)
                    ? null
                    : now()->addHours(24),
                'meetup_proposed_lat'   => ($validated['used_artist_default'] ?? true) ? null : ($validated['meetup_lat']   ?? null),
                'meetup_proposed_lng'   => ($validated['used_artist_default'] ?? true) ? null : ($validated['meetup_lng']   ?? null),
                'meetup_proposed_label' => ($validated['used_artist_default'] ?? true) ? null : ($validated['meetup_label'] ?? null),
                'meetup_proposal_by'    => ($validated['used_artist_default'] ?? true) ? null : 'buyer',
                'meetup_proposed_at'    => ($validated['used_artist_default'] ?? true) ? null : now(),
                'notes'           => $validated['notes'] ?? null,
                'payment_method'  => $validated['payment_method'],
                'gcash_number'    => $validated['gcash_number'] ?? null,
                'status'          => 'pending',
                'subtotal'        => $subtotal,
            ]);


            foreach ($cartItems as $ci) {
                $order->items()->create([
                    'art_post_id' => $ci->artPost->id,
                    'title'       => $ci->artPost->title,
                    'price'       => $ci->artPost->price,
                ]);

                // Mark as sold
                $ci->artPost->update(['is_sold' => true]);
            }

            // Clear cart
            CartItem::where('user_id', $user->id)->delete();
        });

        return redirect()->route('buyer.orders')->with('success', 'Order placed successfully! Thank you for your purchase. 🎉');
    }
}
