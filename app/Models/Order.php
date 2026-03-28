<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'buyer_id', 'artist_id',
        'full_name', 'email', 'phone_number',
        'delivery_method',
        'address_line', 'city', 'province', 'postal_code',
        'delivery_lat', 'delivery_lng',
        'meetup_location', 'notes',
        'payment_method', 'gcash_number',
        'status', 'subtotal',
        'decline_reason', 'responded_at',
    ];



    protected $casts = [
        'responded_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING   = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_SHIPPED   = 'shipped';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'artist_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function delivery(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Delivery::class);
    }


    // ── Scopes ─────────────────────────────────────────────────
    public function scopePending($q)   { return $q->where('status', self::STATUS_PENDING); }
    public function scopeActive($q)    { return $q->whereIn('status', [self::STATUS_CONFIRMED, self::STATUS_SHIPPED]); }
}
