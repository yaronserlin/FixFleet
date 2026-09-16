// src/contexts/NotificationFeedContext.jsx
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import notificationsService from '../services/notificationsService';
import { useAuth } from './AuthContext';
import { usePageRefreshTrigger } from './PageRefreshContext';

/**
 * The app's notification feed: the list behind the bell, its unread badge,
 * and the read/refresh actions.
 *
 * Named "feed" to keep it distinct from NotificationContext.jsx, which
 * despite the name is the toast/snackbar helper (`useNotify()`). These are
 * separate concerns: a toast is transient UI feedback for something you
 * just did; this is a durable, server-backed record of things that happened
 * while you weren't looking.
 *
 * There's no websocket layer in this app, so freshness comes from polling
 * the cheap unread-count endpoint, plus a refetch whenever the tab regains
 * focus (the common case: a push notification brought you back).
 */
const NotificationFeedContext = createContext(null);

/**
 * How often to poll the unread count while the tab is visible -- the
 * fallback for a tab that (a) never receives the push-driven instant
 * refresh below, because this browser/device never granted notification
 * permission, or (b) stays continuously visible, so the visibilitychange
 * refetch never fires either.
 */
const POLL_INTERVAL_MS = 20_000;

export function NotificationFeedProvider({ children }) {
    const { user } = useAuth();
    // NotificationFeedProvider is mounted inside PageRefreshProvider (see
    // routes.jsx), so this reaches the same "refresh whatever the current
    // page registered" trigger PageRefreshContext's own poll and the pull-
    // gesture use -- see the unread-count-increased checks below.
    const refreshPage = usePageRefreshTrigger();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // A user who must still change their password is blocked from every
    // other API route, so polling would just generate 403s.
    const canFetch = Boolean(user) && !user?.mustChangePassword;

    // Read inside the poll timer without making it a dependency, so the
    // interval isn't torn down and recreated on every fetch.
    const canFetchRef = useRef(canFetch);
    useEffect(() => { canFetchRef.current = canFetch; }, [canFetch]);

    // Mirrors `notifications` so callbacks can read the current list without
    // taking it as a dependency (which would re-create them on every poll).
    const notificationsRef = useRef(notifications);
    useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

    // Lets refresh()/refreshUnreadCount() tell a rising count (new
    // notification arrived) apart from a falling one (something got marked
    // read) without depending on `unreadCount` state directly -- see below.
    const unreadCountRef = useRef(0);
    useEffect(() => { unreadCountRef.current = unreadCount; }, [unreadCount]);
    // Guards the very first load: there's no "other user's change" to react
    // to yet, just whatever was already unread when this tab opened, and the
    // page's own initial fetch already covers that.
    const hasLoadedOnceRef = useRef(false);

    /**
     * A new notification arriving is exactly the signal that someone else
     * changed the data this tab is looking at (a fault reported, an
     * announcement sent) -- so beyond updating the feed itself, it also
     * re-runs whatever the current page registered for its own refresh
     * (PageRefreshContext), rather than waiting for that context's
     * independent timer to come back around.
     */
    const maybeRefreshPageForNewNotifications = useCallback((newCount) => {
        if (hasLoadedOnceRef.current && newCount > unreadCountRef.current) {
            refreshPage();
        }
        hasLoadedOnceRef.current = true;
    }, [refreshPage]);

    const refresh = useCallback(async ({ showLoading = false } = {}) => {
        if (!canFetchRef.current) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }
        if (showLoading) setLoading(true);
        try {
            const data = await notificationsService.getAll({ limit: 20 });
            const newCount = data.unreadCount || 0;
            setNotifications(data.notifications || []);
            setUnreadCount(newCount);
            setError(null);
            maybeRefreshPageForNewNotifications(newCount);
        } catch (err) {
            // The feed is ambient: a failed poll shouldn't raise a toast or
            // block the page the user is actually working on.
            console.warn('Failed to load notifications:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [maybeRefreshPageForNewNotifications]);

    /** Polls just the badge count -- much cheaper than refetching the list. */
    const refreshUnreadCount = useCallback(async () => {
        if (!canFetchRef.current) return;
        try {
            const { unreadCount: count } = await notificationsService.getUnreadCount();
            const newCount = count || 0;
            setUnreadCount(newCount);
            maybeRefreshPageForNewNotifications(newCount);
        } catch (err) {
            console.warn('Failed to refresh unread notification count:', err);
        }
    }, [maybeRefreshPageForNewNotifications]);

    // Initial load, and a reload whenever the signed-in user changes.
    useEffect(() => {
        if (!canFetch) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }
        refresh({ showLoading: true });
    }, [canFetch, user?.id, user?._id, refresh]);

    // Keep the home-screen app icon badge (Badging API) in sync with the
    // unread count. Covers every path that changes it while the app is in
    // the foreground -- initial load, polling, mark read/all-read -- as a
    // companion to push-sw.js's own sync for pushes received in the
    // background. Feature-detected and best-effort: unsupported browsers
    // (notably iOS Safari outside an installed PWA) just skip it.
    useEffect(() => {
        if (!('setAppBadge' in navigator)) return;
        const sync = unreadCount > 0
            ? navigator.setAppBadge(unreadCount)
            : navigator.clearAppBadge();
        sync.catch(() => {});
    }, [unreadCount]);

    // Poll the badge while the tab is visible, and do a full refetch when it
    // becomes visible again -- that's when a push notification has just
    // brought the user back and the list is most likely stale.
    useEffect(() => {
        if (!canFetch) return undefined;

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshUnreadCount();
            }
        }, POLL_INTERVAL_MS);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                refresh();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [canFetch, refresh, refreshUnreadCount]);

    // The instant path: push-sw.js's `push` handler posts this to every open
    // tab the moment a push arrives (typically a second or two after the
    // server sends it), so a tab that's sitting open and focused -- where
    // neither the poll interval nor a visibilitychange has any reason to
    // fire soon -- still updates right away. Only reaches tabs whose user
    // has granted notification permission and subscribed (see
    // usePushNotifications.js); everyone else still gets the poll above.
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return undefined;
        const handleMessage = (event) => {
            if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
                refresh();
            }
        };
        navigator.serviceWorker.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }, [refresh]);

    /**
     * Marks one notification read, updating the list and badge optimistically
     * so the UI responds to the tap immediately.
     *
     * Whether it *was* unread is read from a ref rather than tracked inside
     * the `setNotifications` updater: that updater runs during render, well
     * after this function returns, so a flag set inside it would always read
     * stale here -- and React may invoke it twice, which would decrement the
     * badge twice for one tap.
     */
    const markRead = useCallback(async (id) => {
        const target = notificationsRef.current.find(n => n._id === id);
        const wasUnread = Boolean(target) && !target.readAt;

        setNotifications(prev => prev.map(n => (
            n._id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
        )));
        if (wasUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        try {
            await notificationsService.markRead(id);
        } catch (err) {
            console.warn('Failed to mark notification read:', err);
            // Re-sync rather than trying to invert the optimistic update:
            // the server is the authority on what's read.
            refresh();
        }
    }, [refresh]);

    /**
     * Deletes one notification, removing it from the list (and the unread
     * count, if it was unread) optimistically -- same rationale as
     * {@link markRead} for reading `wasUnread` from the ref.
     */
    const deleteNotification = useCallback(async (id) => {
        const target = notificationsRef.current.find(n => n._id === id);
        const wasUnread = Boolean(target) && !target.readAt;

        setNotifications(prev => prev.filter(n => n._id !== id));
        if (wasUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        try {
            await notificationsService.deleteNotification(id);
        } catch (err) {
            console.warn('Failed to delete notification:', err);
            // The server is the authority on what still exists; re-sync
            // rather than trying to re-insert the removed row in place.
            refresh();
        }
    }, [refresh]);

    /** Marks everything read, again optimistically. */
    const markAllRead = useCallback(async () => {
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => (n.readAt ? n : { ...n, readAt: now })));
        setUnreadCount(0);

        try {
            await notificationsService.markAllRead();
        } catch (err) {
            console.warn('Failed to mark all notifications read:', err);
            refresh();
        }
    }, [refresh]);

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        loading,
        error,
        refresh,
        refreshUnreadCount,
        markRead,
        deleteNotification,
        markAllRead,
    }), [notifications, unreadCount, loading, error, refresh, refreshUnreadCount, markRead, deleteNotification, markAllRead]);

    return (
        <NotificationFeedContext.Provider value={value}>
            {children}
        </NotificationFeedContext.Provider>
    );
}

/**
 * Reads the notification feed. Returns an inert, empty feed outside a
 * provider so components stay renderable in isolation (unit tests) instead
 * of throwing.
 */
export function useNotificationFeed() {
    const context = useContext(NotificationFeedContext);
    return context || EMPTY_FEED;
}

const noop = async () => {};
const EMPTY_FEED = Object.freeze({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    refresh: noop,
    refreshUnreadCount: noop,
    markRead: noop,
    deleteNotification: noop,
    markAllRead: noop,
});

export default NotificationFeedContext;
