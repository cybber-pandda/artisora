<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ArtPostMedia extends Model
{
    protected $fillable = [
        'art_post_id', 'type', 'path',
        'thumbnail_path', 'original_name', 'size_bytes', 'sort_order',
        'is_ar_primary',
    ];

    protected $casts = [
        'is_ar_primary' => 'boolean',
    ];

    // ── Tell Laravel to include 'url' when serializing to JSON ───
    protected $appends = ['url'];

    protected $hidden = [
        'path',           // never expose the raw R2 path to frontend
        'thumbnail_path',
    ];

    public function getUrlAttribute(): string
    {
        try {
            // Generate a signed temporary URL valid for 1 hour
            return Storage::disk('s3')->temporaryUrl(
                $this->path,
                now()->addHour()
            );
        } catch (\Exception $e) {
            // Fallback — return empty string so frontend can handle gracefully
            return '';
        }
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail_path) return null;

        try {
            return Storage::disk('s3')->temporaryUrl(
                $this->thumbnail_path,
                now()->addHour()
            );
        } catch (\Exception $e) {
            return null;
        }
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(ArtPost::class, 'art_post_id');
    }
}