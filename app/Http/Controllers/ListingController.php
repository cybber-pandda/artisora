<?php

namespace App\Http\Controllers;

use App\Models\ArtPost;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ListingController extends Controller
{
    // ── My Listings dashboard ────────────────────────────────────
    public function index(): Response
    {
        $listings = ArtPost::with('media')
            ->where('user_id', Auth::id())
            ->where('is_for_sale', true)
            ->latest()
            ->get()
            ->map(function ($post) {
                return [
                    'id'          => $post->id,
                    'title'       => $post->title,
                    'description' => $post->description,
                    'medium'      => $post->medium,
                    'dimensions'  => $post->dimensions,
                    'weight'      => $post->weight,
                    'price'       => $post->price,
                    'is_sold'     => $post->is_sold,
                    'views_count' => $post->views_count,
                    'likes_count' => $post->likes_count,
                    'created_at'  => $post->created_at->toDateString(),
                    'thumbnail'   => $post->cover_image
                        ? $this->signedCoverUrl($post->cover_image)
                        : ($post->media->first()?->url ?? null),
                ];

            });

        return Inertia::render('Artist/MyListings', [
            'listings' => $listings,
            'stats'    => [
                'total'  => $listings->count(),
                'active' => $listings->where('is_sold', false)->count(),
                'sold'   => $listings->where('is_sold', true)->count(),
            ],
        ]);
    }

    // ── Create form ──────────────────────────────────────────────
    public function create(): Response
    {
        return Inertia::render('Artist/CreateListing');
    }

    // ── Store new listing ────────────────────────────────────────
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'medium'      => ['required', 'string', 'max:100'],
            'dimensions'  => ['nullable', 'string', 'max:100'],
            'weight'      => ['nullable', 'numeric', 'min:0'],
            'price'       => ['required', 'numeric', 'min:1', 'max:999999999999'],
            'cover_image' => ['required', 'image', 'max:10240'],
            'media'       => ['nullable', 'array', 'max:10'],
            'media.*'     => [
                'required', 'file', 'max:102400',
                function ($attribute, $value, $fail) {
                    $mime    = $value->getMimeType();
                    $allowed = [
                        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                        'video/mp4', 'video/webm', 'video/quicktime',
                    ];
                    if (!in_array($mime, $allowed)) {
                        $fail('Only images (JPG, PNG, WEBP, GIF) and videos (MP4, WEBM, MOV) are allowed.');
                    }
                    if (str_starts_with($mime, 'image/') && $value->getSize() > 10 * 1024 * 1024) {
                        $fail('Images must be under 10MB.');
                    }
                    if (str_starts_with($mime, 'video/') && $value->getSize() > 100 * 1024 * 1024) {
                        $fail('Videos must be under 100MB.');
                    }
                },
            ],
        ]);

        DB::transaction(function () use ($request) {
            // Upload cover image
            $coverFile = $request->file('cover_image');
            $coverName = 'cover_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $coverFile->getClientOriginalExtension();
            $coverPath = 'listing-covers/' . $coverName;
            Storage::disk('s3')->put($coverPath, file_get_contents($coverFile), 'private');

            $post = ArtPost::create([
                'user_id'     => Auth::id(),
                'title'       => $request->title,
                'description' => $request->description,
                'medium'      => $request->medium,
                'dimensions'  => $request->dimensions,
                'weight'      => $request->weight,
                'price'       => $request->price,
                'is_for_sale' => true,
                'status'      => 'published',
                'cover_image' => $coverPath,
            ]);


            // Upload gallery media (optional)
            if ($request->hasFile('media')) {
                foreach ($request->file('media') as $index => $file) {
                    $mime      = $file->getMimeType();
                    $type      = str_starts_with($mime, 'video/') ? 'video' : 'image';
                    $folder    = $type === 'video' ? 'post-videos' : 'post-images';
                    $extension = $file->getClientOriginalExtension();
                    $filename  = $type . '_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $extension;
                    $path      = $folder . '/' . $filename;

                    Storage::disk('s3')->put($path, file_get_contents($file), 'private');

                    $post->media()->create([
                        'type'          => $type,
                        'path'          => $path,
                        'original_name' => $file->getClientOriginalName(),
                        'size_bytes'    => $file->getSize(),
                        'sort_order'    => $index,
                    ]);
                }
            }
        });

        return redirect()->route('artist.listings')->with('success', 'Listing published successfully!');
    }

    // ── Edit form ────────────────────────────────────────────────
    public function edit(ArtPost $post): Response
    {
        abort_unless(Auth::id() === $post->user_id, 403);

        $post->load('media');

        return Inertia::render('Artist/EditListing', [
            'listing' => [
                'id'              => $post->id,
                'title'           => $post->title,
                'description'     => $post->description,
                'medium'          => $post->medium,
                'dimensions'      => $post->dimensions,
                'weight'          => $post->weight,
                'price'           => $post->price,
                'is_sold'         => $post->is_sold,
                'cover_image_url' => $post->cover_image
                    ? $this->signedCoverUrl($post->cover_image)
                    : null,
                'media'           => $post->media->map(fn ($m) => [
                    'id'   => $m->id,
                    'url'  => $m->url,
                    'type' => $m->type,
                    'name' => $m->original_name,
                ]),
            ],
        ]);

    }

    // ── Update listing ───────────────────────────────────────────
    public function update(Request $request, ArtPost $post): RedirectResponse
    {
        abort_unless(Auth::id() === $post->user_id, 403);

        $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:5000'],
            'medium'         => ['required', 'string', 'max:100'],
            'dimensions'     => ['nullable', 'string', 'max:100'],
            'weight'         => ['nullable', 'numeric', 'min:0'],
            'price'          => ['required', 'numeric', 'min:1', 'max:999999999999'],
            'is_sold'        => ['boolean'],
            'cover_image'    => ['nullable', 'image', 'max:10240'],
            'new_media'      => ['nullable', 'array', 'max:10'],
            'new_media.*'    => ['file', 'max:102400'],
            'remove_media'   => ['nullable', 'array'],
            'remove_media.*' => ['integer'],
        ]);

        DB::transaction(function () use ($request, $post) {
            $updateData = [
                'title'       => $request->title,
                'description' => $request->description,
                'medium'      => $request->medium,
                'dimensions'  => $request->dimensions,
                'weight'      => $request->weight,
                'price'       => $request->price,
                'is_sold'     => $request->boolean('is_sold'),
            ];


            // Replace cover image if new one uploaded
            if ($request->hasFile('cover_image')) {
                if ($post->cover_image) {
                    Storage::disk('s3')->delete($post->cover_image);
                }
                $coverFile = $request->file('cover_image');
                $coverName = 'cover_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $coverFile->getClientOriginalExtension();
                $coverPath = 'listing-covers/' . $coverName;
                Storage::disk('s3')->put($coverPath, file_get_contents($coverFile), 'private');
                $updateData['cover_image'] = $coverPath;
            }

            $post->update($updateData);

            // Remove specified media
            if ($request->remove_media) {
                $mediaToRemove = $post->media()->whereIn('id', $request->remove_media)->get();
                foreach ($mediaToRemove as $media) {
                    Storage::disk('s3')->delete($media->path);
                    $media->delete();
                }
            }

            // Add new media
            if ($request->hasFile('new_media')) {
                $currentCount = $post->media()->count();
                foreach ($request->file('new_media') as $index => $file) {
                    $mime      = $file->getMimeType();
                    $type      = str_starts_with($mime, 'video/') ? 'video' : 'image';
                    $folder    = $type === 'video' ? 'post-videos' : 'post-images';
                    $extension = $file->getClientOriginalExtension();
                    $filename  = $type . '_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $extension;
                    $path      = $folder . '/' . $filename;

                    Storage::disk('s3')->put($path, file_get_contents($file), 'private');

                    $post->media()->create([
                        'type'          => $type,
                        'path'          => $path,
                        'original_name' => $file->getClientOriginalName(),
                        'size_bytes'    => $file->getSize(),
                        'sort_order'    => $currentCount + $index,
                    ]);
                }
            }
        });

        return redirect()->route('artist.listings')->with('success', 'Listing updated!');
    }

    // ── Delete listing ───────────────────────────────────────────
    public function destroy(ArtPost $post): RedirectResponse
    {
        abort_unless(Auth::id() === $post->user_id, 403);

        // Delete cover image from S3
        if ($post->cover_image) {
            Storage::disk('s3')->delete($post->cover_image);
        }

        foreach ($post->media as $media) {
            Storage::disk('s3')->delete($media->path);
        }

        $post->delete();

        return redirect()->route('artist.listings')->with('success', 'Listing deleted.');
    }

    // ── Helper: generate signed URL for cover image ──────────────
    private function signedCoverUrl(string $path): ?string
    {
        try {
            return Storage::disk('s3')->temporaryUrl($path, now()->addHour());
        } catch (\Exception $e) {
            return null;
        }
    }
}
