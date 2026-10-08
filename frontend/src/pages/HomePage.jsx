import React from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, CardContent, Chip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import PublicHeader from '../components/PublicHeader/PublicHeader';
import { PUBLIC_CONTAINER as CONTAINER } from '../components/PublicHeader/publicLayout';
import LegalFooter from '../components/Legal/LegalFooter';
import { ROUTES, homeRouteFor } from '../constants/routes';

const guideSection = (id) => ({ pathname: ROUTES.GUIDE, hash: `#${id}` });

const FEATURES = [
    {
        icon: <ReportProblemOutlinedIcon aria-hidden="true" />,
        title: 'Fault tracking',
        text: 'Report a fault with photos in seconds. Mechanics are notified instantly and follow it through to resolution.',
        guide: 'faults',
    },
    {
        icon: <EventRepeatOutlinedIcon aria-hidden="true" />,
        title: 'Preventive maintenance',
        text: 'Recurring service routines with checklists, due dates and a full history for every machine.',
        guide: 'maintenance',
    },
    {
        icon: <MenuBookOutlinedIcon aria-hidden="true" />,
        title: 'Manuals & documentation',
        text: 'Keep every service manual next to the equipment it belongs to, on any device, in the field.',
        guide: 'manuals',
    },
];

const ROLE_CARDS = [
    { icon: <EngineeringOutlinedIcon aria-hidden="true" />, title: 'Operators', text: 'Report faults from the floor and follow your reports until they are fixed.', guide: 'operators' },
    { icon: <BuildOutlinedIcon aria-hidden="true" />, title: 'Mechanics', text: 'Work the fault queue, run maintenance checklists and log completed service.', guide: 'maintenance' },
    { icon: <AdminPanelSettingsOutlinedIcon aria-hidden="true" />, title: 'Admins', text: 'Set up equipment, manage your team and send announcements.', guide: 'admin' },
];

const GUIDE_TOPICS = [
    { label: 'Getting started', id: 'start' },
    { label: 'Roles & permissions', id: 'roles' },
    { label: 'Finding your way', id: 'layout' },
    { label: 'Faults', id: 'faults' },
    { label: 'Equipment', id: 'equipment' },
    { label: 'Notifications', id: 'notifications' },
    { label: 'Your account', id: 'account' },
    { label: 'Troubleshooting & FAQ', id: 'help' },
];

/** Real dashboard screenshots (seeded demo data), one per colour mode. */
function DashboardShot({ isDark }) {
    return (
        <Box
            component="img"
            src={isDark ? '/home/dashboard-dark.webp' : '/home/dashboard-light.webp'}
            alt="FixFleet dashboard: fault totals, fleet availability and a 14-day maintenance trend"
            width={2560}
            height={1520}
            sx={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: '0 1px 2px rgba(15,23,42,.06), 0 24px 48px -12px rgba(15,23,42,.25)',
            }}
        />
    );
}

function IconBadge({ children }) {
    return (
        <Box
            sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                mb: 2,
            }}
        >
            {children}
        </Box>
    );
}

function LinkCard({ icon, title, text, to, cta }) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardActionArea component={RouterLink} to={to} sx={{ height: '100%', alignItems: 'flex-start' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                    <IconBadge>{icon}</IconBadge>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, flex: 1 }}>{text}</Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600, mt: 2, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        {cta} <ArrowForwardIcon fontSize="inherit" aria-hidden="true" />
                    </Typography>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}

function SectionHeading({ eyebrow, title, id }) {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>{eyebrow}</Typography>
            <Typography variant="h4" component="h2" id={id} sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</Typography>
        </Box>
    );
}

/**
 * Public landing page at "/". Signed-in users go straight to their home
 * route; everyone else sees what FixFleet does, who it is for, and the
 * illustrated user guide.
 */
