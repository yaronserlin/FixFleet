// src/components/Navbar/BottomNav.jsx
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Badge from '@mui/material/Badge';
import AddIcon from '@mui/icons-material/Add';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { getMediaUrl } from '../../utils/mediaUtils';
import { formatUserName, getUserInitials } from '../../utils/formatUtils';
import { useNotificationFeed } from '../../contexts/NotificationFeedContext';
import { pageToPath, pageIcon, pageMenuLabel, isPageActive } from './navItems';
import { BOTTOM_NAV_HEIGHT } from './navConstants';
import { ROUTES } from '../../constants/routes';
import { ROLES } from '../../constants/roles';

const ROLE_COLOR = { [ROLES.ADMIN]: 'error', [ROLES.MECHANIC]: 'primary', [ROLES.OPERATOR]: 'success' };
const ROLE_LABEL = { [ROLES.ADMIN]: 'Admin', [ROLES.MECHANIC]: 'Mechanic', [ROLES.OPERATOR]: 'Operator' };

/**
 * Native-app-style bottom tab bar for phone widths (< sm / 600px), with a
 * raised center FAB that opens fault creation from anywhere in the app
 * (like Instagram/Uber's center action button), and an "Account" tab that
 * opens a bottom sheet keeping profile/activity/theme/logout reachable
 * without a persistent top bar.
 *
 * `pages` become tabs in the bar; `menuPages` are destinations the caller
 * has chosen to demote into the account sheet instead, so the bar stays at
 * a fixed icon count no matter how many pages a role can reach (Navbar uses
 * this for admins' Admin page -- see src/components/Navbar/index.jsx).
 */
export default function BottomNav({ display, user, pages, menuPages = [], onOpenCreateFault }) {
    const [accountOpen, setAccountOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotificationFeed();

    if (!user) return null;

    const mid = Math.ceil(pages.length / 2);
    const leftPages = pages.slice(0, mid);
    const rightPages = pages.slice(mid);
    const avatarSrc = getMediaUrl(user.avatar || user.avatarUrl);

    const goTo = (path) => {
        setAccountOpen(false);
        navigate(path);
    };

    // Icon-only tabs (no text label) -- with the nav pages + the center FAB
    // + the Account tab sharing a 390px-wide row, text labels don't fit
    // without overlapping (measured live). This also matches the
    // Instagram/Uber-style bottom bar the design brief calls out, which
    // doesn't label its tabs either; `aria-label` keeps them accessible.
    const renderTab = (page) => {
        const active = isPageActive(page, location.pathname);
        return (
            <ButtonBase
                key={page}
                component={RouterLink}
                to={pageToPath(page)}
                aria-label={page}
                aria-current={active ? 'page' : undefined}
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: BOTTOM_NAV_HEIGHT,
                    color: active ? 'primary.main' : 'text.secondary',
                }}
            >
                {pageIcon(page)}
            </ButtonBase>
        );
    };

    return (
        <>
            <Paper
                elevation={0}
                sx={{
                    display,
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: (theme) => theme.zIndex.appBar,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0,
                    pb: 'env(safe-area-inset-bottom)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'stretch', width: '100%', height: BOTTOM_NAV_HEIGHT }}>
                    {/* Each side is its own flex:1 group (not individual flex:1 tabs
                        directly in the row) so the two halves are always equal width
                        -- and the FAB stays exactly centered -- regardless of how many
                        nav pages a role has, or that the right side also carries
                        the Account tab. */}
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                        {leftPages.map(renderTab)}
                    </Box>

                    {/* Raised center FAB: quick fault creation, reachable from any page */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: BOTTOM_NAV_HEIGHT,
                            flexShrink: 0,
                        }}
                    >
                        <ButtonBase
                            onClick={onOpenCreateFault}
                            aria-label="Report a fault"
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                                transform: 'translateY(-14px)',
                                transition: 'transform 0.15s ease',
                                '&:active': { transform: 'translateY(-14px) scale(0.94)' },
                            }}
                        >
                            <AddIcon />
                        </ButtonBase>
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                        {rightPages.map(renderTab)}

                        <ButtonBase
                            onClick={() => setAccountOpen(true)}
                            aria-label={
                                unreadCount > 0
                                    ? `Open account menu (${unreadCount} unread notifications)`
                                    : 'Open account menu'
                            }
                            sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: BOTTOM_NAV_HEIGHT,
                                color: 'text.secondary',
                            }}
                        >
                            {/* The phone bar has no room for a bell of its own, so
                                notifications live in the sheet behind this tab --
                                which means the unread count has to surface here. */}
                            <Badge
                                badgeContent={unreadCount}
                                color="error"
                                max={99}
                                overlap="circular"
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            >
                                <Avatar
                                    src={avatarSrc}
                                    sx={{ width: 26, height: 26, fontSize: '0.7rem', bgcolor: `${ROLE_COLOR[user.role] || 'primary'}.main` }}
                                >
                                    {getUserInitials(user.name)}
                                </Avatar>
                            </Badge>
                        </ButtonBase>
                    </Box>
                </Box>
            </Paper>

            {/* Account bottom sheet: keeps profile/activity/logout reachable
                on phone without a persistent top bar. */}
            <Drawer
                anchor="bottom"
                open={accountOpen}
                onClose={() => setAccountOpen(false)}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        pb: 'env(safe-area-inset-bottom)',
                    },
                }}
            >
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                        src={avatarSrc}
                        sx={{ width: 44, height: 44, fontWeight: 700, bgcolor: `${ROLE_COLOR[user.role] || 'primary'}.main` }}
                    >
                        {getUserInitials(user.name)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={700} noWrap>
                            {formatUserName(user.name)}
                        </Typography>
                        <Chip
                            label={ROLE_LABEL[user.role] || user.role}
                            size="small"
                            color={ROLE_COLOR[user.role] || 'primary'}
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, mt: 0.25 }}
                        />
                    </Box>
                </Box>

                <Divider />

                <List sx={{ py: 1 }}>
                    {menuPages.map(page => (
                        <ListItemButton
                            key={page}
                            onClick={() => goTo(pageToPath(page))}
                            selected={isPageActive(page, location.pathname)}
                            sx={{ minHeight: 48 }}
                        >
                            <ListItemIcon>{pageIcon(page)}</ListItemIcon>
                            <ListItemText primary={pageMenuLabel(page)} />
                        </ListItemButton>
                    ))}
                    {menuPages.length > 0 && <Divider sx={{ my: 0.5 }} />}

                    <ListItemButton onClick={() => goTo(ROUTES.NOTIFICATIONS)} sx={{ minHeight: 48 }}>
                        <ListItemIcon>
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                                <NotificationsIcon fontSize="small" />
                            </Badge>
                        </ListItemIcon>
                        <ListItemText primary="Notifications" />
                    </ListItemButton>
                    <ListItemButton onClick={() => goTo(ROUTES.ACCOUNT)} sx={{ minHeight: 48 }}>
                        <ListItemIcon><ManageAccountsIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Account Settings" />
                    </ListItemButton>
                    <ListItemButton onClick={() => goTo(ROUTES.PROFILE)} sx={{ minHeight: 48 }}>
                        <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="My Activity" />
                    </ListItemButton>
                    <Divider sx={{ my: 0.5 }} />

                    <ListItemButton
                        onClick={() => goTo(ROUTES.LOGOUT)}
                        sx={{ minHeight: 48, color: 'error.main' }}
                    >
                        <ListItemIcon sx={{ color: 'error.main' }}><LogoutIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Log out" />
                    </ListItemButton>
                </List>
            </Drawer>
        </>
    );
}
