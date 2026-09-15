// src/components/Navbar/index.jsx
import React, { useMemo } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { alpha, useScrollTrigger } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { ROLES } from '../../constants/roles';
import MobileNav from './MobileNav';
import DesktopNav from './DesktopNav';
import UserMenu from './UserMenu';

export default function Navbar() {
    const { user } = useAuth();
    const { mode, toggleColorMode } = useThemeMode();
    const isDark = mode === 'dark';

    // Elevate AppBar when scrolled
    const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 10 });

    const navPages = useMemo(() => {
        if (user?.role === ROLES.OPERATOR) {
            return ['Dashboard', 'My Reports', 'Manuals'];
        }
        const result = ['Dashboard', 'Equipment', 'Manuals'];
        if (user?.role === ROLES.ADMIN) {
            result.push('Admin');
        }
        return result;
    }, [user?.role]);

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                borderBottomColor: scrolled
                    ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)')
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'),
                boxShadow: scrolled
                    ? (isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)')
                    : 'none',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            }}
        >
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 64 } }}>
                    <MobileNav display={{ xs: 'flex', sm: 'none' }} user={user} pages={navPages} />
                    <DesktopNav display={{ xs: 'none', sm: 'flex' }} user={user} pages={navPages} />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                        <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                            <IconButton
                                onClick={toggleColorMode}
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                size="small"
                                sx={{
                                    width: 36,
                                    height: 36,
                                    color: 'text.secondary',
                                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
                                    '&:hover': {
                                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.1),
                                        color: 'text.primary',
                                    },
                                }}
                            >
                                {isDark
                                    ? <LightModeIcon sx={{ fontSize: 18 }} />
                                    : <DarkModeIcon sx={{ fontSize: 18 }} />
                                }
                            </IconButton>
                        </Tooltip>

                        {user && <UserMenu user={user} />}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}