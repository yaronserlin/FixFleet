// src/components/PullToRefresh/PullToRefresh.jsx
import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import usePullToRefresh from '../../hooks/usePullToRefresh';

/**
 * Wraps page content with a native-app-style "pull to refresh": a downward
 * touch drag while already scrolled to the top of the page shows a small
 * spinner indicator and calls `onRefresh` on release past the pull
 * threshold. Built on the reusable usePullToRefresh hook so pages don't
 * each reimplement the gesture -- just wrap the page's returned content:
 *
 *   <PullToRefresh onRefresh={fetchData}>
 *     <Container>...</Container>
 *   </PullToRefresh>
 *
 * The gesture only ever fires from an actual touch drag at scrollTop 0, so
 * this is a no-op visually until then -- safe to leave mounted at every
 * viewport width, though it matters most on phone.
 */
export default function PullToRefresh({ onRefresh, disabled = false, children }) {
    const { containerRef, pullDistance, refreshing, threshold } = usePullToRefresh({
        onRefresh,
        disabled,
    });

    const indicatorHeight = refreshing ? threshold : pullDistance;
    const progress = threshold > 0 ? Math.min((pullDistance / threshold) * 100, 100) : 0;
    const visible = indicatorHeight > 0;

    return (
        <Box ref={containerRef}>
            <Box
                aria-hidden={!visible}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: indicatorHeight,
                    overflow: 'hidden',
                    transition: refreshing || pullDistance === 0 ? 'height 0.2s ease' : 'none',
                }}
            >
                <CircularProgress
                    size={24}
                    thickness={4}
                    variant={refreshing ? 'indeterminate' : 'determinate'}
                    value={refreshing ? undefined : progress}
                    sx={{ opacity: visible ? 1 : 0, transition: 'opacity 0.15s ease' }}
                />
            </Box>
            {children}
        </Box>
    );
}
