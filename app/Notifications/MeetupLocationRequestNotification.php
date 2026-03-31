<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Notifications\Notification;

class MeetupLocationRequestNotification extends Notification
{
    public function __construct(
        public readonly Order  $order,
        public readonly string $proposedBy,  // 'buyer' | 'artist'
        public readonly string $proposedLabel,
        public readonly float  $proposedLat,
        public readonly float  $proposedLng,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $who = $this->proposedBy === 'buyer' ? 'Buyer' : 'Artist';
        return [
            'type'           => 'meetup_location_request',
            'order_id'       => $this->order->id,
            'proposed_by'    => $this->proposedBy,
            'proposed_label' => $this->proposedLabel,
            'proposed_lat'   => $this->proposedLat,
            'proposed_lng'   => $this->proposedLng,
            'message'        => "{$who} proposed a new meet-up location for Order #{$this->order->id}: {$this->proposedLabel}",
            'round'          => $this->order->meetup_round,
        ];
    }
}
