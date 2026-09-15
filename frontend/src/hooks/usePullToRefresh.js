// src/hooks/usePullToRefresh.js
import { useEffect, useRef, useState, useCallback } from 'react';

const DEFAULT_THRESHOLD = 70; // px of pull needed before release triggers a refresh
const DEFAULT_MAX_PULL = 120; // px cap on how far the visual indicator is allowed to travel
const PULL_RESISTANCE = 0.5; // pulling feels "heavier" than a 1:1 finger-follow drag

/**
 * Native-app-style "pull to refresh": a downward touch drag while already
 * scrolled to the top of the page triggers `onRefresh`.
 *
 * Hand-rolled with plain touchstart/touchmove/touchend listeners (no
 * gesture library dependency). Returns a ref to attach to the scrollable
 * page wrapper, plus the live pull distance / refreshing state so callers
 * can render their own indicator -- or just use the <PullToRefresh>
 * wrapper component (src/components/PullToRefresh/PullToRefresh.jsx),
 * which already does that.
 *
 * By default "at the top" is measured against `window.scrollY`, matching
 * how pages in this app actually scroll (the page content grows the
 * document height; there's no independently-scrolling inner container).
 * Pass `getScrollTop` to check a different scroll container instead.
 */
export default function usePullToRefresh({
    onRefresh,
    disabled = false,
    threshold = DEFAULT_THRESHOLD,
    maxPull = DEFAULT_MAX_PULL,
    getScrollTop,
} = {}) {
    const containerRef = useRef(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    // Mutable touch/gesture bookkeeping that must never trigger a re-render
    // or (worse) an effect re-run mid-gesture -- kept out of React state.
    const gesture = useRef({ startY: 0, dragging: false, pullDistance: 0, refreshing: false });

    const readScrollTop = useCallback(() => {
        if (typeof getScrollTop === 'function') return getScrollTop();
        if (typeof window === 'undefined') return 0;
        return window.scrollY ?? document.documentElement.scrollTop ?? 0;
    }, [getScrollTop]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || disabled) return undefined;

        function handleTouchStart(e) {
            if (gesture.current.refreshing || e.touches.length !== 1) {
                gesture.current.dragging = false;
                return;
            }
            if (readScrollTop() > 0) {
                gesture.current.dragging = false;
                return;
            }
            gesture.current.startY = e.touches[0].clientY;
            gesture.current.dragging = true;
        }

        function reset() {
            gesture.current.dragging = false;
            gesture.current.pullDistance = 0;
            setPullDistance(0);
        }

        function handleTouchMove(e) {
            if (!gesture.current.dragging || gesture.current.refreshing) return;

            const deltaY = e.touches[0].clientY - gesture.current.startY;
            if (deltaY <= 0 || readScrollTop() > 0) {
                reset();
                return;
            }

            // Only now do we know this gesture is "ours" -- prevent the
            // default scroll/bounce so the pull indicator tracks the
            // finger instead of the page rubber-banding underneath it.
            e.preventDefault();
            const next = Math.min(deltaY * PULL_RESISTANCE, maxPull);
            gesture.current.pullDistance = next;
            setPullDistance(next);
        }

        async function handleTouchEnd() {
            if (!gesture.current.dragging) return;
            gesture.current.dragging = false;

            if (gesture.current.pullDistance < threshold) {
                reset();
                return;
            }

            gesture.current.refreshing = true;
            setRefreshing(true);
            setPullDistance(threshold);
            try {
                await onRefresh?.();
            } finally {
                gesture.current.refreshing = false;
                gesture.current.pullDistance = 0;
                setRefreshing(false);
                setPullDistance(0);
            }
        }

        function handleTouchCancel() {
            reset();
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchcancel', handleTouchCancel);
        };
    }, [disabled, onRefresh, threshold, maxPull, readScrollTop]);

    return { containerRef, pullDistance, refreshing, threshold };
}
