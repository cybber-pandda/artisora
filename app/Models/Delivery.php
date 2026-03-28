<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    protected $fillable = [
        'order_id', 'artist_id', 'driver_id',
        'type', 'status',
        'dimensions', 'weight', 'buffer_time',
        'pickup_lat', 'pickup_lng',
        'dropoff_lat', 'dropoff_lng',
        'driver_lat', 'driver_lng',
        'estimated_arrival_at',
        'claimed_at', 'picked_up_at', 'delivered_at',
    ];

    protected $casts = [
        'estimated_arrival_at' => 'datetime',
        'claimed_at'           => 'datetime',
        'picked_up_at'         => 'datetime',
        'delivered_at'         => 'datetime',
        'pickup_lat'           => 'float',
        'pickup_lng'           => 'float',
        'dropoff_lat'          => 'float',
        'dropoff_lng'          => 'float',
        'driver_lat'           => 'float',
        'driver_lng'           => 'float',
        'weight'               => 'float',
        'buffer_time'          => 'integer',
    ];

    // Status constants
    const STATUS_PENDING_DRIVER = 'pending_driver';
    const STATUS_SEARCHING      = 'searching';
    const STATUS_PICKED_UP      = 'picked_up';
    const STATUS_IN_TRANSIT     = 'in_transit';
    const STATUS_DELIVERED      = 'delivered';

    // ── Relationships ─────────────────────────────────────────────
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'artist_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    // ── Helpers ──────────────────────────────────────────────────
    /** ETA adjusted for fragile buffer (in minutes) */
    public function adjustedEta(): ?string
    {
        if (! $this->estimated_arrival_at) {
            return null;
        }

        return $this->estimated_arrival_at
            ->addMinutes($this->buffer_time)
            ->toDateTimeString();
    }

    public function isClaimable(): bool
    {
        return $this->type === 'public'
            && $this->status === self::STATUS_SEARCHING
            && is_null($this->driver_id);
    }
}
