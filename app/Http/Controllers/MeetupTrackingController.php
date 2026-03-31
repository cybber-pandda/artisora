<?php

namespace App\Http\Controllers;

use App\Models\MeetupSession;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MeetupTrackingController extends Controller
{
    private const ARRIVED_METERS = 80;

    // ── Start or get session ──────────────────────────────────────
    public function startSession(Order $order): JsonResponse
    {
        $this->authorizeParty($order);
        abort_if(!in_array($order->delivery_method, ['meetup', 'pickup']), 404);
        abort_if($order->delivery_method === 'meetup' && !$order->isMeetupAgreed(), 422, 'Meet-up location not yet agreed upon.');

        $session = MeetupSession::firstOrCreate(
            ['order_id' => $order->id],
            ['status'   => 'idle']
        );

        if ($session->status === 'ended') {
            $session->update(['status' => 'idle', 'ended_at' => null]);
        }

        return response()->json(['session' => $this->formatSession($session)]);
    }

    // ── Opt-in: user consents to share their location ─────────────
    public function consent(Request $request, Order $order): JsonResponse
    {
        $this->authorizeParty($order);
        $session = $this->getActiveSession($order);

        $role = $this->role($order);

        $session->update([
            "{$role}_consented" => true,
            'status'            => 'active',
            'started_at'        => $session->started_at ?? now(),
        ]);

        return response()->json(['session' => $this->formatSession($session->refresh())]);
    }

    // ── Push ephemeral location update ────────────────────────────
    public function pushLocation(Request $request, Order $order): JsonResponse
    {
        $this->authorizeParty($order);
        $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $session = $this->getActiveSession($order);
        $role    = $this->role($order);

        if (!$session->{"${role}_consented"}) {
            return response()->json(['error' => 'You have not consented to share your location.'], 403);
        }

        $session->update([
            "{$role}_lat"        => $request->lat,
            "{$role}_lng"        => $request->lng,
            "{$role}_updated_at" => now(),
        ]);

        $session->refresh();

        // Auto-end if both parties have arrived at the anchor point
        if ($order->delivery_method === 'pickup') {
            $artist = $order->artist?->artistProfile;
            $anchorLat = $artist?->pickup_lat ?? $artist?->latitude;
            $anchorLng = $artist?->pickup_lng ?? $artist?->longitude;
        } else {
            $anchorLat = $order->meetup_lat;
            $anchorLng = $order->meetup_lng;
        }
        if ($anchorLat && $anchorLng && $session->bothArrived($anchorLat, $anchorLng, self::ARRIVED_METERS)) {
            $this->endSessionData($session);
        }

        return response()->json(['session' => $this->formatSession($session)]);
    }

    // ── Poll: both parties' locations ─────────────────────────────
    public function poll(Order $order): JsonResponse
    {
        $this->authorizeParty($order);
        $session = MeetupSession::where('order_id', $order->id)->first();

        if (!$session || $session->status !== 'active') {
            return response()->json(['session' => null]);
        }

        return response()->json(['session' => $this->formatSession($session)]);
    }

    // ── Stop sharing: user opts out but doesn't end the session ───
    public function stopSharing(Order $order): JsonResponse
    {
        $this->authorizeParty($order);
        $session = MeetupSession::where('order_id', $order->id)->first();
        if (!$session) return response()->json(['ok' => true]);

        $role = $this->role($order);
        $session->update([
            "{$role}_consented"  => false,
            "{$role}_lat"        => null,
            "{$role}_lng"        => null,
            "{$role}_updated_at" => null,
        ]);

        return response()->json(['session' => $this->formatSession($session->refresh())]);
    }

    // ── End: wipe all location data ───────────────────────────────
    public function endSession(Order $order): JsonResponse
    {
        $this->authorizeParty($order);
        $session = MeetupSession::where('order_id', $order->id)->first();
        if ($session) $this->endSessionData($session);

        return response()->json(['ok' => true]);
    }

    // ── Private helpers ───────────────────────────────────────────

    private function endSessionData(MeetupSession $session): void
    {
        $session->update([
            'status'         => 'ended',
            'ended_at'       => now(),
            // Wipe all ephemeral data
            'buyer_lat'          => null,
            'buyer_lng'          => null,
            'buyer_updated_at'   => null,
            'artist_lat'         => null,
            'artist_lng'         => null,
            'artist_updated_at'  => null,
            'buyer_consented'    => false,
            'artist_consented'   => false,
        ]);
    }

    private function authorizeParty(Order $order): void
    {
        $userId = Auth::id();
        abort_if($order->buyer_id !== $userId && $order->artist_id !== $userId, 403, 'Unauthorized.');
    }

    private function role(Order $order): string
    {
        return Auth::id() === $order->buyer_id ? 'buyer' : 'artist';
    }

    private function getActiveSession(Order $order): MeetupSession
    {
        $session = MeetupSession::firstOrCreate(['order_id' => $order->id], ['status' => 'idle']);
        abort_if($session->status === 'ended', 422, 'Session has ended.');
        return $session;
    }

    private function formatSession(MeetupSession $s): array
    {
        $role = $this->role($s->order ?? Order::find($s->order_id));
        $otherRole = $role === 'buyer' ? 'artist' : 'buyer';

        return [
            'id'               => $s->id,
            'status'           => $s->status,
            'my_consented'     => $s->{"{$role}_consented"},
            'other_consented'  => $s->{"{$otherRole}_consented"},
            'my_lat'           => $s->{"{$role}_lat"},
            'my_lng'           => $s->{"{$role}_lng"},
            // Only reveal other party's location if they consented
            'other_lat'        => $s->{"{$otherRole}_consented"} ? $s->{"{$otherRole}_lat"} : null,
            'other_lng'        => $s->{"{$otherRole}_consented"} ? $s->{"{$otherRole}_lng"} : null,
            'other_updated_at' => $s->{"{$otherRole}_consented"} ? $s->{"{$otherRole}_updated_at"}?->toDateTimeString() : null,
        ];
    }
}
