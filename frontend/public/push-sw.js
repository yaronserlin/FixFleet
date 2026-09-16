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

/**
 * Syncs the home-screen app icon badge (the Badging API) to the server's
 * unread count. Called on every push so the badge is accurate even if this
 * device missed earlier pushes -- it reflects the true count, not a local
 * increment that could drift.
 *
 * Best-effort and silent: unsupported browsers (notably iOS Safari, as of
 * this writing) and any network/auth hiccup must never surface as an error,
 * since the notification itself already showed.
 */
async function syncAppBadge() {
    if (!('setAppBadge' in navigator)) return;
    try {
        const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
        if (!res.ok) return;
        const { unreadCount } = await res.json();
        if (unreadCount > 0) {
            await navigator.setAppBadge(unreadCount);
        } else {
            await navigator.clearAppBadge();
        }
    } catch {
        // Best-effort only -- see comment above.
    }
}

/**
 * Tells every open tab of this app that a push just arrived, so an
 * already-open window updates its notification feed (and, transitively, the
 * page data it's looking at -- see NotificationFeedContext.jsx) the moment
 * this fires instead of waiting for its next poll tick, which could be up
 * to a minute away. This is what makes an admin's announcement feel live to
 * someone already sitting on the page, rather than something that only
 * shows up after they reload -- polling alone can't do better than
 * "eventually", and push delivery is normally a second or two.
 *
 * Scoped to `includeUncontrolled: true` window clients so it reaches every
 * open tab, not just ones this SW version happens to control yet.
 */
async function notifyOpenClients(payload) {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    windowClients.forEach((client) => {
        client.postMessage({ type: 'PUSH_NOTIFICATION_RECEIVED', payload });
    });
}

self.addEventListener('push', (event) => {
    const payload = readPayload(event);
    const title = payload.title || DEFAULT_TITLE;

    const options = {
        body: payload.body || '',
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        // Carried through to the click handler so it knows where to go, and
        // which notification to mark read (see notificationclick below).
        data: {
            link: payload.link || '/notifications',
            type: payload.type || null,
            notificationId: payload.notificationId || null,
        },
        // Group by type so a burst of fault reports collapses into the
        // latest one rather than stacking a dozen entries in the tray.
        tag: payload.type || 'notification',
        renotify: true,
    };

    event.waitUntil(Promise.all([
        self.registration.showNotification(title, options),
        syncAppBadge(),
        notifyOpenClients(payload),
    ]));
});

/**
 * Marks the tapped notification read server-side, so the unread badge
 * reflects it without the user separately opening the in-app list -- which
 * they may never do if the push's own link already took them where they
 * needed. Uses the `token`/`accessToken` cookie authMiddleware.js accepts
 * as a fallback to the Authorization header (see backend/controllers/
 * authController.js), since a service worker has no access to the page's
 * localStorage-held JWT. Best-effort: an older cached SW build or a push
 * sent before this field existed just won't have a `notificationId`, and
 * any network/auth failure here must never block opening the notification.
 */
async function markNotificationRead(notificationId) {
    if (!notificationId) return;
    try {
        await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PATCH',
            credentials: 'include',
        });
        await syncAppBadge();
    } catch {
        // Best-effort only -- see comment above.
    }
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const link = data.link || '/notifications';
    const targetUrl = new URL(link, self.location.origin).href;

    event.waitUntil(Promise.all([
        markNotificationRead(data.notificationId),
        (async () => {
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
        })(),
    ]));
});
