<?php

namespace App\Http\Controllers;

use App\Models\ArtPost;
use App\Models\PostComment;
use App\Models\PostLike;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ArtPostController extends Controller
{
    // ── Feed (buyers + artists both see this) ────────────────────
    public function feed(Request $request): Response
    {
        $userId  = Auth::id();
        $user    = Auth::user();
        $tab     = $request->query('tab', 'foryou'); // 'following' or 'foryou'

        // Get IDs of artists this user follows
        $followedIds = $user->followedArtistIds();

        $query = ArtPost::with([
                'user.artistProfile',
                'media',
                'comments.user',
                'comments.replies.user',
            ])
            ->where('status', 'published');

        if ($tab === 'following') {
            // Only show posts from followed artists (empty if following nobody)
            $query->whereIn('user_id', $followedIds)->latest();
        } else {
            // "For You" — followed artists' posts first, then the rest by date
            if (count($followedIds) > 0) {
                $query->orderByRaw(
                    'CASE WHEN user_id IN (' . implode(',', $followedIds) . ') THEN 0 ELSE 1 END'
                );
            }
            $query->latest();
        }

        $posts = $query->paginate(10)->withQueryString();

        // Attach counts and liked_by_me flag per post
        $posts->getCollection()->transform(function ($post) use ($userId) {
            $post->likes_count    = $post->likes()->count();
            $post->comments_count = $post->comments()->count();
            $post->liked_by_me    = $userId
                ? $post->likes()->where('user_id', $userId)->exists()
                : false;

            // Generate signed R2 URLs for each media item
            $post->media->each(function ($media) {
                try {
                    $media->url = Storage::disk('s3')->temporaryUrl(
                        $media->path,
                        now()->addHour()
                    );
                } catch (\Exception $e) {
                    $media->url = null;
                }
            });

            return $post;
        });

        return Inertia::render('Feed/Index', [
            'posts'     => $posts,
            'canPost'   => $user->isArtist(),
            'isArtist'  => $user->isArtist(),
            'activeTab' => $tab,
            'userRole'  => $user->role,
        ]);
    }

    // ── Create form (artists only) ────────────────────────────────
    public function create(): Response
    {
        return Inertia::render('Artist/CreatePost');
    }

    // ── Store new post ────────────────────────────────────────────
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'medium'      => ['nullable', 'string', 'max:100'],
            'dimensions'  => ['nullable', 'string', 'max:100'],
            'price'       => ['nullable', 'numeric', 'min:0'],
            'is_for_sale' => ['boolean'],
            'media'       => ['required', 'array', 'min:1', 'max:10'],
            'media.*'     => [
                'required',
                'file',
                'max:102400',
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
            $post = ArtPost::create([
                'user_id'     => Auth::id(),
                'title'       => $request->title,
                'description' => $request->description,
                'medium'      => $request->medium,
                'dimensions'  => $request->dimensions,
                'price'       => $request->boolean('is_for_sale') ? $request->price : null,
                'is_for_sale' => $request->boolean('is_for_sale'),
                'status'      => 'published',
            ]);

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
        });

        return redirect()->route('feed')->with('success', 'Your post has been published!');
    }

    // ── Toggle like ───────────────────────────────────────────────
    public function toggleLike(ArtPost $post): \Illuminate\Http\JsonResponse
    {
        $userId   = Auth::id();
        $existing = PostLike::where('art_post_id', $post->id)
                            ->where('user_id', $userId)
                            ->first();

        if ($existing) {
            $existing->delete();
            $post->decrement('likes_count');
            $liked = false;
        } else {
            PostLike::create([
                'art_post_id' => $post->id,
                'user_id'     => $userId,
            ]);
            $post->increment('likes_count');
            $liked = true;
        }

        return response()->json([
            'liked'       => $liked,
            'likes_count' => $post->fresh()->likes_count,
        ]);
    }

    // ── Store comment ─────────────────────────────────────────────
    public function storeComment(Request $request, ArtPost $post): RedirectResponse
    {
        $request->validate([
            'body'      => ['required', 'string', 'max:1000'],
            'parent_id' => ['nullable', 'exists:post_comments,id'],
        ]);

        PostComment::create([
            'art_post_id' => $post->id,
            'user_id'     => Auth::id(),
            'parent_id'   => $request->parent_id,
            'body'        => $request->body,
        ]);

        $post->increment('comments_count');

        return back();
    }

    // ── Repost (artists only) ─────────────────────────────────────
    public function repost(ArtPost $post): \Illuminate\Http\JsonResponse
    {
        abort_unless(Auth::user()->isArtist(), 403, 'Only artists can repost.');

        // Lightweight implementation — just acknowledge the repost.
        // A full Repost model/table can be added later for proper tracking.
        return response()->json(['success' => true]);
    }

    // ── Delete post (artist owns it) ──────────────────────────────
    public function destroy(ArtPost $post): RedirectResponse
    {
        abort_unless(Auth::id() === $post->user_id, 403);

        foreach ($post->media as $media) {
            Storage::disk('s3')->delete($media->path);
        }

        $post->delete();

        return back()->with('success', 'Post deleted.');
    }
}