export default function HomePage() {
    const { user } = useAuth();
    const { mode } = useThemeMode();

    // Render straight away instead of waiting for the session check: a cold
    // backend can take many seconds to answer /auth/me, and a signed-out
    // visitor should not stare at a spinner meanwhile. A signed-in user is
    // redirected as soon as the check resolves.
    if (user) return <Navigate to={homeRouteFor(user)} replace />;

    return (
        <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
            <PublicHeader />

            <Box sx={{ flex: 1 }}>
                {/* ── Hero ─────────────────────────────────────── */}
                <Box component="section" aria-labelledby="home-hero" sx={{ ...CONTAINER, py: { xs: 6, md: 10 }, display: 'grid', gap: { xs: 5, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' }, alignItems: 'center' }}>
                    <Box>
                        <Chip label="Fleet maintenance, simplified" color="primary" variant="outlined" size="small" sx={{ mb: 2, fontWeight: 600 }} />
                        <Typography
                            variant="h2"
                            component="h1"
                            id="home-hero"
                            sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', mb: 2, fontSize: { xs: '2.25rem', md: '3.25rem' } }}
                        >
                            One platform for your entire fleet
                        </Typography>
                        <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 400, lineHeight: 1.6, mb: 4 }}>
                            Track faults, manage maintenance schedules, and keep your equipment running at full capacity.
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                            <Button component={RouterLink} to={ROUTES.SIGNUP} variant="contained" size="large" endIcon={<ArrowForwardIcon />}>
                                Create company account
                            </Button>
                            <Button component={RouterLink} to={ROUTES.LOGIN} variant="outlined" size="large">
                                Sign in
                            </Button>
                        </Box>
                        <Button component={RouterLink} to={ROUTES.GUIDE} startIcon={<AutoStoriesOutlinedIcon />} sx={{ mt: 2, ml: -1 }}>
                            Read the user guide
                        </Button>
                    </Box>
                    <DashboardShot isDark={mode === 'dark'} />
                </Box>

                {/* ── Features ─────────────────────────────────── */}
                <Box component="section" aria-labelledby="home-features" sx={{ ...CONTAINER, py: { xs: 4, md: 6 } }}>
                    <SectionHeading eyebrow="What you get" title="Everything maintenance, in one place" id="home-features" />
                    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
                        {FEATURES.map(f => (
                            <LinkCard key={f.title} icon={f.icon} title={f.title} text={f.text} to={guideSection(f.guide)} cta="See how it works" />
                        ))}
                    </Box>
                </Box>

                {/* ── Roles ────────────────────────────────────── */}
                <Box component="section" aria-labelledby="home-roles" sx={{ ...CONTAINER, py: { xs: 4, md: 6 } }}>
                    <SectionHeading eyebrow="Built for your whole team" title="The right tools for every role" id="home-roles" />
                    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
                        {ROLE_CARDS.map(r => (
                            <LinkCard key={r.title} icon={r.icon} title={r.title} text={r.text} to={guideSection(r.guide)} cta={`Guide for ${r.title.toLowerCase()}`} />
                        ))}
                    </Box>
                </Box>

                {/* ── User guide ───────────────────────────────── */}
                <Box component="section" aria-labelledby="home-guide" sx={{ ...CONTAINER, py: { xs: 4, md: 6 } }}>
                    <Card sx={{ p: { xs: 3, md: 5 }, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, alignItems: 'center' }}>
                        <Box>
                            <IconBadge><AutoStoriesOutlinedIcon aria-hidden="true" /></IconBadge>
                            <Typography variant="h4" component="h2" id="home-guide" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
                                New to FixFleet? Start with the user guide
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 620 }}>
                                An illustrated, step-by-step walkthrough for operators, mechanics and admins. Jump straight to a topic:
                            </Typography>
                            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {GUIDE_TOPICS.map(t => (
                                    <li key={t.id}>
                                        <Chip label={t.label} component={RouterLink} to={guideSection(t.id)} clickable variant="outlined" />
                                    </li>
                                ))}
                            </Box>
                        </Box>
                        <Button component={RouterLink} to={ROUTES.GUIDE} variant="contained" size="large" endIcon={<ArrowForwardIcon />} sx={{ justifySelf: { xs: 'start', md: 'end' } }}>
                            Open the guide
                        </Button>
                    </Card>
                </Box>
            </Box>

            <Box sx={{ ...CONTAINER, pb: 3 }}>
                <LegalFooter />
            </Box>
        </Box>
    );
}
