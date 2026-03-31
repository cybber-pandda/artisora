<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Notifications\MeetupAgreedNotification;
use App\Notifications\MeetupLocationRequestNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MeetupController extends Controller
{
    private const MAX_ROUNDS = 3;

    // ── ARTIST: Review a buyer's proposed location ────────────────
    public function artistReview(Order $order): Response
    {
        $this->authorizeArtist($order);
        abort_if($order->delivery_method !== 'meetup', 404);

        $artist = Auth::user()->load('artistProfile');

        return Inertia::render('Artist/MeetupReview', [
            'order' => $this->formatForReview($order),
            'artistAnchor' => $artist->artistProfile ? [
                'lat'    => $artist->artistProfile->latitude,
                'lng'    => $artist->artistProfile->longitude,
                'label'  => $artist->artistProfile->meetup_location_label,
                'radius' => $artist->artistProfile->meetup_radius_km,
            ] : null,
        ]);
    }

    // ── BUYER: View artist's counter-proposal ─────────────────────
    public function buyerReview(Order $order): Response
    {
        $this->authorizeBuyer($order);
        abort_if($order->delivery_method !== 'meetup', 404);

        $artist = $order->artist->load('artistProfile');

        return Inertia::render('Buyer/MeetupRespond', [
            'order' => $this->formatForReview($order),
            'artistAnchor' => $artist->artistProfile ? [
                'lat'    => $artist->artistProfile->latitude,
                'lng'    => $artist->artistProfile->longitude,
                'label'  => $artist->artistProfile->meetup_location_label,
            ] : null,
        ]);
    }

    // ── ARTIST: Approve buyer's proposal ─────────────────────────
    public function approve(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);
        abort_if(!$order->isMeetupPendingArtist(), 422, 'No pending proposal to approve.');

        $order->update([
            'meetup_lat'           => $order->meetup_proposed_lat,
            'meetup_lng'           => $order->meetup_proposed_lng,
            'meetup_label'         => $order->meetup_proposed_label,
            'meetup_status'        => 'agreed',
            'meetup_proposed_lat'  => null,
            'meetup_proposed_lng'  => null,
            'meetup_proposed_label'=> null,
            'meetup_proposal_by'   => null,
            'meetup_expires_at'    => null,
        ]);

        $order->refresh();
        $this->notifyBothParties($order, new MeetupAgreedNotification($order));

        return redirect()->route('artist.orders')
            ->with('success', "Meet-up location approved for Order #{$order->id}.");
    }

    // ── ARTIST: Counter-propose a different location ──────────────
    public function counter(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);
        abort_if(!$order->isMeetupPendingArtist(), 422, 'No pending proposal to counter.');
        abort_if($order->meetupRoundsExhausted(), 422, 'Max negotiation rounds reached.');

        $request->validate([
            'lat'   => ['required', 'numeric', 'between:-90,90'],
            'lng'   => ['required', 'numeric', 'between:-180,180'],
            'label' => ['required', 'string', 'max:255'],
        ]);

        $newRound = $order->meetup_round + 1;

        if ($newRound >= self::MAX_ROUNDS) {
            // Auto-revert on last round exhaustion
            $this->revertToDefault($order);
            return redirect()->route('artist.orders')
                ->with('info', "Negotiation limit reached. Meet-up reverted to artist's default for Order #{$order->id}.");
        }

        $order->update([
            'meetup_proposed_lat'   => $request->lat,
            'meetup_proposed_lng'   => $request->lng,
            'meetup_proposed_label' => $request->label,
            'meetup_proposal_by'    => 'artist',
            'meetup_proposed_at'    => now(),
            'meetup_expires_at'     => now()->addHours(24),
            'meetup_status'         => 'pending_buyer',
            'meetup_round'          => $newRound,
        ]);

        $order->buyer->notify(new MeetupLocationRequestNotification(
            $order, 'artist', $request->label, $request->lat, $request->lng
        ));

        return redirect()->route('artist.orders')
            ->with('success', "Counter-proposal sent to buyer for Order #{$order->id}.");
    }

    // ── ARTIST: Revert to original default ───────────────────────
    public function revert(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeArtist($order);
        abort_if(!in_array($order->meetup_status, ['pending_artist', 'pending_buyer']), 422, 'Nothing to revert.');

        $this->revertToDefault($order);
        $order->refresh();
        $this->notifyBothParties($order, new MeetupAgreedNotification($order));

        return redirect()->route('artist.orders')
            ->with('success', "Meet-up reverted to your default location for Order #{$order->id}.");
    }

    // ── BUYER: Respond to artist's counter-proposal ───────────────
    public function buyerRespond(Request $request, Order $order): RedirectResponse
    {
        $this->authorizeBuyer($order);
        abort_if(!$order->isMeetupPendingBuyer(), 422, 'No counter-proposal to respond to.');

        $request->validate(['action' => ['required', 'in:accept,reject']]);

        if ($request->action === 'accept') {
            $order->update([
                'meetup_lat'           => $order->meetup_proposed_lat,
                'meetup_lng'           => $order->meetup_proposed_lng,
                'meetup_label'         => $order->meetup_proposed_label,
                'meetup_status'        => 'agreed',
                'meetup_proposed_lat'  => null,
                'meetup_proposed_lng'  => null,
                'meetup_proposed_label'=> null,
                'meetup_proposal_by'   => null,
                'meetup_expires_at'    => null,
            ]);
            $order->refresh();
            $this->notifyBothParties($order, new MeetupAgreedNotification($order));
            return redirect()->route('buyer.orders')
                ->with('success', "Meet-up location confirmed for Order #{$order->id}! 📍");
        }

        // Buyer rejects — if rounds remain, let them propose again
        if ($order->meetupRoundsExhausted()) {
            $this->revertToDefault($order);
            $order->refresh();
            return redirect()->route('buyer.orders')
                ->with('info', "Max rounds reached. Meet-up reverted to artist's default for Order #{$order->id}.");
        }

        // Back to buyer proposing via the checkout/edit flow
        $request->validate([
            'lat'   => ['required', 'numeric', 'between:-90,90'],
            'lng'   => ['required', 'numeric', 'between:-180,180'],
            'label' => ['required', 'string', 'max:255'],
            'note'  => ['nullable', 'string', 'max:500'],
        ]);

        $newRound = $order->meetup_round + 1;
        $order->update([
            'meetup_proposed_lat'   => $request->lat,
            'meetup_proposed_lng'   => $request->lng,
            'meetup_proposed_label' => $request->label,
            'meetup_note'           => $request->note,
            'meetup_proposal_by'    => 'buyer',
            'meetup_proposed_at'    => now(),
            'meetup_expires_at'     => now()->addHours(24),
            'meetup_status'         => 'pending_artist',
            'meetup_round'          => $newRound,
        ]);

        $order->artist->notify(new MeetupLocationRequestNotification(
            $order, 'buyer', $request->label, $request->lat, $request->lng
        ));

        return redirect()->route('buyer.orders')
            ->with('success', "Your counter-proposal has been sent to the artist for Order #{$order->id}.");
    }

    // ── Private helpers ───────────────────────────────────────────

    private function revertToDefault(Order $order): void
    {
        $artist = $order->artist->load('artistProfile');
        $profile = $artist->artistProfile;

        $order->update([
            'meetup_lat'           => $profile?->latitude,
            'meetup_lng'           => $profile?->longitude,
            'meetup_label'         => $profile?->meetup_location_label ?? $order->meetup_location,
            'meetup_status'        => 'reverted',
            'meetup_proposed_lat'  => null,
            'meetup_proposed_lng'  => null,
            'meetup_proposed_label'=> null,
            'meetup_proposal_by'   => null,
            'meetup_expires_at'    => null,
        ]);
    }

    private function notifyBothParties(Order $order, $notification): void
    {
        $order->buyer->notify($notification);
        $order->artist->notify(clone $notification);
    }

    private function authorizeArtist(Order $order): void
    {
        abort_if($order->artist_id !== Auth::id(), 403, 'Unauthorized.');
    }

    private function authorizeBuyer(Order $order): void
    {
        abort_if($order->buyer_id !== Auth::id(), 403, 'Unauthorized.');
    }

    private function formatForReview(Order $order): array
    {
        return [
            'id'                   => $order->id,
            'status'               => $order->status,
            'meetup_status'        => $order->meetup_status,
            'meetup_round'         => $order->meetup_round,
            'meetup_lat'           => $order->meetup_lat,
            'meetup_lng'           => $order->meetup_lng,
            'meetup_label'         => $order->meetup_label,
            'meetup_proposed_lat'  => $order->meetup_proposed_lat,
            'meetup_proposed_lng'  => $order->meetup_proposed_lng,
            'meetup_proposed_label'=> $order->meetup_proposed_label,
            'meetup_note'          => $order->meetup_note,
            'meetup_proposal_by'   => $order->meetup_proposal_by,
            'meetup_expires_at'    => $order->meetup_expires_at?->toDateTimeString(),
            'buyer'                => [
                'name'         => $order->full_name,
                'phone_number' => $order->phone_number,
            ],
        ];
    }
}
