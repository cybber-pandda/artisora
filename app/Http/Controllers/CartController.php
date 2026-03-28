<?php

namespace App\Http\Controllers;

use App\Models\ArtPost;
use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    // ── View cart page ───────────────────────────────────────
    public function index(): Response
    {
        $cartItems = CartItem::with(['artPost.user.artistProfile', 'artPost.media'])
            ->where('user_id', Auth::id())
            ->latest()
            ->get()
            ->map(function ($item) {
                $post = $item->artPost;
                return [
                    'art_post_id'  => $post->id,
                    'title'        => $post->title,
                    'price'        => (float) $post->price,
                    'medium'       => $post->medium,
                    'is_sold'      => $post->is_sold,
                    'artist_name'  => $post->user->artistProfile?->display_name ?? $post->user->name,
                    'thumbnail'    => $post->cover_image
                        ? $this->signedCoverUrl($post->cover_image)
                        : ($post->media->where('type', 'image')->first()?->url ?? null),
                ];
            });

        return Inertia::render('Buyer/Cart', [
            'cartItems' => $cartItems,
        ]);
    }

    // ── Add or update item in cart ───────────────────────────────
    public function add(Request $request, ArtPost $artPost): JsonResponse
    {
        // Only published, for-sale, non-sold items can be carted
        abort_if(
            !$artPost->is_for_sale || $artPost->status !== 'published' || $artPost->is_sold,
            422,
            'This artwork is not available for purchase.'
        );

        $cartItem = CartItem::firstOrCreate(
            [
                'user_id'     => Auth::id(),
                'art_post_id' => $artPost->id,
            ],
            ['quantity' => 1]
        );

        $cartCount = CartItem::where('user_id', Auth::id())->count();

        return response()->json([
            'message'    => $cartItem->wasRecentlyCreated
                ? 'Added to cart!'
                : 'Already in your cart.',
            'in_cart'    => true,
            'cart_count' => $cartCount,
        ]);
    }

    // ── Remove item from cart ────────────────────────────────────
    public function remove(Request $request, ArtPost $artPost): JsonResponse
    {
        CartItem::where('user_id', Auth::id())
            ->where('art_post_id', $artPost->id)
            ->delete();

        $cartCount = CartItem::where('user_id', Auth::id())->count();

        return response()->json([
            'message'    => 'Removed from cart.',
            'in_cart'    => false,
            'cart_count' => $cartCount,
        ]);
    }

    // ── Check whether a product is in the user's cart ───────────
    public function status(ArtPost $artPost): JsonResponse
    {
        $inCart = CartItem::where('user_id', Auth::id())
            ->where('art_post_id', $artPost->id)
            ->exists();

        return response()->json(['in_cart' => $inCart]);
    }

    // ── Helper: signed S3 URL for cover image ──────────────────────
    private function signedCoverUrl(string $path): ?string
    {
        try {
            return \Illuminate\Support\Facades\Storage::disk('s3')->temporaryUrl($path, now()->addHour());
        } catch (\Exception $e) {
            return null;
        }
    }
}
