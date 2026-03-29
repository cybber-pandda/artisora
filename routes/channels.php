<?php

use App\Models\Order;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

/**
 * Private channel for order-level events (GPS tracking, status updates).
 *
 * Authorized for:
 *  - Admin: full access to all orders
 *  - Buyer: owns the order (buyer_id matches)
 *  - Driver: assigned to the order's delivery
 *  - Artist: seller on the order (artist_id matches)
 */
Broadcast::channel('orders.{orderId}', function ($user, $orderId) {
    $order = Order::find($orderId);

    if (! $order) {
        return false;
    }

    // Admin: always allowed
    if ($user->role === 'admin') {
        return true;
    }

    // Buyer: owns this order
    if ($user->id === $order->buyer_id) {
        return true;
    }

    // Artist: seller on this order
    if ($user->id === $order->artist_id) {
        return true;
    }

    // Driver: assigned to this order's delivery
    $delivery = $order->delivery;
    if ($delivery && $user->id === $delivery->driver_id) {
        return true;
    }

    return false;
});

// Default user channel (Laravel scaffolding)
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
