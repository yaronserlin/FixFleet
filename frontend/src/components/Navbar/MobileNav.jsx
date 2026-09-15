// src/components/Navbar/MobileNav.jsx
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { getMediaUrl } from '../../utils/mediaUtils';
import { formatUserName, getUserInitials } from '../../utils/formatUtils';
import { useThemeMode } from '../../contexts/ThemeContext';
import Logo from '../Logo/Logo';
import { ROUTES } from '../../constants/routes';
import { ROLES } from '../../constants/roles';

const DRAWER_WIDTH = 280;

const PAGE_ICON_MAP = {
    'dashboard':      <DashboardIcon fontSize="small" />,
    'my reports':     <AssignmentIcon fontSize="small" />,
    'manuals':        <MenuBookIcon fontSize="small" />,
    'my faults':      <ReportProblemIcon fontSize="small" />,
    'faults':         <ReportProblemIcon fontSize="small" />,
    'equipment':      <PrecisionManufacturingIcon fontSize="small" />,
    'profile':        <PersonIcon fontSize="small" />,
    'account':        <ManageAccountsIcon fontSize="small" />,
    'admin':          <AdminPanelSettingsIcon fontSize="small" />,
};

const PAGE_TO_PATH = (page) => {
    const lower = page.toLowerCase();
    if (lower === 'dashboard') return ROUTES.DASHBOARD;
    if (lower === 'my reports' || lower === 'reports' || lower === 'my faults' || lower === 'faults') return ROUTES.MY_REPORTS;
    if (lower === 'manuals' || lower === 'equipment manuals' || lower === 'books') return ROUTES.MANUALS;
    if (lower === 'equipment' || lower === 'tools') return ROUTES.EQUIPMENT;
    if (lower === 'admin') return ROUTES.ADMIN;
    return `/${lower}`;
};

const ROLE_COLOR = { [ROLES.ADMIN]: 'error', [ROLES.MECHANIC]: 'primary', [ROLES.OPERATOR]: 'success' };
const ROLE_LABEL = { [ROLES.ADMIN]: 'Admin', [ROLES.MECHANIC]: 'Mechanic', [ROLES.OPERATOR]: 'Operator' };

export default function MobileNav({ display, user, pages }) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { mode, toggleColorMode } = useThemeMode();
    const isDark = mode === 'dark';

    const handleOpen  = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const goTo = (path) => {
        handleClose();
        navigate(path);
    };

    const avatarSrc = getMediaUrl(user?.avatar || user?.avatarUrl);

    return (
        <>
            {/* ── Hamburger Button ───────────────────────────── */}
            <Box sx={{ display, alignItems: 'center' }}>
                {user && (
                    <IconButton
                        size="medium"
                        onClick={handleOpen}
                        aria-label="Open navigation menu"
                        sx={{
                            width: 44,
                            height: 44,
                            color: 'text.primary',
                            mr: 1,
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
            </Box>

            {/* ── Brand Logo (mobile center) ─────────────────── */}
            <Box sx={{ display, flexGrow: 1, alignItems: 'center' }}>
                <Logo
                    size={30}
                    variant="full"
                    subtitle=""
                    to={ROUTES.DASHBOARD}
                />
            </Box>

            {/* ── Drawer ─────────────────────────────────────── */}
            <Drawer
                anchor="left"
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: DRAWER_WIDTH,
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                {/* Drawer Header */}
                <Box
                    sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        minHeight: 64,
                    }}
                >
                    <Logo
                        size={32}
                        subtitle={user?.role === ROLES.OPERATOR ? 'Operator Portal' : 'Ops Manager'}
                        to={ROUTES.DASHBOARD}
                    />
                    <IconButton size="small" onClick={handleClose} aria-label="Close navigation menu">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* User Info */}
                {user && (
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                            src={avatarSrc}
                            alt={formatUserName(user.name)}
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: `${ROLE_COLOR[user.role] || 'primary'}.main`,
                                fontSize: '0.9rem',
                                fontWeight: 700,
                            }}
                        >
                            {getUserInitials(user.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                                {formatUserName(user.name)}
                            </Typography>
                            <Chip
                                label={ROLE_LABEL[user.role] || user.role}
                                size="small"
                                color={ROLE_COLOR[user.role] || 'primary'}
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, mt: 0.25 }}
                            />
                        </Box>
                    </Box>
                )}

                <Divider />

                {/* Nav Items */}
                <List sx={{ flexGrow: 1, py: 1 }}>
                    {pages.map(page => {
                        const targetPath = PAGE_TO_PATH(page);
                        const isActive =
                            location.pathname === targetPath ||
                            (targetPath !== ROUTES.DASHBOARD && location.pathname.startsWith(targetPath));
                        const icon = PAGE_ICON_MAP[page.toLowerCase()] || <DashboardIcon fontSize="small" />;

                        return (
                            <ListItem key={page} disablePadding sx={{ px: 1, mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => goTo(targetPath)}
                                    selected={isActive}
                                    sx={{
                                        borderRadius: 2,
                                        minHeight: 48,
                                        color: isActive ? 'primary.main' : 'text.secondary',
                                        borderLeft: isActive ? '3px solid' : '3px solid transparent',
                                        borderColor: isActive ? 'primary.main' : 'transparent',
                                        bgcolor: isActive
                                            ? (theme) => alpha(theme.palette.primary.main, 0.08)
                                            : 'transparent',
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
                                            minWidth: 36,
                                            color: isActive ? 'primary.main' : 'text.secondary',
                                        }}
                                    >
                                        {icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={page}
                                        primaryTypographyProps={{
                                            fontWeight: isActive ? 700 : 500,
                                            fontSize: '0.9rem',
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>

                <Divider />

                {/* Footer: Theme toggle + Logout */}
                <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
                    <ListItemButton
                        onClick={toggleColorMode}
                        sx={{ borderRadius: 2, flex: 1, minHeight: 44, gap: 1 }}
                    >
                        <ListItemIcon sx={{ minWidth: 'auto', color: 'text.secondary' }}>
                            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                            primary={isDark ? 'Light Mode' : 'Dark Mode'}
                            primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 500, color: 'text.secondary' }}
                        />
                    </ListItemButton>

                    <ListItemButton
                        onClick={() => goTo(ROUTES.LOGOUT)}
                        sx={{
                            borderRadius: 2,
                            flex: 1,
                            minHeight: 44,
                            gap: 1,
                            color: 'error.main',
                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 'auto', color: 'error.main' }}>
                            <LogoutIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Log out"
                            primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600, color: 'error.main' }}
                        />
                    </ListItemButton>
                </Box>
            </Drawer>
        </>
    );
}