/* global clients */
//
// Web Push handlers for the PWA service worker.
//
// vite-plugin-pwa runs in Workbox's `generateSW` mode, so the service
// worker itself is generated at build time and can't be hand-edited. This
// file is pulled into it via `workbox.importScripts` (see vite.config.js),
// which keeps the generated precaching intact while adding the two event
// handlers push notifications need. It runs in the service worker's global
// scope, not the page's -- no bundler, no imports, plain classic script.
//
// Payloads are produced by backend/services/pushService.js:
//   { type, title, body, link }

const DEFAULT_TITLE = 'Maintenance';
const NOTIFICATION_ICON = '/pwa-192x192.png';
const NOTIFICATION_BADGE = '/pwa-192x192.png';

/**
 * Reads the push payload defensively: a push can legitimately arrive with
 * no data at all (some services send empty "wake up" pushes), and a
 * malformed body must not throw inside the event handler -- doing so would
 * leave the user with the browser's generic "This site has been updated in
 * the background" notification.
 */
function readPayload(event) {
    if (!event.data) return {};
    try {
        return event.data.json() || {};
    } catch {
        try {
            return { body: event.data.text() };
        } catch {
            return {};
        }
    }
}

self.addEventListener('push', (event) => {
    const payload = readPayload(event);
    const title = payload.title || DEFAULT_TITLE;

    const options = {
        body: payload.body || '',
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        // Carried through to the click handler so it knows where to go.
        data: { link: payload.link || '/notifications', type: payload.type || null },
        // Group by type so a burst of fault reports collapses into the
        // latest one rather than stacking a dozen entries in the tray.
        tag: payload.type || 'notification',
        renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const link = (event.notification.data && event.notification.data.link) || '/notifications';
    const targetUrl = new URL(link, self.location.origin).href;

    event.waitUntil((async () => {
        const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

        // Prefer focusing a tab that's already on the target, then any open
        // tab of this app (navigating it), and only open a new window as a
        // last resort -- tapping a notification shouldn't pile up tabs.
        const exact = windowClients.find(client => client.url === targetUrl);
        if (exact) {
            return exact.focus();
        }

        const anyAppWindow = windowClients.find(client => client.url.startsWith(self.location.origin));
        if (anyAppWindow) {
            await anyAppWindow.focus();
            if ('navigate' in anyAppWindow) {
                return anyAppWindow.navigate(targetUrl);
            }
            return undefined;
        }

        if (clients.openWindow) {
            return clients.openWindow(targetUrl);
        }
        return undefined;
    })());
});
