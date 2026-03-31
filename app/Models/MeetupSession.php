<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetupSession extends Model
{
    protected $fillable = [
        'order_id',
        'buyer_consented',
        'artist_consented',
        'buyer_lat',
        'buyer_lng',
        'buyer_updated_at',
        'artist_lat',
        'artist_lng',
        'artist_updated_at',
        'status',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'buyer_consented'    => 'boolean',
        'artist_consented'   => 'boolean',
        'buyer_lat'          => 'float',
        'buyer_lng'          => 'float',
        'artist_lat'         => 'float',
        'artist_lng'         => 'float',
        'buyer_updated_at'   => 'datetime',
        'artist_updated_at'  => 'datetime',
        'started_at'         => 'datetime',
        'ended_at'           => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /** Both parties are within $meters of the agreed meet-up pin */
    public function bothArrived(float $meetLat, float $meetLng, float $meters = 80): bool
    {
        return $this->buyer_consented
            && $this->artist_consented
            && $this->buyer_lat !== null
            && $this->artist_lat !== null
            && self::haversineMeters($this->buyer_lat, $this->buyer_lng, $meetLat, $meetLng) <= $meters
            && self::haversineMeters($this->artist_lat, $this->artist_lng, $meetLat, $meetLng) <= $meters;
    }

    public static function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6_371_000;
        $phi1 = deg2rad($lat1);
        $phi2 = deg2rad($lat2);
        $dPhi = deg2rad($lat2 - $lat1);
        $dLam = deg2rad($lng2 - $lng1);
        $a = sin($dPhi / 2) ** 2 + cos($phi1) * cos($phi2) * sin($dLam / 2) ** 2;
        return 2 * $R * asin(sqrt($a));
    }
}
