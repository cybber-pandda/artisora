<?php

use App\Http\Controllers\Auth\RegistrationController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ArtPostController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\PublicController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Welcome ───────────────────────────────────────────────────────
Route::get('/', [PublicController::class, 'welcome'])->name('welcome');

// ── Dashboard fallback ────────────────────────────────────────────
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// ── Profile ───────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/social', [ProfileController::class, 'updateSocialProfile'])->name('profile.social.update');

    // ── Public profile + follow ──────────────────────────────────
    Route::get('/profile/{user}', [ProfileController::class, 'show'])->name('profile.show');
    Route::post('/profile/{user}/follow', [ProfileController::class, 'toggleFollow'])->name('profile.follow');

    // ── Feed (all authenticated roles) ───────────────────────────
    Route::get('/feed', [ArtPostController::class, 'feed'])->name('feed');
    Route::post('/feed/{post}/like', [ArtPostController::class, 'toggleLike'])->name('feed.like');
    Route::post('/feed/{post}/comment', [ArtPostController::class, 'storeComment'])->name('feed.comment');
    Route::post('/feed/{post}/repost', [ArtPostController::class, 'repost'])->name('feed.repost');

    // ── Cart (all authenticated roles) ───────────────────────────
    Route::post('/cart/{artPost}',        [CartController::class, 'add'])->name('cart.add');
    Route::delete('/cart/{artPost}',      [CartController::class, 'remove'])->name('cart.remove');
    Route::get('/cart/{artPost}/status',  [CartController::class, 'status'])->name('cart.status');
});

// ── Registration (role-split flow) ────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/register', [RegistrationController::class, 'showRoleSelection'])->name('register');

    Route::get('/register/buyer',  [RegistrationController::class, 'showBuyerForm'])->name('register.buyer');
    Route::post('/register/buyer', [RegistrationController::class, 'storeBuyer'])->name('register.buyer.store');

    Route::get('/register/artist',  [RegistrationController::class, 'showArtistForm'])->name('register.artist');
    Route::post('/register/artist', [RegistrationController::class, 'storeArtist'])->name('register.artist.store');

    Route::get('/register/driver',  [RegistrationController::class, 'showDriverForm'])->name('register.driver');
    Route::post('/register/driver', [RegistrationController::class, 'storeDriver'])->name('register.driver.store');
});

// ── Admin ─────────────────────────────────────────────────────────
Route::middleware(['auth', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard',               [App\Http\Controllers\AdminController::class, 'dashboard'])->name('admin.dashboard');
    Route::get('/approvals',               [App\Http\Controllers\AdminController::class, 'approvals'])->name('admin.approvals');
    Route::post('/drivers/{user}/approve', [App\Http\Controllers\AdminController::class, 'approveDriver'])->name('admin.drivers.approve');
    Route::post('/drivers/{user}/reject',  [App\Http\Controllers\AdminController::class, 'rejectDriver'])->name('admin.drivers.reject');
});

