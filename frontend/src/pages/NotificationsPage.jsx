// src/pages/NotificationsPage.jsx
import React, { useMemo, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Chip,
    Paper,
    List,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNavigate } from 'react-router-dom';

import { useNotificationFeed } from '../contexts/NotificationFeedContext';
import { usePageRefresh } from '../contexts/PageRefreshContext';
import NotificationItem from '../components/Notifications/NotificationItem';
import { ListRowsSkeleton } from '../components/Skeletons/Skeletons';
import { skeletonA11yProps } from '../components/Skeletons/skeletonA11y';

/**
 * The full notification feed: everything the bell's popover previews, with
 * an unread filter and a bulk "mark all read".
 */
export default function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, unreadCount, loading, refresh, markRead, markAllRead } = useNotificationFeed();
    const [filter, setFilter] = useState('all'); // 'all' | 'unread'

    // Pull down to re-fetch, like every other screen.
    usePageRefresh(refresh);

    const visible = useMemo(() => (
        filter === 'unread'
            ? notifications.filter(n => !n.readAt)
            : notifications
    ), [notifications, filter]);

    const handleSelect = (notification) => {
        if (!notification.readAt) {
            markRead(notification._id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <Container maxWidth="md" sx={{ mt: 3, mb: 6 }} {...skeletonA11yProps('Loading notifications')}>
                <Box sx={{ mb: 3.5 }}>
                    <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                        Notifications
                    </Typography>
                </Box>
                <ListRowsSkeleton rows={6} height={84} />
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 3, mb: 6 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    mb: 3,
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                        Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Fault reports from your team and announcements from your administrator.
                    </Typography>
                </Box>

                {unreadCount > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<DoneAllIcon />}
                        onClick={markAllRead}
                        sx={{ fontWeight: 700, flexShrink: 0 }}
                    >
                        Mark all read
                    </Button>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 0.75, mb: 2.5 }}>
                <Chip
                    label={`All (${notifications.length})`}
                    size="small"
                    variant={filter === 'all' ? 'filled' : 'outlined'}
                    color={filter === 'all' ? 'primary' : 'default'}
                    onClick={() => setFilter('all')}
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
                <Chip
                    label={`Unread (${unreadCount})`}
                    size="small"
                    variant={filter === 'unread' ? 'filled' : 'outlined'}
                    color={filter === 'unread' ? 'error' : 'default'}
                    onClick={() => setFilter('unread')}
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
            </Box>

            {visible.length === 0 ? (
                <Paper variant="outlined" sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center', borderRadius: 3 }}>
                    <NotificationsNoneIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        {filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
                        {filter === 'unread'
                            ? "You've read everything in your feed."
                            : 'When someone reports a fault or your administrator sends an announcement, it will appear here.'}
                    </Typography>
                    {filter === 'unread' && (
                        <Button variant="outlined" onClick={() => setFilter('all')} sx={{ mt: 2.5 }}>
                            Show all
                        </Button>
                    )}
                </Paper>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <List disablePadding>
                        {visible.map(notification => (
                            <NotificationItem
                                key={notification._id}
                                notification={notification}
                                onSelect={handleSelect}
                            />
                        ))}
                    </List>
                </Paper>
            )}
        </Container>
    );
}
