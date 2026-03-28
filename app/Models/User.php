<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;


class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_verified',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_verified'       => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────
    public function buyerProfile(): HasOne
    {
        return $this->hasOne(BuyerProfile::class);
    }

    public function artistProfile(): HasOne
    {
        return $this->hasOne(ArtistProfile::class);
    }

    public function driverProfile(): HasOne
    {
        return $this->hasOne(DriverProfile::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(ArtPost::class);
    }

    /** Drivers this artist has trusted */
    public function trustedDrivers(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'artist_trusted_drivers',
            'artist_id',
            'driver_id'
        )->withPivot('created_at');
    }

    /** Artists who have trusted this driver */
    public function trustedByArtists(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'artist_trusted_drivers',
            'driver_id',
            'artist_id'
        )->withPivot('created_at');
    }



    // Artists I follow
    public function following(): HasMany
    {
        return $this->hasMany(Follow::class, 'follower_id');
    }

    // People who follow me (only relevant for artists)
    public function followers(): HasMany
    {
        return $this->hasMany(Follow::class, 'artist_id');
    }

    // ── Role helpers ─────────────────────────────────────────────
    public function isAdmin(): bool  { return $this->role === 'admin'; }
    public function isArtist(): bool { return $this->role === 'artist'; }
    public function isBuyer(): bool  { return $this->role === 'buyer'; }
    public function isDriver(): bool { return $this->role === 'driver'; }

    // ── Follow helpers ───────────────────────────────────────────
    public function isFollowing(int $artistId): bool
    {
        return $this->following()->where('artist_id', $artistId)->exists();
    }

    public function followedArtistIds(): array
    {
        return $this->following()->pluck('artist_id')->toArray();
    }
}