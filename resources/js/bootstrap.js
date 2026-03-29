import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/**
 * ── Laravel Echo + Pusher ─────────────────────────────────────────────
 *
 * Initialize the WebSocket client for real-time event broadcasting.
 * Echo connects to Pusher and handles private channel authentication
 * via Laravel's /broadcasting/auth endpoint.
 *
 * Private channels (e.g., `orders.{orderId}`) require the server to
 * authorize the user — Echo sends a POST to /broadcasting/auth with
 * the channel name, and Laravel checks routes/channels.php.
 */
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Pusher must be on window for Echo to find it
window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,
    // Use axios for auth so CSRF token is included automatically
    authorizer: (channel) => ({
        authorize: (socketId, callback) => {
            axios.post('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name,
            })
            .then(response => callback(null, response.data))
            .catch(error => callback(error));
        },
    }),
});
