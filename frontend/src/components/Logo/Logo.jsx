// src/components/Logo/Logo.jsx
import React, { useId } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Modern SVG brand icon mark for the Maintenance system
 */
export function LogoMark({ size = 36, sx = {} }) {
    const uid = useId();
    const bgGradId = `logoMarkBgGrad-${uid}`;
    const gearGradId = `logoMarkGearGrad-${uid}`;
    const wrenchGradId = `logoMarkWrenchGrad-${uid}`;
    const shadowId = `logoMarkShadow-${uid}`;

    return (
        <Box
            component="svg"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            sx={{
                width: size,
                height: size,
                flexShrink: 0,
                display: 'block',
                ...sx,
            }}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1D4ED8" />
                    <stop offset="50%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>
                <linearGradient id={gearGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>
                <linearGradient id={wrenchGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#60A5FA" />
                </linearGradient>
                <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.3" />
                </filter>
            </defs>

            {/* Base Badge Squircle */}
            <rect
                x="4"
                y="4"
                width="56"
                height="56"
                rx="14"
                fill={`url(#${bgGradId})`}
                filter={`url(#${shadowId})`}
            />
            <rect
                x="5"
                y="5"
                width="54"
                height="54"
                rx="13"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
            />

            {/* Precision Gear Cog */}
            <path
                fill={`url(#${gearGradId})`}
                fillRule="evenodd"
                clipRule="evenodd"
                d="
                    M32 17
                    C32.9 17 33.6 17.6 33.8 18.5L34.3 20.3C35.2 20.7 36.1 21.2 36.9 21.8L38.7 21.3C39.6 21.1 40.5 21.5 40.9 22.3L42.5 25.1C43 25.9 42.8 26.9 42.1 27.5L40.7 28.7C40.8 29.2 40.8 29.7 40.8 30.2C40.8 30.7 40.8 31.2 40.7 31.7L42.1 32.9C42.8 33.5 43 34.5 42.5 35.3L40.9 38.1C40.5 38.9 39.6 39.3 38.7 39.1L36.9 38.6C36.1 39.2 35.2 39.7 34.3 40.1L33.8 41.9C33.6 42.8 32.9 43.4 32 43.4H28.8C27.9 43.4 27.2 42.8 27 41.9L26.5 40.1C25.6 39.7 24.7 39.2 23.9 38.6L22.1 39.1C21.2 39.3 20.3 38.9 19.9 38.1L18.3 35.3C17.8 34.5 18 33.5 18.7 32.9L20.1 31.7C20 31.2 20 30.7 20 30.2C20 29.7 20 29.2 20.1 28.7L18.7 27.5C18 26.9 17.8 25.9 18.3 25.1L19.9 22.3C20.3 21.5 21.2 21.1 22.1 21.3L23.9 21.8C24.7 21.2 25.6 20.7 26.5 20.3L27 18.5C27.2 17.6 27.9 17 28.8 17H32ZM30.4 25.8C27.8 25.8 25.6 28 25.6 30.6C25.6 33.2 27.8 35.4 30.4 35.4C33 35.4 35.2 33.2 35.2 30.6C35.2 28 33 25.8 30.4 25.8Z
                "
            />

            {/* Stylized Angled Precision Tool Wrench */}
            <g transform="rotate(-45 32 32)">
                <path
                    fill={`url(#${wrenchGradId})`}
                    d="
                        M30.5 18.5
                        C30.5 16.5 32.5 15 34.5 15
                        C35.8 15 37 15.7 37.6 16.8
                        L35.2 19.2
                        C34.6 19.8 34.6 20.8 35.2 21.4
                        C35.8 22 36.8 22 37.4 21.4
                        L39.8 19
                        C40.6 19.9 41 21.1 40.8 22.4
                        C40.5 24.2 39 25.5 37.2 25.8
                        L34 29
                        L31 26
                        L34 23
                        C32 23 30.5 21 30.5 18.5Z
                    "
                />
                <rect x="29" y="27" width="4.5" height="18" rx="2.25" fill={`url(#${wrenchGradId})`} />
                <circle cx="31.25" cy="45" r="4.5" fill="none" stroke={`url(#${wrenchGradId})`} strokeWidth="3" />
            </g>
        </Box>
    );
}

/**
 * Primary Brand Logo component for Navigation, Auth, and Headers
 */
export default function Logo({
    size = 36,
    variant = 'full', // 'full' | 'mark'
    subtitle = 'Ops Manager',
    textColor = 'text.primary',
    subtitleColor = 'text.secondary',
    to = '/dashboard',
    sx = {},
}) {
    const content = (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                textDecoration: 'none',
                color: textColor,
                ...sx,
            }}
        >
            <LogoMark size={size} />

            {variant === 'full' && (
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.1,
                            fontSize: size >= 40 ? '1rem' : '0.875rem',
                            color: textColor,
                        }}
                    >
                        MAINTENANCE
                    </Typography>
                    {subtitle && (
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                fontSize: '0.625rem',
                                color: subtitleColor,
                                display: 'block',
                                textTransform: 'uppercase',
                                lineHeight: 1.2,
                                mt: 0.2,
                            }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );

    if (to) {
        return (
            <Box
                component={RouterLink}
                to={to}
                sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        borderRadius: 1.5,
                    },
                }}
            >
                {content}
            </Box>
        );
    }

    return content;
}
