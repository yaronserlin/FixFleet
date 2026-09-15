// src/components/Navbar/SidebarNav.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import Logo, { LogoMark } from '../Logo/Logo';
import UserMenu from './UserMenu';
import NotificationBell from '../Notifications/NotificationBell';
import { useThemeMode } from '../../contexts/ThemeContext';
import { pageToPath, pageIcon, isPageActive } from './navItems';
import { SIDEBAR_FULL_WIDTH, SIDEBAR_RAIL_WIDTH } from './navConstants';
import { ROUTES } from '../../constants/routes';
import { ROLES } from '../../constants/roles';

/**
 * Persistent left sidebar navigation.
 *
 * Two variants share this one component (rather than being duplicated):
 *  - variant="full": icon + text label, meant for >= lg (1200px)
 *  - variant="rail": icon only with a hover tooltip, meant for sm-lg
 *    (600-1200px), matching the Material "navigation rail" pattern.
 *
 * Both variants are typically mounted simultaneously (like the previous
 * MobileNav/DesktopNav pair) with the `display` prop toggling visibility
 * per breakpoint via CSS, so `Logo`/`LogoMark` must tolerate multiple
 * concurrent instances -- see Logo.jsx's useId()-based unique gradient ids.
 */
export default function SidebarNav({ variant = 'full', display, user, pages }) {
    const location = useLocation();
    const { mode, toggleColorMode } = useThemeMode();
    const isDark = mode === 'dark';
    const collapsed = variant === 'rail';
    const width = collapsed ? SIDEBAR_RAIL_WIDTH : SIDEBAR_FULL_WIDTH;

    if (!user) return null;

    return (
        <Drawer
            variant="permanent"
            anchor="left"
            open
            sx={{
                display,
                width,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowX: 'hidden',
                },
            }}
        >
            {/* Brand */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 0 : 2.5,
                    py: 2.5,
                    minHeight: 64,
                    flexShrink: 0,
                }}
            >
                {collapsed ? (
                    <Box
                        component={RouterLink}
                        to={ROUTES.DASHBOARD}
                        aria-label="Go to dashboard"
                        sx={{ display: 'inline-flex' }}
                    >
                        <LogoMark size={32} />
                    </Box>
                ) : (
                    <Logo
                        size={32}
                        subtitle={user?.role === ROLES.OPERATOR ? 'Operator Portal' : 'Ops Manager'}
                        to={ROUTES.DASHBOARD}
                    />
                )}
            </Box>

            <Divider />

            {/* Nav items */}
            <List sx={{ flexGrow: 1, py: 1.5, px: collapsed ? 1 : 1.5, overflowY: 'auto' }}>
                {pages.map((page) => {
                    const active = isPageActive(page, location.pathname);
                    const icon = pageIcon(page);

                    const content = (
                        <ListItemButton
                            component={RouterLink}
                            to={pageToPath(page)}
                            selected={active}
                            aria-current={active ? 'page' : undefined}
                            sx={{
                                borderRadius: 2,
                                minHeight: 46,
                                mb: 0.5,
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                px: collapsed ? 1.5 : 2,
                                color: active ? 'primary.main' : 'text.secondary',
                                bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                                    color: 'primary.main',
                                },
                                '&.Mui-selected': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                },
                                '&.Mui-selected:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: collapsed ? 'auto' : 36,
                                    color: 'inherit',
                                    justifyContent: 'center',
                                }}
                            >
                                {icon}
                            </ListItemIcon>
                            {!collapsed && (
                                <ListItemText
                                    primary={page}
                                    primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.875rem' }}
                                />
                            )}
                        </ListItemButton>
                    );

                    return collapsed ? (
                        <Tooltip key={page} title={page} placement="right" arrow>
                            <span>{content}</span>
                        </Tooltip>
                    ) : (
                        <React.Fragment key={page}>{content}</React.Fragment>
                    );
                })}
            </List>

            <Divider />

            {/* Footer: theme toggle + user menu */}
            <Box
                sx={{
                    p: collapsed ? 1 : 1.5,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: collapsed ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: 1,
                }}
            >
                <Tooltip
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    placement={collapsed ? 'right' : 'top'}
                    arrow
                >
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
                        {isDark ? <LightModeIcon sx={{ fontSize: 18 }} /> : <DarkModeIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                </Tooltip>

                <NotificationBell tooltipPlacement={collapsed ? 'right' : 'top'} />

                <UserMenu user={user} />
            </Box>
        </Drawer>
    );
}