// ── Artist ────────────────────────────────────────────────────────
Route::middleware(['auth', 'role:artist'])->prefix('artist')->group(function () {
    Route::get('/portfolio', fn() => Inertia::render('Artist/Portfolio'))->name('artist.portfolio');

    // Art post creation (feed)
    Route::get('/posts/create', [ArtPostController::class, 'create'])->name('artist.posts.create');
    Route::post('/posts',        [ArtPostController::class, 'store'])->name('artist.posts.store');
    Route::delete('/posts/{post}', [ArtPostController::class, 'destroy'])->name('artist.posts.destroy');

    // Listing management (shop)
    Route::get('/listings',              [ListingController::class, 'index'])->name('artist.listings');
    Route::get('/listings/create',       [ListingController::class, 'create'])->name('artist.listings.create');
    Route::post('/listings',             [ListingController::class, 'store'])->name('artist.listings.store');
    Route::get('/listings/{post}/edit',  [ListingController::class, 'edit'])->name('artist.listings.edit');
    Route::put('/listings/{post}',       [ListingController::class, 'update'])->name('artist.listings.update');
    Route::delete('/listings/{post}',    [ListingController::class, 'destroy'])->name('artist.listings.destroy');

    // Order management
    Route::get('/orders',                    [OrderController::class, 'artistIndex'])->name('artist.orders');
    Route::post('/orders/{order}/accept',    [OrderController::class, 'accept'])->name('artist.orders.accept');
    Route::post('/orders/{order}/decline',   [OrderController::class, 'decline'])->name('artist.orders.decline');
    Route::post('/orders/{order}/shipped',   [OrderController::class, 'markShipped'])->name('artist.orders.shipped');

    // ── Dispatch flow ─────────────────────────────────────────────
    Route::get('/orders/{order}/dispatch',          [DeliveryController::class, 'dispatchIndex'])->name('artist.dispatch');
    Route::post('/orders/{order}/dispatch/assign',  [DeliveryController::class, 'assignTrustedDriver'])->name('artist.dispatch.assign');
    Route::post('/orders/{order}/dispatch/publish', [DeliveryController::class, 'publishToFreelance'])->name('artist.dispatch.publish');

    // ── Trusted driver management ─────────────────────────────────
    Route::get('/trusted-drivers',             [DeliveryController::class, 'trustedDriversIndex'])->name('artist.trusted-drivers');
    Route::get('/trusted-drivers/search',      [DeliveryController::class, 'searchDrivers'])->name('artist.trusted-drivers.search');
    Route::post('/trusted-drivers',            [DeliveryController::class, 'addTrustedDriver'])->name('artist.trusted-drivers.add');
    Route::delete('/trusted-drivers/{driver}', [DeliveryController::class, 'removeTrustedDriver'])->name('artist.trusted-drivers.remove');
});

// ── Buyer ─────────────────────────────────────────────────────────
Route::middleware(['auth', 'role:buyer'])->prefix('buyer')->group(function () {
    Route::get('/shop',           [ShopController::class, 'index'])->name('buyer.shop');
    Route::get('/shop/{artPost}', [ShopController::class, 'show'])->name('buyer.shop.show');
    Route::get('/cart',           [CartController::class, 'index'])->name('buyer.cart');
    Route::get('/checkout',       [CheckoutController::class, 'show'])->name('buyer.checkout');
    Route::post('/checkout',      [CheckoutController::class, 'store'])->name('buyer.checkout.store');
    Route::get('/orders',         [OrderController::class, 'buyerIndex'])->name('buyer.orders');

    // ── Live tracking ─────────────────────────────────────────────
    Route::get('/orders/{order}/track',           [DeliveryController::class, 'trackingView'])->name('buyer.track');
    Route::get('/deliveries/{delivery}/location', [DeliveryController::class, 'pollLocation'])->name('buyer.delivery.location');
});

// ── Driver ────────────────────────────────────────────────────────
Route::middleware(['auth', 'role:driver'])->prefix('driver')->group(function () {
    Route::get('/pending',  fn() => Inertia::render('Driver/Pending'))->name('driver.pending');
    Route::get('/jobs',     [DeliveryController::class, 'jobBoard'])->name('driver.jobs');
    Route::get('/my-jobs',  [DeliveryController::class, 'myJobs'])->name('driver.my-jobs');

    Route::post('/deliveries/{delivery}/claim',     [DeliveryController::class, 'claimDelivery'])->name('driver.claim');
    Route::post('/deliveries/{delivery}/accept',    [DeliveryController::class, 'acceptPrivateJob'])->name('driver.accept');
    Route::post('/deliveries/{delivery}/location',  [DeliveryController::class, 'updateLocation'])->name('driver.location');
    Route::get('/deliveries/{delivery}',            [DeliveryController::class, 'activeDelivery'])->name('driver.active-delivery');
    Route::post('/deliveries/{delivery}/transit',   [DeliveryController::class, 'markInTransit'])->name('driver.transit');
    Route::post('/deliveries/{delivery}/delivered', [DeliveryController::class, 'markDelivered'])->name('driver.delivered');
});

require __DIR__ . '/auth.php';