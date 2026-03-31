<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Notifications\Notification;

class MeetupAgreedNotification extends Notification
{
    public function __construct(public readonly Order $order) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'           => 'meetup_agreed',
            'order_id'       => $this->order->id,
            'meetup_label'   => $this->order->meetup_label,
            'meetup_lat'     => $this->order->meetup_lat,
            'meetup_lng'     => $this->order->meetup_lng,
            'message'        => "Meet-up location confirmed for Order #{$this->order->id}: {$this->order->meetup_label}",
        ];
    }
}
