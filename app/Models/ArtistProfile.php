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
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}