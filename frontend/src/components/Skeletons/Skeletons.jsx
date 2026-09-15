// src/components/Skeletons/Skeletons.jsx
//
// Shared loading-skeleton primitives.
//
// A skeleton should be a greyed-out tracing of the layout that is about to
// appear -- same container widths, same grid breakpoints, same rough block
// heights -- so the page doesn't visibly jump when real data lands. These
// building blocks capture the handful of shapes this app actually uses
// (page header, filter bar, KPI row, card grid, table, detail banner...) so
// every screen's skeleton is assembled from the same vocabulary instead of
// each one hand-rolling its own (or falling back to a bare spinner).
import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import { skeletonA11yProps } from './skeletonA11y';

/**
 * Page title + subtitle, with the optional header action button(s) on the
 * right. `actions` is either a count, or an array of per-button `sx`
 * overrides -- the latter lets a skeleton hide the same buttons the real
 * header hides at a given breakpoint (see narrow-screen rules on Dashboard).
 */
export function PageHeaderSkeleton({ actions = 1, subtitle = true, sx, ...rest }) {
    const actionItems = Array.isArray(actions)
        ? actions
        : Array.from({ length: actions }, () => undefined);
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mb: 3.5,
                ...sx,
            }}
            {...rest}
        >
            <Box sx={{ width: '100%' }}>
                <Skeleton variant="text" width="60%" height={44} sx={{ maxWidth: 360 }} />
                {subtitle && <Skeleton variant="text" width="80%" height={22} sx={{ maxWidth: 460 }} />}
            </Box>
            {actionItems.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
                    {actionItems.map((itemSx, i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            width={148}
                            height={44}
                            sx={{ borderRadius: 2, ...itemSx }}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}

/** Status filter chips + search field row. */
export function FilterBarSkeleton({ chips = 3, search = true, sx, ...rest }) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                mb: 2.5,
                ...sx,
            }}
            {...rest}
        >
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {Array.from({ length: chips }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" width={96} height={24} sx={{ borderRadius: 4 }} />
                ))}
            </Box>
            {search && (
                <Skeleton
                    variant="rounded"
                    height={40}
                    sx={{ borderRadius: 1, width: { xs: '100%', sm: 220 }, flexShrink: 0 }}
                />
            )}
        </Box>
    );
}

/**
 * A responsive grid of equal-sized rounded blocks -- the shape of every card
 * list in the app (faults, equipment, manuals).
 */
export function CardGridSkeleton({
    count = 6,
    height = 180,
    size = { xs: 12, sm: 6, md: 4 },
    spacing = 2,
    sx,
    ...rest
}) {
    return (
        <Grid container spacing={spacing} sx={sx} {...rest}>
            {Array.from({ length: count }).map((_, i) => (
                <Grid size={size} key={i}>
                    <Skeleton variant="rounded" height={height} sx={{ borderRadius: 3 }} />
                </Grid>
            ))}
        </Grid>
    );
}

/**
 * The dashboard's KPI stat row. `display` is forwarded so a caller can hide
 * it at the same breakpoints the real cards are hidden at, keeping the
 * skeleton honest about what will actually render.
 */
export function KpiCardsSkeleton({ count = 4, display, sx, ...rest }) {
    return (
        <Grid container spacing={2} sx={{ display, mb: 4, ...sx }} {...rest}>
            {Array.from({ length: count }).map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                    <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
                </Grid>
            ))}
        </Grid>
    );
}

/** A titled chart card: heading, legend, and the plot area. */
export function ChartCardSkeleton({ height = { xs: 160, sm: 220 }, sx, ...rest }) {
    return (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 4, ...sx }} {...rest}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                <Box>
                    <Skeleton variant="text" width={220} height={26} />
                    <Skeleton variant="text" width={280} height={18} />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Skeleton variant="text" width={70} height={18} />
                    <Skeleton variant="text" width={70} height={18} />
                </Box>
            </Box>
            <Skeleton variant="rounded" height={height} sx={{ borderRadius: 2 }} />
        </Paper>
    );
}

/** Header row + body rows of a data table. */
export function TableSkeleton({ rows = 5, columns = 4, sx, ...rest }) {
    return (
        <Box sx={sx} {...rest}>
            <Box sx={{ display: 'flex', gap: 2, px: 1, py: 1.5 }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} variant="text" height={20} sx={{ flex: 1 }} />
                ))}
            </Box>
            {Array.from({ length: rows }).map((_, r) => (
                <Box
                    key={r}
                    sx={{
                        display: 'flex',
                        gap: 2,
                        px: 1,
                        py: 1.25,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {Array.from({ length: columns }).map((_, c) => (
                        <Skeleton key={c} variant="text" height={24} sx={{ flex: 1 }} />
                    ))}
                </Box>
            ))}
        </Box>
    );
}

/** Stacked full-width rows -- list items, uploaded files, history entries. */
export function ListRowsSkeleton({ rows = 4, height = 64, spacing = 1.5, sx, ...rest }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing, ...sx }} {...rest}>
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={height} sx={{ borderRadius: 2 }} />
            ))}
        </Box>
    );
}

/** The accent-bordered banner at the top of a detail page (equipment, profile). */
export function DetailBannerSkeleton({ sx, ...rest }) {
    return (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, mb: 3, ...sx }} {...rest}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                <Skeleton variant="text" width={240} height={40} />
                <Skeleton variant="rounded" width={110} height={24} sx={{ borderRadius: 4 }} />
                <Skeleton variant="rounded" width={130} height={28} sx={{ borderRadius: 4 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Skeleton variant="text" width={140} height={20} />
                <Skeleton variant="text" width={160} height={20} />
                <Skeleton variant="rounded" width={170} height={24} sx={{ borderRadius: 4 }} />
            </Box>
        </Paper>
    );
}

/** A tab strip sitting above its panel. */
export function TabsSkeleton({ count = 3, sx, ...rest }) {
    return (
        <Box sx={{ display: 'flex', gap: 3, borderBottom: 1, borderColor: 'divider', pb: 1.5, mb: 3, ...sx }} {...rest}>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} variant="text" height={28} sx={{ flex: 1, maxWidth: 200 }} />
            ))}
        </Box>
    );
}

/** Labelled form fields plus a submit button. */
export function FormSkeleton({ fields = 3, action = true, sx, ...rest }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, ...sx }} {...rest}>
            {Array.from({ length: fields }).map((_, i) => (
                <Box key={i}>
                    <Skeleton variant="text" width={120} height={18} sx={{ mb: 0.5 }} />
                    <Skeleton variant="rounded" height={44} sx={{ borderRadius: 1 }} />
                </Box>
            ))}
            {action && <Skeleton variant="rounded" width={160} height={42} sx={{ borderRadius: 2 }} />}
        </Box>
    );
}

/**
 * Generic whole-page skeleton, for when the concrete layout isn't known yet
 * (e.g. the router's lazy-chunk fallback, before the page module has even
 * been parsed).
 */
export function PageSkeleton({ maxWidth = 'xl', label = 'Loading page' }) {
    return (
        <Container maxWidth={maxWidth} sx={{ mt: 3, mb: 6 }} {...skeletonA11yProps(label)}>
            <PageHeaderSkeleton />
            <FilterBarSkeleton />
            <CardGridSkeleton count={6} />
        </Container>
    );
}
