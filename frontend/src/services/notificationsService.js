// src/services/notificationsService.js
import apiClient from './apiClient';

/**
 * Notification feed + web push registration.
 *
 * Note the naming: this talks to the *notification* API (the bell, the
 * feed, PWA push). The app's toast/snackbar helper is a different thing
 * entirely -- that's `useNotify()` from contexts/NotificationContext.jsx.
 */
const notificationsService = {
    /**
     * The current user's notifications, newest first.
     * @param {{ page?: number, limit?: number, unreadOnly?: boolean }} [params]
     * @returns {Promise<{ notifications: Array<Object>, unreadCount: number, page: number, limit: number, total: number, pages: number }>}
     */
    getAll: async (params = {}) => {
        const { data } = await apiClient.get('/notifications', { params });
        return data;
    },

    /**
     * Just the badge count -- cheap enough to poll.
     * @returns {Promise<{ unreadCount: number }>}
     */
    getUnreadCount: async () => {
        const { data } = await apiClient.get('/notifications/unread-count');
        return data;
    },

    /**
     * Marks one notification read.
     * @param {string} id
     * @returns {Promise<Object>} The updated notification.
     */
    markRead: async (id) => {
        const { data } = await apiClient.patch(`/notifications/${id}/read`);
        return data;
    },

    /**
     * Marks every unread notification read.
     * @returns {Promise<{ updated: number }>}
     */
    markAllRead: async () => {
        const { data } = await apiClient.post('/notifications/read-all');
        return data;
    },

    /**
     * Admin-only: broadcasts a message to users in the admin's own company.
     * @param {{ title: string, body: string, roles?: string[] }} payload - Omit `roles` to reach everyone.
     * @returns {Promise<{ recipients: number }>}
     */
    sendAnnouncement: async (payload) => {
        const { data } = await apiClient.post('/notifications/announcements', payload);
        return data;
    },

    /**
     * Whether the server has web push configured, and the VAPID key needed
     * to subscribe this browser.
     * @returns {Promise<{ enabled: boolean, publicKey: string }>}
     */
    getPushPublicKey: async () => {
        const { data } = await apiClient.get('/notifications/push/public-key');
        return data;
    },

    /**
     * Registers this browser's push endpoint against the current user.
     * @param {PushSubscription} subscription - The browser's subscription object.
     * @returns {Promise<{ subscribed: boolean }>}
     */
    subscribeToPush: async (subscription) => {
        const { data } = await apiClient.post('/notifications/push/subscriptions', {
            subscription: typeof subscription?.toJSON === 'function' ? subscription.toJSON() : subscription,
        });
        return data;
    },

    /**
     * Forgets this browser's push endpoint.
     * @param {string} endpoint
     * @returns {Promise<{ removed: boolean }>}
     */
    unsubscribeFromPush: async (endpoint) => {
        const { data } = await apiClient.delete('/notifications/push/subscriptions', {
            data: { endpoint },
        });
        return data;
    },
};

export default notificationsService;
