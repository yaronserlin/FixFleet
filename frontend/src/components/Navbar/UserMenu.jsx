// src/components/Navbar/UserMenu.jsx
import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '../../utils/mediaUtils';
import { formatUserName, getUserInitials } from '../../utils/formatUtils';

const ROLE_CONFIG = {
    admin:    { color: 'error',   label: 'Admin',    bgToken: 'error.main'   },
    mechanic: { color: 'primary', label: 'Mechanic', bgToken: 'primary.main' },
    operator: { color: 'success', label: 'Operator', bgToken: 'success.main' },
};

export default function UserMenu({ user }) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const navigate = useNavigate();

    const handleOpen  = e => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);

    if (!user) return null;

    const avatarSrc   = getMediaUrl(user.avatar || user.avatarUrl);
    const role        = ROLE_CONFIG[user.role] || ROLE_CONFIG.operator;
    const displayName = formatUserName(user.name) || 'User';
    const initials    = getUserInitials(user.name);

    const goTo = (path) => { handleClose(); navigate(path); };

    return (
        <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Account & Profile" arrow>
                <IconButton
                    onClick={handleOpen}
                    aria-label="Open account menu"
                    aria-controls={anchorEl ? 'user-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={anchorEl ? 'true' : undefined}
                    sx={{
                        p: 0.5,
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: anchorEl ? `${role.color}.main` : 'divider',
                        transition: 'border-color 0.2s ease',
                        '&:hover': { borderColor: `${role.color}.main` },
                    }}
                >
                    <Avatar
                        alt={displayName}
                        src={avatarSrc}
                        sx={{
                            width: 32,
                            height: 32,
                            bgcolor: `${role.color}.main`,
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                        }}
                    >
                        {initials}
                    </Avatar>
                </IconButton>
            </Tooltip>

            <Menu
                id="user-menu"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                sx={{ mt: 1 }}
                PaperProps={{
                    sx: {
                        minWidth: 230,
                        borderRadius: 2,
                        py: 0.5,
                    },
                }}
            >
                {/* User info header */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Box display="flex" alignItems="center" gap={1.25} mb={0.75}>
                        <Avatar
                            src={avatarSrc}
                            alt={displayName}
                            sx={{
                                width: 36,
                                height: 36,
                                bgcolor: `${role.color}.main`,
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                            }}
                        >
                            {initials}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                                {displayName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                {user.email}
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        label={role.label}
                        size="small"
                        color={role.color}
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <MenuItem onClick={() => goTo('/account')}>
                    <ListItemIcon>
                        <ManageAccountsIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2" fontWeight={500}>Account Settings</Typography>
                </MenuItem>

                <MenuItem onClick={() => goTo('/profile')}>
                    <ListItemIcon>
                        <HistoryIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2" fontWeight={500}>My Activity</Typography>
                </MenuItem>

                <Divider sx={{ my: 0.5 }} />

                <MenuItem
                    onClick={() => goTo('/logout')}
                    sx={{
                        color: 'error.main',
                        '&:hover': {
                            bgcolor: (theme) => `rgba(${theme.palette.error.main}, 0.08)`,
                            backgroundColor: 'rgba(220,38,38,0.08)',
                        },
                    }}
                >
                    <ListItemIcon sx={{ color: 'error.main' }}>
                        <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2" fontWeight={600} color="error.main">
                        Log out
                    </Typography>
                </MenuItem>
            </Menu>
        </Box>
    );
}