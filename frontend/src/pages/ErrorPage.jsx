// src/pages/ErrorPage.jsx
import React from 'react';
import { Typography, Container, Button, Box, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

/**
 * Full-page error layout shared by 404, crash and server-unreachable states.
 * Actions take `to` (router link) or `href`/`onClick`; the top-level
 * ErrorBoundary sits outside the Router, so it must not use `to`.
 *
 * @param {object} props
 * @param {string} props.code - Big headline, e.g. "404".
 * @param {string} props.title
 * @param {string} props.message
 * @param {{ label: string, to?: string, href?: string, onClick?: () => void, icon?: React.ReactNode }[]} props.actions - First one is the primary button.
 */
export default function ErrorPage({ code, title, message, actions = [] }) {
    return (
        <Container
            maxWidth="sm"
            role="alert"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '75vh',
                textAlign: 'center',
                py: 6,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 72,
                    height: 72,
                    borderRadius: 3,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    mb: 3,
                }}
            >
                <BuildCircleIcon sx={{ fontSize: 42 }} />
            </Box>

            <Typography
                variant="h1"
                component="h1"
                sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    fontSize: { xs: '5rem', sm: '7rem' },
                    lineHeight: 1,
                    color: 'text.primary',
                    mb: 1,
                }}
            >
                {code}
            </Typography>

            <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                {title}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 4 }}>
                {message}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                {actions.map(({ label, to, href, onClick, icon }, i) => (
                    <Button
                        key={label}
                        {...(to ? { component: RouterLink, to } : { href })}
                        onClick={onClick}
                        variant={i === 0 ? 'contained' : 'outlined'}
                        color="primary"
                        size="large"
                        endIcon={icon}
                        sx={{ minHeight: 48, px: 3.5, fontWeight: 700 }}
                    >
                        {label}
                    </Button>
                ))}
            </Stack>
        </Container>
    );
}
