import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '../../contexts/ThemeContext';
import Logo from '../Logo/Logo';
import { ROUTES } from '../../constants/routes';
import { PUBLIC_CONTAINER } from './publicLayout';

/**
 * Sticky top bar for signed-out pages (home, user guide): logo, guide link,
 * colour-mode toggle, and the sign-in / sign-up actions.
 */
export default function PublicHeader() {
    const { mode, toggleColorMode } = useThemeMode();
    const nextMode = mode === 'dark' ? 'light' : 'dark';

    return (
        <Box
            component="header"
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 'appBar',
                bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
                backdropFilter: 'blur(8px)',
                borderBottom: 1,
                borderColor: 'divider',
            }}
        >
            <Box sx={{ ...PUBLIC_CONTAINER, display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                <Logo size={36} to={ROUTES.HOME} />
                <Box sx={{ flex: 1 }} />
                <Button component={RouterLink} to={ROUTES.GUIDE} color="inherit" startIcon={<AutoStoriesOutlinedIcon />} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                    User guide
                </Button>
                <Tooltip title={`Switch to ${nextMode} mode`}>
                    <IconButton onClick={toggleColorMode} aria-label={`Switch to ${nextMode} mode`}>
                        {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                    </IconButton>
                </Tooltip>
                <Button component={RouterLink} to={ROUTES.LOGIN} color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                    Sign in
                </Button>
                <Button component={RouterLink} to={ROUTES.SIGNUP} variant="contained">
                    Sign up
                </Button>
            </Box>
        </Box>
    );
}
