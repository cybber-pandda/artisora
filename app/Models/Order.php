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
        // Meetup negotiation
        'meetup_lat', 'meetup_lng', 'meetup_label', 'meetup_note',
        'meetup_status', 'meetup_round',
        'meetup_proposed_lat', 'meetup_proposed_lng', 'meetup_proposed_label',
        'meetup_proposal_by', 'meetup_proposed_at', 'meetup_expires_at',
        // Meetup proof & experience
        'meetup_proof_path', 'meetup_proof_at',
        'meetup_experience_rating', 'meetup_experience_comment',
        'meetup_completed_at',
        // Delivery proof & experience
        'delivery_experience_rating', 'delivery_experience_comment',
        'delivery_completed_at',
        'payment_method', 'gcash_number',
        'status', 'subtotal',
        'decline_reason', 'responded_at',
    ];

    protected $casts = [
        'responded_at'        => 'datetime',
        'meetup_proposed_at'  => 'datetime',
        'meetup_expires_at'   => 'datetime',
        'meetup_proof_at'     => 'datetime',
        'meetup_completed_at' => 'datetime',
        'meetup_lat'          => 'float',
        'meetup_lng'          => 'float',
        'meetup_proposed_lat' => 'float',
        'meetup_proposed_lng' => 'float',
        'meetup_round'        => 'integer',
        'meetup_experience_rating'    => 'integer',
        'delivery_experience_rating'  => 'integer',
        'delivery_completed_at'       => 'datetime',
    ];

    const MAX_MEETUP_ROUNDS = 3;

    // ── Meetup helpers ──────────────────────────────────────────────
    public function isMeetupAgreed(): bool
    {
        return $this->meetup_status === 'agreed' || $this->meetup_status === 'reverted';
    }

    public function isMeetupPendingArtist(): bool
    {
        return $this->meetup_status === 'pending_artist';
    }

    public function isMeetupPendingBuyer(): bool
    {
        return $this->meetup_status === 'pending_buyer';
    }

    public function meetupRoundsExhausted(): bool
    {
        return $this->meetup_round >= self::MAX_MEETUP_ROUNDS;
    }

    public function meetupExpired(): bool
    {
        return $this->meetup_expires_at && $this->meetup_expires_at->isPast();
    }

    public function meetupSession(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(MeetupSession::class);
    }

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

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }


    // ── Scopes ─────────────────────────────────────────────────
    public function scopePending($q)   { return $q->where('status', self::STATUS_PENDING); }
    public function scopeActive($q)    { return $q->whereIn('status', [self::STATUS_CONFIRMED, self::STATUS_SHIPPED]); }
}
