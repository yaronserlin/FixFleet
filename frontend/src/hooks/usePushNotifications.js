// src/hooks/usePushNotifications.js
import { useCallback, useEffect, useState } from 'react';
import notificationsService from '../services/notificationsService';

/**
 * Converts a base64url VAPID key into the Uint8Array that
 * `PushManager.subscribe()` demands. The Push API predates browsers
 * accepting a plain string here, so every client has to do this dance.
 *
 * @param {string} base64String - VAPID public key, base64url-encoded.
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
        output[i] = rawData.charCodeAt(i);
    }
    return output;
}

/**
 * True when this browser can do web push at all. Notably false on iOS
 * Safari until the user installs the app to the home screen, and in any
 * non-secure context.
 */
function browserSupportsPush() {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Manages this browser's web push subscription: whether push is possible,
 * whether it's currently on, and turning it on/off.
 *
 * Deliberately says little and fails softly. Push is an enhancement on top
 * of the in-app feed, so every failure path here (unsupported browser,
 * denied permission, server without VAPID keys) resolves to "push is off"
 * rather than an error the user has to deal with.
 *
 * @returns {{
 *   supported: boolean,
 *   enabled: boolean,
 *   permission: NotificationPermission|'default',
 *   serverConfigured: boolean,
 *   busy: boolean,
 *   ready: boolean,
 *   subscribe: () => Promise<boolean>,
 *   unsubscribe: () => Promise<boolean>,
 * }}
 */
export default function usePushNotifications() {
    const supported = browserSupportsPush();

    const [enabled, setEnabled] = useState(false);
    const [permission, setPermission] = useState(
        supported ? Notification.permission : 'default'
    );
    const [serverConfigured, setServerConfigured] = useState(false);
    const [busy, setBusy] = useState(false);
    // Distinguishes "we haven't looked yet" from "we looked, push is off",
    // so the UI can avoid flashing a wrong toggle state on mount.
    const [ready, setReady] = useState(false);

    // On mount: ask the server whether push is configured at all, and check
    // whether this browser already holds a subscription.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!supported) {
                if (!cancelled) setReady(true);
                return;
            }
            try {
                const { enabled: configured } = await notificationsService.getPushPublicKey();
                if (cancelled) return;
                setServerConfigured(Boolean(configured));

                const registration = await navigator.serviceWorker.ready;
                const existing = await registration.pushManager.getSubscription();
                if (cancelled) return;
                setEnabled(Boolean(existing));
            } catch (err) {
                // A server without VAPID keys, or a service worker that never
                // activated: push simply stays off.
                console.warn('Push notification status check failed:', err);
            } finally {
                if (!cancelled) setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, [supported]);

    /**
     * Requests permission if needed, subscribes this browser, and registers
     * the endpoint with the server.
     * @returns {Promise<boolean>} True if push is on afterwards.
     */
    const subscribe = useCallback(async () => {
        if (!supported || busy) return false;

        setBusy(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result !== 'granted') {
                setEnabled(false);
                return false;
            }

            const { enabled: configured, publicKey } = await notificationsService.getPushPublicKey();
            setServerConfigured(Boolean(configured));
            if (!configured || !publicKey) {
                setEnabled(false);
                return false;
            }

            const registration = await navigator.serviceWorker.ready;
            // Reuse an existing subscription if the browser already has one;
            // re-subscribing would mint a new endpoint and orphan the old.
            const existing = await registration.pushManager.getSubscription();
            const subscription = existing || await registration.pushManager.subscribe({
                // Required by every current browser: pushes must be shown.
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            await notificationsService.subscribeToPush(subscription);
            setEnabled(true);
            return true;
        } catch (err) {
            console.warn('Failed to enable push notifications:', err);
            setEnabled(false);
            return false;
        } finally {
            setBusy(false);
        }
    }, [supported, busy]);

    /**
     * Unsubscribes this browser and forgets the endpoint server-side.
     * @returns {Promise<boolean>} True if push is off afterwards.
     */
    const unsubscribe = useCallback(async () => {
        if (!supported || busy) return false;

        setBusy(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Tell the server first: if the browser-side unsubscribe
                // succeeded but this call didn't, the server would keep
                // pushing to a dead endpoint until it got a 410 back.
                await notificationsService.unsubscribeFromPush(subscription.endpoint).catch((err) => {
                    console.warn('Failed to deregister push endpoint server-side:', err);
                });
                await subscription.unsubscribe();
            }

            setEnabled(false);
            return true;
        } catch (err) {
            console.warn('Failed to disable push notifications:', err);
            return false;
        } finally {
            setBusy(false);
        }
    }, [supported, busy]);

    return {
        supported,
        enabled,
        permission,
        serverConfigured,
        busy,
        ready,
        subscribe,
        unsubscribe,
    };
}

export { urlBase64ToUint8Array, browserSupportsPush };
