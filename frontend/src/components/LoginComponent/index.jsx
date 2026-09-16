// src/components/LoginComponent/index.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoginCard from './LoginCard';
import Logo from '../Logo/Logo';
import LegalFooter from '../Legal/LegalFooter';

const FEATURES = [
    'Track equipment faults and repairs',
    'Manage maintenance schedules',
    'Service manuals & documentation',
];

export default function LoginComponent() {
    return (
        <Box
            sx={{
                minHeight: '100dvh',
                width: '100%',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
            }}
        >
            {/* ── Brand Panel ─────────────────────────────────── */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: { xs: 'center', md: 'center' },
                    alignItems: { xs: 'center', md: 'flex-start' },
                    p: { xs: 3, md: 6 },
                    minHeight: { xs: 90, md: '100dvh' },
                    width: { xs: '100%', md: '42%' },
                    flexShrink: 0,
                    bgcolor: '#0F172A',
                    color: '#FFFFFF',
                    position: 'relative',
                    overflow: 'hidden',
                    // Subtle texture
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `
                            radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.18) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.10) 0%, transparent 50%)
                        `,
                        pointerEvents: 'none',
                    },
                }}
            >
                {/* Logo */}
                <Box sx={{ mb: { xs: 0, md: 6 }, position: 'relative' }}>
                    <Logo
                        size={44}
                        textColor="#FFFFFF"
                        subtitleColor="rgba(255,255,255,0.7)"
                        subtitle="Ops Manager"
                        to={null}
                    />
                </Box>

                {/* Hero Text — desktop only */}
                <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'relative' }}>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 800,
                            lineHeight: 1.15,
                            letterSpacing: '-0.025em',
                            mb: 2,
                            color: '#FFFFFF',
                        }}
                    >
                        One platform for your entire fleet
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255,255,255,0.65)',
                            lineHeight: 1.7,
                            mb: 4,
                            maxWidth: 360,
                        }}
                    >
                        Track faults, manage maintenance schedules, and keep your equipment running at full capacity.
                    </Typography>

                    {/* Feature list */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {FEATURES.map(f => (
                            <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 18, flexShrink: 0 }} />
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}
                                >
                                    {f}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Divider */}
                    <Box
                        sx={{
                            mt: 5,
                            pt: 4,
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}
                        >
                            "Clarity for your fleet operations"
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* ── Form Panel ──────────────────────────────────── */}
            <Box
                sx={{
                    flex: 1,
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: { xs: 3, sm: 4, md: 6 },
                    bgcolor: 'background.default',
                    overflowY: 'auto',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ width: '100%', maxWidth: 420, flex: 1, mx: 'auto', display: 'flex', alignItems: 'center', py: { xs: 2, md: 0 } }}>
                    <LoginCard />
                </Box>
                <Box sx={{ width: '100%', maxWidth: 720 }}>
                    <LegalFooter />
                </Box>
            </Box>
        </Box>
    );
}
