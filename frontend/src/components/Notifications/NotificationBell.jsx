// src/components/Notifications/NotificationBell.jsx
import React, { useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useNavigate } from 'react-router-dom';
import { useNotificationFeed } from '../../contexts/NotificationFeedContext';
import { ListRowsSkeleton } from '../Skeletons/Skeletons';
import { skeletonA11yProps } from '../Skeletons/skeletonA11y';
import { ROUTES } from '../../constants/routes';
import NotificationItem from './NotificationItem';
import { sortByUnreadFirst } from './notificationPresentation';

/** How many notifications the popover previews before "View all". */
const PREVIEW_COUNT = 6;

/**
 * Bell button with an unread badge, opening a popover preview of the most
 * recent notifications.
 *
 * Lives in the desktop sidebar and the tablet rail. Phone widths don't get
 * a bell: the bottom bar is a fixed five icons, so the account sheet
 * carries a badged "Notifications" entry instead (see BottomNav).
 */
export default function NotificationBell({ tooltipPlacement = 'right' }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();
    const { notifications, unreadCount, loading, markRead, markAllRead, refresh } = useNotificationFeed();

    const open = Boolean(anchorEl);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
        // The badge is polled, but the list behind it may be a minute stale.
        refresh();
    };

    const handleClose = () => setAnchorEl(null);

    const handleSelect = (notification) => {
        handleClose();
        if (!notification.readAt) {
            markRead(notification._id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    // Unread-first so a handful of new items are never bumped out of the
    // preview window by older, already-read ones.
    const preview = sortByUnreadFirst(notifications).slice(0, PREVIEW_COUNT);
    const label = unreadCount > 0
        ? `Notifications (${unreadCount} unread)`
        : 'Notifications';

    return (
        <>
            <Tooltip title={label} placement={tooltipPlacement} arrow>
                <IconButton
                    onClick={handleOpen}
                    aria-label={label}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    color={open ? 'primary' : 'default'}
                >
                    <Badge badgeContent={unreadCount} color="error" max={99}>
                        {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: { width: { xs: 320, sm: 380 }, maxWidth: '95vw', borderRadius: 2, mt: 1 },
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Notifications
                    </Typography>
                    {unreadCount > 0 && (
                        <Button size="small" onClick={markAllRead} sx={{ fontWeight: 600 }}>
                            Mark all read
                        </Button>
                    )}
                </Box>

                <Divider />

                {loading && notifications.length === 0 ? (
                    <Box sx={{ p: 2 }}>
                        <ListRowsSkeleton
                            rows={3}
                            height={64}
                            {...skeletonA11yProps('Loading notifications')}
                        />
                    </Box>
                ) : preview.length === 0 ? (
                    <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
                        <NotificationsNoneIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" fontWeight={600}>
                            You&apos;re all caught up
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            New fault reports and announcements will show up here.
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding sx={{ maxHeight: 420, overflowY: 'auto' }}>
                        {preview.map(notification => (
                            <NotificationItem
                                key={notification._id}
                                notification={notification}
                                onSelect={handleSelect}
                                dense
                            />
                        ))}
                    </List>
                )}

                <Divider />

                <Box sx={{ p: 1 }}>
                    <Button
                        fullWidth
                        size="small"
                        onClick={() => { handleClose(); navigate(ROUTES.NOTIFICATIONS); }}
                        sx={{ fontWeight: 700 }}
                    >
                        View all notifications
                    </Button>
                </Box>
            </Popover>
        </>
    );
}
