<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArtPost extends Model
{
    protected $fillable = [
        'user_id', 'title', 'description', 'medium',
        'dimensions', 'weight', 'price', 'is_for_sale', 'is_sold',
        'status', 'cover_image', 'views_count', 'likes_count', 'comments_count',
    ];


    protected function casts(): array
    {
        return [
            'is_for_sale' => 'boolean',
            'is_sold'     => 'boolean',
            'price'       => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(ArtPostMedia::class)->orderBy('sort_order');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(PostComment::class)
                    ->whereNull('parent_id')
                    ->with('user', 'replies.user')
                    ->latest();
    }

    public function isLikedBy(int $userId): bool
    {
        return $this->likes()->where('user_id', $userId)->exists();
    }
}