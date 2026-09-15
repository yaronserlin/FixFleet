import React from 'react';
import { Typography, Container, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { ROUTES } from '../constants/routes';

function NotFound() {
    return (
        <Container
            maxWidth="sm"
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
                404
            </Typography>

            <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                Page Not Found
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 4 }}>
                The maintenance screen or equipment record you are looking for might have been moved, deleted, or does not exist.
            </Typography>

            <Button
                component={RouterLink}
                to={ROUTES.DASHBOARD}
                variant="contained"
                color="primary"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ minHeight: 48, px: 3.5, fontWeight: 700 }}
            >
                Back to Dashboard
            </Button>
        </Container>
    );
}

export default NotFound;
