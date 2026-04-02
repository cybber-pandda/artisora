<?php

namespace App\Http\Controllers;

use App\Models\ArtPost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
    // ── Shop index (buyer browse) ────────────────────────────────
    public function index(Request $request): Response
    {
        $query = ArtPost::with(['user.artistProfile', 'media'])
            ->where('is_for_sale', true)
            ->where('status', 'published');

        // ── Search ──
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('user.artistProfile', function ($aq) use ($search) {
                      $aq->where('display_name', 'like', "%{$search}%");
                  });
            });
        }

        // ── Medium filter ──
        if ($medium = $request->query('medium')) {
            $query->where('medium', $medium);
        }

        // ── Price range ──
        if ($request->filled('price_min')) {
            $query->where('price', '>=', $request->query('price_min'));
        }
        if ($request->filled('price_max')) {
            $query->where('price', '<=', $request->query('price_max'));
        }

        // ── Availability filter ──
        if ($request->query('availability') === 'available') {
            $query->where('is_sold', false);
        } elseif ($request->query('availability') === 'sold') {
            $query->where('is_sold', true);
        }

        // ── Sorting ──
        $sort = $request->query('sort', 'newest');
        match ($sort) {
            'price_asc'  => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'popular'    => $query->orderBy('views_count', 'desc'),
            'rating'     => $query->orderBy('likes_count', 'desc'),
            default      => $query->latest(),
        };

        $products = $query->paginate(12)->withQueryString();

        // Transform for frontend
        $products->getCollection()->transform(function ($post) {
            return [
                'id'          => $post->id,
                'title'       => $post->title,
                'description' => str($post->description)->limit(120),
                'medium'      => $post->medium,
                'dimensions'  => $post->dimensions,
                'price'       => (float) $post->price,
                'is_sold'     => $post->is_sold,
                'views_count' => $post->views_count,
                'likes_count' => $post->likes_count,
                'created_at'  => $post->created_at->toDateString(),
                'artist'      => [
                    'id'           => $post->user->id,
                    'name'         => $post->user->name,
                    'display_name' => $post->user->artistProfile?->display_name ?? $post->user->name,
                    'specialty'    => $post->user->artistProfile?->specialty,
                ],
                'thumbnail'   => $post->cover_image
                    ? $this->signedCoverUrl($post->cover_image)
                    : ($post->media->where('type', 'image')->first()?->url ?? null),
                'media_count' => $post->media->count(),
            ];
        });

        // Get distinct mediums for filter pills
        $mediums = ArtPost::where('is_for_sale', true)
            ->where('status', 'published')
            ->whereNotNull('medium')
            ->distinct()
            ->pluck('medium')
            ->sort()
            ->values();

        return Inertia::render('Buyer/Shop', [
            'products' => $products,
            'mediums'  => $mediums,
            'filters'  => [
                'search'       => $request->query('search', ''),
                'medium'       => $request->query('medium', ''),
                'price_min'    => $request->query('price_min', ''),
                'price_max'    => $request->query('price_max', ''),
                'sort'         => $sort,
                'availability' => $request->query('availability', ''),
            ],
        ]);
    }

    // ── Product detail page ──────────────────────────────────────
    public function show(ArtPost $artPost): Response
    {
        abort_unless(
            $artPost->is_for_sale && $artPost->status === 'published',
            404
        );

        $artPost->increment('views_count');
        $artPost->load(['user.artistProfile', 'media']);

        // More from this artist
        $moreFromArtist = ArtPost::with('media')
            ->where('user_id', $artPost->user_id)
            ->where('id', '!=', $artPost->id)
            ->where('is_for_sale', true)
            ->where('status', 'published')
            ->latest()
            ->take(6)
            ->get()
            ->map(function ($post) {
                return [
                    'id'        => $post->id,
                    'title'     => $post->title,
                    'price'     => (float) $post->price,
                    'is_sold'   => $post->is_sold,
                    'medium'    => $post->medium,
                    'thumbnail' => $post->media->first()?->url ?? null,
                ];
            });

        $product = [
            'id'             => $artPost->id,
            'title'          => $artPost->title,
            'description'    => $artPost->description,
            'medium'         => $artPost->medium,
            'dimensions'     => $artPost->dimensions,
            'price'          => (float) $artPost->price,
            'is_sold'        => $artPost->is_sold,
            'views_count'    => $artPost->views_count,
            'likes_count'    => $artPost->likes_count,
            'comments_count' => $artPost->comments_count,
            'created_at'     => $artPost->created_at->toDateString(),
            'media'          => $artPost->media->map(fn ($m) => [
                'id'           => $m->id,
                'url'          => $m->url,
                'type'         => $m->type,
                'is_ar_primary' => $m->is_ar_primary,
            ]),
            'artist' => [
                'id'           => $artPost->user->id,
                'name'         => $artPost->user->name,
                'display_name' => $artPost->user->artistProfile?->display_name ?? $artPost->user->name,
                'specialty'    => $artPost->user->artistProfile?->specialty,
                'bio'          => $artPost->user->artistProfile?->bio,
            ],
            // ── AR fields ──
            'physical_width_cm'  => $artPost->physical_width_cm  ? (float) $artPost->physical_width_cm  : null,
            'physical_height_cm' => $artPost->physical_height_cm ? (float) $artPost->physical_height_cm : null,
            'ar_image_url'       => $artPost->ar_image_url,
        ];

        return Inertia::render('Buyer/ProductDetail', [
            'product'        => $product,
            'moreFromArtist' => $moreFromArtist,
            'productUrl'     => route('buyer.shop.show', $artPost->id), // canonical URL for QR code
            'inCart'         => \App\Models\CartItem::where('user_id', auth()->id())
                                    ->where('art_post_id', $artPost->id)
                                    ->exists(),
        ]);
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
