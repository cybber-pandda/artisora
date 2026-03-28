<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuyerProfile extends Model
{
    protected $fillable = [
        'user_id',
        'phone_number',
        'gcash_number',
        'bio',
        'profile_photo_path',
        'cover_photo_path',
        'address_line',
        'city',
        'province',
        'postal_code',
        'country',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}