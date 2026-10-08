import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, Chip, List, ListItemButton, ListItemText, Skeleton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import PublicHeader from '../components/PublicHeader/PublicHeader';
import { PUBLIC_CONTAINER } from '../components/PublicHeader/publicLayout';
import LegalFooter from '../components/Legal/LegalFooter';
import { GUIDE_SOURCE, parseGuide } from '../utils/guideContent';

// Same red as the numbered callouts baked into the screenshots.
const MARK = '#E11D48';

const panel = { border: 1, borderColor: 'divider', bgcolor: 'background.paper' };
const tint = (key) => (t) => ({ bgcolor: alpha(t.palette[key].main, 0.08), borderColor: `${key}.main`, '& .lab': { color: `${key}.main` } });

// Styles for the guide's own markup, expressed with the app theme so the
// guide follows light/dark mode and matches the rest of the app.
const contentSx = {
    minWidth: 0,
    fontSize: '1rem',
    lineHeight: 1.7,
    color: 'text.primary',
    '& p': { color: 'text.secondary', maxWidth: '68ch', mt: 0, mb: 2 },
    '& a': { color: 'primary.main', fontWeight: 600 },
    '& b.ui': { color: 'text.primary', fontWeight: 600 },
    '& code': { fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: '0.86em', px: 0.5, borderRadius: 1, ...panel, bgcolor: 'background.subtle' },
    '& .legend': { display: 'flex', alignItems: 'center', gap: 1.25, fontSize: '0.875rem', p: 1.5, mb: 4, borderRadius: 2, ...panel },
    '& .legend i': { width: 22, height: 22, flex: 'none', borderRadius: '50%', bgcolor: MARK, color: '#fff', fontStyle: 'normal', fontWeight: 700, fontSize: 12, lineHeight: '22px', textAlign: 'center' },
    '& section, & h3[id]': { scrollMarginTop: 96 },
    '& section + section': { mt: 7, pt: 7, borderTop: 1, borderColor: 'divider' },
    '& .eyebrow': { m: 0, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'primary.main' },
    '& h2.sec': { mt: 0.5, mb: 2, fontSize: { xs: '1.75rem', md: '2.125rem' }, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 },
    '& h3': { display: 'flex', alignItems: 'center', gap: 1.25, mt: 5, mb: 1.5, fontSize: '1.25rem', fontWeight: 700 },
    '& h3 .ico': { width: 32, height: 32, flex: 'none', borderRadius: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.1) },
    '& h3 .ico svg': { width: 18, height: 18 },
    '& .who': { display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 },
    '& .role': { fontSize: '0.75rem', fontWeight: 700, px: 1.1, py: 0.25, borderRadius: 999, ...panel, color: 'text.secondary' },
    '& ol.steps': { listStyle: 'none', p: 0, m: 0, mb: 2.5, display: 'grid', gap: 1.25, counterReset: 's', maxWidth: '68ch' },
    '& ol.steps > li': { counterIncrement: 's', position: 'relative', pl: 5, minHeight: 28, color: 'text.secondary' },
    '& ol.steps > li::before': { content: 'counter(s)', position: 'absolute', left: 0, top: 0, width: 26, height: 26, borderRadius: '50%', bgcolor: MARK, color: '#fff', fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    '& figure.shot': { m: 0, mb: 3, borderRadius: 3, overflow: 'hidden', ...panel, boxShadow: '0 1px 2px rgba(15,23,42,.06), 0 10px 30px -8px rgba(15,23,42,.18)' },
    '& figure.shot img': { display: 'block', width: '100%', height: 'auto' },
    '& figure.shot.phone': { maxWidth: 360 },
    '& figure.shot figcaption': { px: 2, py: 1.25, fontSize: '0.8125rem', color: 'text.secondary', borderTop: 1, borderColor: 'divider' },
    '& figure.shot figcaption b': { color: 'text.primary', mr: 0.75 },
    '& .note': { p: 2, mb: 3, borderRadius: 2, borderLeft: '4px solid', maxWidth: '68ch', fontSize: '0.9375rem' },
    '& .note .lab': { display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
    '& .note .lab svg': { width: 16, height: 16 },
    '& .note.info': tint('info'),
    '& .note.tip': tint('success'),
    '& .note.warn': tint('warning'),
    '& .tbl': { overflowX: 'auto', mb: 3, borderRadius: 3, ...panel },
    '& table': { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
    '& th, & td': { textAlign: 'left', px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' },
    '& thead th': { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', bgcolor: 'background.subtle' },
    '& tbody tr:last-child td': { borderBottom: 0 },
    '& td.c': { textAlign: 'center', fontWeight: 600 },
    '& .y': { color: 'success.main' },
    '& .n': { color: 'text.disabled' },
    '& .status': { display: 'inline-block', px: 1, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' },
    '& .status.open': { bgcolor: 'error.main' },
    '& .status.closed': { bgcolor: 'success.main' },
    '& .status.due': { bgcolor: 'warning.main' },
    '& .status.normal': { color: 'success.main', boxShadow: (t) => `inset 0 0 0 1px ${t.palette.success.main}` },
    '& details': { mb: 1.25, borderRadius: 3, maxWidth: '68ch', ...panel },
    '& summary': { cursor: 'pointer', px: 2, py: 1.5, fontWeight: 600, listStyle: 'none', display: 'flex', justifyContent: 'space-between', gap: 1.5 },
    '& summary::-webkit-details-marker': { display: 'none' },
    '& summary::after': { content: '"+"', color: 'primary.main' },
    '& details[open] summary::after': { content: '"–"' },
    '& details > div': { px: 2, pb: 1.75, color: 'text.secondary' },
    '& footer.end': { mt: 7, pt: 2.5, borderTop: 1, borderColor: 'divider', fontSize: '0.8125rem', color: 'text.secondary' },
};

function GuideSkeleton() {
    return (
        <Box aria-busy="true" aria-label="Loading the user guide">
            <Skeleton width="30%" height={28} />
            <Skeleton width="60%" height={48} />
            {[0, 1, 2].map(i => <Skeleton key={i} width="90%" />)}
            <Skeleton variant="rounded" height={280} sx={{ mt: 2 }} />
        </Box>
    );
}

/** Highlights the section currently in view, for the contents list. */
function useActiveSection(toc) {
    const [active, setActive] = useState(null);
    useEffect(() => {
        if (!toc.length || !('IntersectionObserver' in window)) return undefined;
        const observer = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
            { rootMargin: '-20% 0px -70% 0px' },
        );
        toc.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, [toc]);
    return active;
}

/**
 * The illustrated user guide as an app page. Public: signed-out visitors
 * get the public header and footer; signed-in users see it inside the
 * normal app layout.
 */
export default function GuidePage() {
    const { user } = useAuth();
    const { hash } = useLocation();
    const [guide, setGuide] = useState(null);
    const [error, setError] = useState(false);
    const active = useActiveSection(guide?.toc || []);

    useEffect(() => {
        let cancelled = false;
        fetch(GUIDE_SOURCE)
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
            .then(html => { if (!cancelled) setGuide(parseGuide(html)); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, []);

    // Deep links (/guide#faults) and contents clicks: scroll once the content exists.
    useEffect(() => {
        if (!guide || !hash) return;
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    }, [guide, hash]);

    const toc = guide?.toc || [];

    return (
        <Box sx={{ minHeight: user ? undefined : '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
            {!user && <PublicHeader />}

            <Box sx={{ ...PUBLIC_CONTAINER, flex: 1, py: { xs: 4, md: 6 } }}>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>Help</Typography>
                <Typography variant="h3" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.025em', mb: 1, fontSize: { xs: '2rem', md: '2.75rem' } }}>
                    User guide
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: '68ch', mb: { xs: 3, md: 5 } }}>
                    {guide?.lede || 'Step-by-step help for operators, mechanics and admins.'}
                </Typography>

                {/* Phones/tablets: contents as a scrollable chip row. */}
                {toc.length > 0 && (
                    <Box component="nav" aria-label="Guide contents" sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, overflowX: 'auto', pb: 1, mb: 3, mx: { xs: -2, sm: -3 }, px: { xs: 2, sm: 3 } }}>
                        {toc.map(t => (
                            <Chip key={t.id} label={t.label} component={RouterLink} to={{ hash: `#${t.id}` }} clickable variant={active === t.id ? 'filled' : 'outlined'} color={active === t.id ? 'primary' : 'default'} />
                        ))}
                    </Box>
                )}

                <Box sx={{ display: 'grid', gap: 5, gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, alignItems: 'start' }}>
                    <Box component="nav" aria-label="Guide contents" sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: user ? 24 : 88 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, px: 1.5 }}>Contents</Typography>
                        <List dense disablePadding>
                            {toc.map(t => (
                                <ListItemButton key={t.id} component={RouterLink} to={{ hash: `#${t.id}` }} selected={active === t.id} sx={{ borderRadius: 1.5 }}>
                                    <ListItemText primary={t.label} slotProps={{ primary: { fontSize: '0.875rem', fontWeight: active === t.id ? 700 : 500 } }} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>

                    {error && (
                        <Alert severity="error">
                            The user guide could not be loaded. Check your connection and refresh the page.
                        </Alert>
                    )}
                    {!error && !guide && <GuideSkeleton />}
                    {guide && (
                        // Trusted, first-party content shipped with the app (see GUIDE_SOURCE).
                        <Box component="article" sx={contentSx} dangerouslySetInnerHTML={{ __html: guide.html }} />
                    )}
                </Box>
            </Box>

            {!user && (
                <Box sx={{ ...PUBLIC_CONTAINER, pb: 3 }}>
                    <LegalFooter />
                </Box>
            )}
        </Box>
    );
}
