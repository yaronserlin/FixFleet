// src/pages/VerifyEmailPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Paper, Typography, Button, Alert, Container, Skeleton } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../constants/routes';

const INVALID_LINK = 'This verification link is invalid or has expired. Sign in to get a new one.';

/** Landing page for the signup verification link: verifies, then AuthContext routes home. */
export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { verifyEmail } = useAuth();
    const [error, setError] = useState(token ? '' : INVALID_LINK);
    // The token is single-use: StrictMode's double effect must not spend it twice.
    const started = useRef(false);

    useEffect(() => {
        if (!token || started.current) return;
        started.current = true;
        verifyEmail(token).catch((err) => {
            setError(err.response?.data?.message ? INVALID_LINK : err.message);
        });
    }, [token, verifyEmail]);

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0b0f19' : '#f4f6f8',
                p: { xs: 2, sm: 3 },
            }}
        >
            <Container maxWidth="xs" disableGutters>
                <Paper
                    elevation={4}
                    sx={{
                        p: { xs: 3, sm: 4 },
                        borderRadius: 3,
                        borderTop: '5px solid',
                        borderColor: 'primary.main',
                        textAlign: 'center',
                    }}
                >
                    <MarkEmailReadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
                        Verify Your Email
                    </Typography>

                    {error ? (
                        <>
                            <Alert severity="error" sx={{ my: 2.5, textAlign: 'left', borderRadius: 2 }}>
                                {error}
                            </Alert>
                            <Button component={RouterLink} to={ROUTES.LOGIN} variant="contained" fullWidth sx={{ minHeight: 48, fontWeight: 700 }}>
                                Sign in
                            </Button>
                        </>
                    ) : (
                        <Box role="status" aria-label="Verifying your email" sx={{ mt: 2 }}>
                            <Skeleton variant="text" sx={{ mx: 'auto', width: '80%' }} />
                            <Skeleton variant="rounded" height={48} sx={{ mt: 2 }} />
                        </Box>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}
