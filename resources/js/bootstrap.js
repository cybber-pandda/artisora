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

// Enable Pusher console logging so auth failures are visible in DevTools
Pusher.logToConsole = import.meta.env.DEV;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,
    // Use a custom authorizer that sends the CSRF cookie + session via axios.
    // On Hostinger shared hosting, the session cookie & XSRF token are
    // critical for the auth endpoint to recognize the logged-in user.
    authorizer: (channel) => ({
        authorize: (socketId, callback) => {
            axios.post('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name,
            }, {
                // Ensure cookies (session + XSRF token) are sent with the request
                withCredentials: true,
            })
            .then(response => {
                callback(null, response.data);
            })
            .catch(error => {
                console.error(
                    `[Echo] Auth failed for ${channel.name}`,
                    `Status: ${error.response?.status}`,
                    `Body:`, error.response?.data || error.message,
                );
                callback(true, error);
            });
        },
    }),
});
