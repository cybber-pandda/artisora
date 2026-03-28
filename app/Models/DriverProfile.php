<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverProfile extends Model
{
    protected $fillable = [
        'user_id',
        'phone_number',
        'vehicle_type',
        'plate_number',
        'license_image_path',
        'license_number',
        'license_expiry',
        'city_coverage',
        'is_verified',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'is_verified'   => 'boolean',
            'verified_at'   => 'datetime',
            'license_expiry'=> 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}