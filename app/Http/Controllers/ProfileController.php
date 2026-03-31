<?php

namespace App\Http\Controllers;

use App\Models\ArtPost;
use App\Models\Follow;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    // ── Settings page (name, email, password) ────────────────────

    public function edit(Request $request): Response
    {
        $user    = $request->user();
        $profile = $user->artistProfile;

        $meetupLocation = null;
        if ($user->isArtist() && $profile?->hasMeetupLocation()) {
            $meetupLocation = [
                'lat'    => $profile->latitude,
                'lng'    => $profile->longitude,
                'label'  => $profile->meetup_location_label,
                'radius' => $profile->meetup_radius_km ?? 10,
            ];
        }

        $pickupLocation = null;
        if ($user->isArtist() && $profile?->hasPickupLocation()) {
            $pickupLocation = [
                'lat'   => $profile->pickup_lat,
                'lng'   => $profile->pickup_lng,
                'label' => $profile->pickup_location_label,
            ];
        }

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof \Illuminate\Contracts\Auth\MustVerifyEmail,
            'status'          => session('status'),
            'meetupLocation'  => $meetupLocation,
            'pickupLocation'  => $pickupLocation,
            'isArtist'        => $user->isArtist(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $request->user()->fill($request->only('name', 'email'));

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();
        Auth::logout();
        $user->delete();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    // ── Artist meet-up anchor ─────────────────────────────────────

    /** JSON: returns artist's default meet-up anchor (called by buyer checkout). */
    public function getMeetupLocation(int $artistId): JsonResponse
    {
        $artist  = \App\Models\User::find($artistId);
        $profile = $artist?->artistProfile;

        if (!$profile || !$profile->hasMeetupLocation()) {
            return response()->json(['anchor' => null]);
        }

        return response()->json([
            'anchor' => [
                'lat'    => $profile->latitude,
                'lng'    => $profile->longitude,
                'label'  => $profile->meetup_location_label,
                'radius' => $profile->meetup_radius_km,
            ],
        ]);
    }

    /** POST: artist saves their default meet-up anchor from profile settings. */
    public function updateMeetupLocation(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isArtist(), 403);

        $request->validate([
            'lat'       => ['required', 'numeric', 'between:-90,90'],
            'lng'       => ['required', 'numeric', 'between:-180,180'],
            'label'     => ['required', 'string', 'max:255'],
            'radius_km' => ['nullable', 'numeric', 'min:1', 'max:200'],
        ]);

        $profile = $user->artistProfile ?? $user->artistProfile()->create([
            'display_name' => $user->name,
        ]);

        $profile->update([
            'latitude'              => $request->lat,
            'longitude'             => $request->lng,
            'meetup_location_label' => $request->label,
            'meetup_radius_km'      => $request->radius_km ?? 10,
        ]);

        return back()->with('status', 'Meet-up location saved!');
    }

    /** POST: artist saves their pickup / workshop location from profile settings. */
    public function updatePickupLocation(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isArtist(), 403);

        $request->validate([
            'lat'   => ['required', 'numeric', 'between:-90,90'],
            'lng'   => ['required', 'numeric', 'between:-180,180'],
            'label' => ['required', 'string', 'max:255'],
        ]);

        $profile = $user->artistProfile ?? $user->artistProfile()->create([
            'display_name' => $user->name,
        ]);

        $profile->update([
            'pickup_lat'            => $request->lat,
            'pickup_lng'            => $request->lng,
            'pickup_location_label' => $request->label,
        ]);

        return back()->with('status', 'Pickup location saved!');
    }

    // ── Update social profile (bio, photos) ──────────────────────

    public function updateSocialProfile(Request $request): RedirectResponse
    {
        $user = $request->user();

        $request->validate([
            'bio'           => ['nullable', 'string', 'max:500'],
            'specialty'     => ['nullable', 'string', 'max:100'],
            'profile_photo' => ['nullable', 'image', 'max:5120'], // 5MB
            'cover_photo'   => ['nullable', 'image', 'max:10240'], // 10MB
        ]);

        // Determine which profile to update
        if ($user->isArtist()) {
            $profile = $user->artistProfile ?? $user->artistProfile()->create([
                'display_name' => $user->name,
            ]);

            if ($request->has('bio')) {
                $profile->bio = $request->bio;
            }

            if ($request->has('specialty')) {
                $profile->specialty = $request->specialty;
            }

            if ($request->hasFile('profile_photo')) {
                // Delete old
                if ($profile->profile_photo_path) {
                    Storage::disk('s3')->delete($profile->profile_photo_path);
                }
                $profile->profile_photo_path = $request->file('profile_photo')
                    ->store("profiles/{$user->id}", 's3');
            }

            if ($request->hasFile('cover_photo')) {
                if ($profile->cover_photo_path) {
                    Storage::disk('s3')->delete($profile->cover_photo_path);
                }
                $profile->cover_photo_path = $request->file('cover_photo')
                    ->store("covers/{$user->id}", 's3');
            }

            $profile->save();
        } else {
            $profile = $user->buyerProfile ?? $user->buyerProfile()->create([
                'user_id' => $user->id,
            ]);

            if ($request->has('bio')) {
                $profile->bio = $request->bio;
            }

            if ($request->hasFile('profile_photo')) {
                if ($profile->profile_photo_path) {
                    Storage::disk('s3')->delete($profile->profile_photo_path);
                }
                $profile->profile_photo_path = $request->file('profile_photo')
                    ->store("profiles/{$user->id}", 's3');
            }

            if ($request->hasFile('cover_photo')) {
                if ($profile->cover_photo_path) {
                    Storage::disk('s3')->delete($profile->cover_photo_path);
                }
                $profile->cover_photo_path = $request->file('cover_photo')
                    ->store("covers/{$user->id}", 's3');
            }

            $profile->save();
        }

        return back()->with('status', 'Profile updated!');
    }

    // ── Helpers: generate signed URLs for profile images ─────────

    private function profilePhotoUrl(?string $path): ?string
    {
        if (!$path) return null;
        try {
            return Storage::disk('s3')->temporaryUrl($path, now()->addHour());
        } catch (\Exception $e) {
            return null;
        }
    }

    // ── Public profile page ──────────────────────────────────────

    public function show(User $user): Response
    {
        $authUser = Auth::user();

        // Load both profiles (only one will exist per user)
        $user->load(['artistProfile', 'buyerProfile']);

        // Resolve profile data for any role
        $artistProfile = $user->artistProfile;
        $buyerProfile  = $user->buyerProfile;

        $profileData = [
            'display_name'     => $artistProfile?->display_name ?? $user->name,
            'bio'              => $artistProfile?->bio ?? $buyerProfile?->bio ?? null,
            'specialty'        => $artistProfile?->specialty ?? null,
            'instagram_handle' => $artistProfile?->instagram_handle ?? null,
            'facebook_url'     => $artistProfile?->facebook_url ?? null,
            'portfolio_url'    => $artistProfile?->portfolio_url ?? null,
            'profile_photo_url'=> $this->profilePhotoUrl(
                $artistProfile?->profile_photo_path ?? $buyerProfile?->profile_photo_path
            ),
            'cover_photo_url'  => $this->profilePhotoUrl(
                $artistProfile?->cover_photo_path ?? $buyerProfile?->cover_photo_path
            ),
            'city'             => $buyerProfile?->city ?? null,
            'province'         => $buyerProfile?->province ?? null,
        ];

        // Get the user's posts (only for artists)
        $posts = null;
        if ($user->isArtist()) {
            $posts = ArtPost::with(['media', 'user.artistProfile'])
                ->where('user_id', $user->id)
                ->where('status', 'published')
                ->latest()
                ->paginate(12);

            $posts->getCollection()->transform(function ($post) use ($authUser) {
                $post->likes_count    = $post->likes()->count();
                $post->comments_count = $post->comments()->count();
                $post->liked_by_me    = $authUser
                    ? $post->likes()->where('user_id', $authUser->id)->exists()
                    : false;

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
        }

        // Stats
        $followersCount = $user->followers()->count();
        $followingCount = $user->following()->count();
        $postsCount     = $user->isArtist()
            ? $user->posts()->where('status', 'published')->count()
            : 0;

        $isFollowing = $authUser ? $authUser->isFollowing($user->id) : false;

        // Liked posts (for viewer's own profile)
        $likedPosts = null;
        if ($authUser && $authUser->id === $user->id) {
            $likedPosts = ArtPost::with(['media', 'user.artistProfile'])
                ->whereHas('likes', fn($q) => $q->where('user_id', $user->id))
                ->where('status', 'published')
                ->latest()
                ->paginate(12);

            $likedPosts->getCollection()->transform(function ($post) {
                $post->likes_count    = $post->likes()->count();
                $post->comments_count = $post->comments()->count();
                $post->liked_by_me    = true;

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
        }

        // Followed artists
        $followedArtists = collect();
        if ($authUser && $authUser->id === $user->id) {
            $followedArtists = User::whereIn('id', $user->followedArtistIds())
                ->with('artistProfile')
                ->get()
                ->map(fn($a) => [
                    'id'           => $a->id,
                    'name'         => $a->name,
                    'display_name' => $a->artistProfile?->display_name ?? $a->name,
                    'specialty'    => $a->artistProfile?->specialty,
                    'posts_count'  => $a->posts()->where('status', 'published')->count(),
                ]);
        }

        return Inertia::render('Profile/Show', [
            'profileUser'     => $user,
            'profileData'     => $profileData,
            'posts'           => $posts,
            'likedPosts'      => $likedPosts,
            'followedArtists' => $followedArtists,
            'followersCount'  => $followersCount,
            'followingCount'  => $followingCount,
            'postsCount'      => $postsCount,
            'isFollowing'     => $isFollowing,
            'isOwnProfile'    => $authUser?->id === $user->id,
        ]);
    }

    // ── Follow / Unfollow ────────────────────────────────────────

    public function toggleFollow(User $user): JsonResponse
    {
        abort_unless($user->isArtist(), 422, 'You can only follow artists.');

        $authUser = Auth::user();
        abort_if($authUser->id === $user->id, 422, 'You cannot follow yourself.');

        $existing = Follow::where('follower_id', $authUser->id)
                          ->where('artist_id', $user->id)
                          ->first();

        if ($existing) {
            $existing->delete();
            $following = false;
        } else {
            Follow::create([
                'follower_id' => $authUser->id,
                'artist_id'   => $user->id,
            ]);
            $following = true;
        }

        return response()->json([
            'following'       => $following,
            'followers_count' => $user->followers()->count(),
        ]);
    }
}
