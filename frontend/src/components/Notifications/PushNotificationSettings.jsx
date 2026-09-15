// src/components/Notifications/PushNotificationSettings.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import usePushNotifications from '../../hooks/usePushNotifications';
import { useNotify } from '../../contexts/NotificationContext';

/**
 * Per-device opt-in for PWA push notifications.
 *
 * "Per-device" is the important part, and the copy says so: a push
 * subscription belongs to one browser, so enabling it on a phone doesn't
 * enable it on a desktop. The switch reflects *this* browser's state.
 *
 * The control hides itself when push can't work at all -- an unsupported
 * browser, or a server with no VAPID keys configured -- rather than
 * offering a toggle that would silently do nothing. The one case it stays
 * visible for is a denied permission, where the user needs to be told the
 * fix is in browser settings, not here.
 */
export default function PushNotificationSettings() {
    const notify = useNotify();
    const {
        supported,
        enabled,
        permission,
        serverConfigured,
        busy,
        ready,
        subscribe,
        unsubscribe,
    } = usePushNotifications();

    if (!ready) {
        return <Skeleton variant="rounded" height={92} sx={{ borderRadius: 3 }} />;
    }

    const blocked = permission === 'denied';

    // Nothing actionable to show: either the browser can't do push, or the
    // deployment hasn't configured VAPID keys.
    if (!supported || (!serverConfigured && !blocked)) {
        return null;
    }

    const handleToggle = async (event) => {
        const wantsEnabled = event.target.checked;
        if (wantsEnabled) {
            const ok = await subscribe();
            if (ok) {
                notify.success('Push notifications enabled on this device');
            } else if (Notification.permission === 'denied') {
                notify.error('Your browser is blocking notifications for this site');
            } else {
                notify.error('Could not enable push notifications');
            }
        } else {
            await unsubscribe();
            notify.info('Push notifications disabled on this device');
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                borderRadius: 3,
                borderLeft: '4px solid #2563EB',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <NotificationsActiveIcon color="primary" sx={{ mt: 0.25 }} />

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Push notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Get alerted on this device when a fault is reported or your
                        administrator sends an announcement. This setting applies to this
                        browser only.
                    </Typography>
                </Box>

                <Switch
                    checked={enabled}
                    onChange={handleToggle}
                    disabled={busy || blocked}
                    inputProps={{ 'aria-label': 'Enable push notifications on this device' }}
                />
            </Box>

            {blocked && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    Notifications are blocked for this site in your browser settings. Allow them
                    there, then come back and turn this on.
                </Alert>
            )}
        </Paper>
    );
}
