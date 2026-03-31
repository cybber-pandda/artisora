<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArtistProfile extends Model
{
    protected $fillable = [
        'user_id',
        'display_name',
        'phone_number',
        'gcash_number',
        'bio',
        'specialty',
        'portfolio_url',
        'instagram_handle',
        'facebook_url',
        'profile_photo_path',
        'cover_photo_path',
        'latitude',
        'longitude',
        'meetup_location_label',
        'meetup_radius_km',
        'pickup_lat',
        'pickup_lng',
        'pickup_location_label',
    ];

    protected $casts = [
        'latitude'         => 'float',
        'longitude'        => 'float',
        'meetup_radius_km' => 'float',
        'pickup_lat'       => 'float',
        'pickup_lng'       => 'float',
    ];

    /** True if the artist has set a default meet-up anchor */
    public function hasMeetupLocation(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }

    /** True if the artist has set a pickup / workshop address */
    public function hasPickupLocation(): bool
    {
        return $this->pickup_lat !== null && $this->pickup_lng !== null;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}