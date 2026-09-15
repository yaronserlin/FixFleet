// src/contexts/PageRefreshContext.jsx
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from 'react';

/**
 * Wires the app-wide "pull to refresh" gesture (mounted once by AppLayout in
 * src/routes.jsx) to whichever page is currently on screen.
 *
 * Pages don't each wrap themselves in <PullToRefresh> -- that made the
 * gesture available on only the handful of pages that remembered to do it,
 * and each wrapper rendered its own indicator. Instead the layout owns a
 * single gesture/indicator, and every page declares what "refresh" means for
 * it by calling `usePageRefresh(fetchFn)`:
 *
 *   const load = useCallback(async () => { ... }, [deps]);
 *   usePageRefresh(load);
 *
 * Handlers are kept in a Set rather than a single slot, so a page and any
 * self-fetching child it renders can each register and all get refreshed
 * together by one pull.
 */
const PageRefreshContext = createContext(null);

export function PageRefreshProvider({ children }) {
    // A plain ref (not state): registering/unregistering a handler must never
    // re-render the whole routed tree, and `refresh` must stay referentially
    // stable so the gesture's touch listeners aren't torn down mid-pull.
    const handlersRef = useRef(new Set());

    const registerRefreshHandler = useCallback((handler) => {
        const handlers = handlersRef.current;
        handlers.add(handler);
        return () => { handlers.delete(handler); };
    }, []);

    const refresh = useCallback(async () => {
        const handlers = Array.from(handlersRef.current);
        if (handlers.length === 0) return;
        // One failing handler must not abort the others, and a rejection here
        // would leave the pull indicator spinning -- pages already surface
        // their own fetch errors, so just log and settle.
        await Promise.all(handlers.map(async (handler) => {
            try {
                await handler();
            } catch (err) {
                console.error('Page refresh handler failed:', err);
            }
        }));
    }, []);

    const value = useMemo(
        () => ({ registerRefreshHandler, refresh }),
        [registerRefreshHandler, refresh]
    );

    return (
        <PageRefreshContext.Provider value={value}>
            {children}
        </PageRefreshContext.Provider>
    );
}

/**
 * Registers `onRefresh` as the current page's refresh action for as long as
 * the calling component is mounted.
 *
 * `onRefresh` may be a fresh closure on every render (it's read through a
 * ref), so callers don't have to memoize it to avoid re-registering -- though
 * memoizing it with useCallback is still worthwhile for their own effects.
 *
 * Outside a PageRefreshProvider this is a no-op, so pages stay renderable in
 * isolation (unit tests, Storybook-style harnesses).
 */
export function usePageRefresh(onRefresh) {
    const ctx = useContext(PageRefreshContext);
    const register = ctx?.registerRefreshHandler;
    const handlerRef = useRef(onRefresh);

    useEffect(() => {
        handlerRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        if (!register) return undefined;
        // Register a stable wrapper that reads the latest handler, so the
        // subscription survives the handler's identity changing.
        const stableHandler = () => handlerRef.current?.();
        return register(stableHandler);
    }, [register]);
}

/**
 * Returns a function that runs every currently-registered page refresh
 * handler. Used by the layout's pull-to-refresh gesture; also handy for an
 * explicit "Retry"/"Refresh" control. No-ops outside a provider.
 */
export function usePageRefreshTrigger() {
    const ctx = useContext(PageRefreshContext);
    const refresh = ctx?.refresh;
    return useMemo(
        () => refresh || (() => Promise.resolve()),
        [refresh]
    );
}

export default PageRefreshContext;
