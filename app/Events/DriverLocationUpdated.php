<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * DriverLocationUpdated — broadcasts driver GPS position to buyers in real-time.
 *
 * Uses ShouldBroadcastNow (not ShouldBroadcast) to bypass the queue
 * and push directly to Pusher. GPS updates are time-critical;
 * a 2-5 second queue delay would make the buyer's map stale.
 *
 * Channel: private-orders.{orderId}
 * Listeners: Buyer TrackOrder page via Laravel Echo
 */
class DriverLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public float $latitude;
    public float $longitude;
    public float $bearing;
    public float $accuracy;
    public string $snapMode;
    public string $timestamp;
    public int $orderId;

    /**
     * Create a new event instance.
     */
    public function __construct(
        int $orderId,
        float $latitude,
        float $longitude,
        float $bearing = 0,
        float $accuracy = 0,
        string $snapMode = 'snapped'
    ) {
        $this->orderId   = $orderId;
        $this->latitude  = $latitude;
        $this->longitude = $longitude;
        $this->bearing   = $bearing;
        $this->accuracy  = $accuracy;
        $this->snapMode  = $snapMode;
        $this->timestamp = now()->toIso8601String();
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * Private channel ensures only authenticated, authorized users
     * (buyer, driver, artist, admin) can subscribe.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('orders.' . $this->orderId),
        ];
    }

    /**
     * The event's broadcast name.
     *
     * Using a clean name instead of the FQCN default.
     * On the client, listen with: `.DriverLocationUpdated`
     */
    public function broadcastAs(): string
    {
        return 'DriverLocationUpdated';
    }

    /**
     * Get the data to broadcast.
     *
     * Only send what the buyer's map needs — keep payload small
     * to stay within Pusher's 10KB message limit.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'latitude'  => $this->latitude,
            'longitude' => $this->longitude,
            'bearing'   => $this->bearing,
            'accuracy'  => $this->accuracy,
            'snapMode'  => $this->snapMode,
            'timestamp' => $this->timestamp,
            'orderId'   => $this->orderId,
        ];
    }
}
