// src/components/Notifications/NotificationItem.jsx
import React from 'react';
import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { notificationDisplay, formatRelativeTime } from './notificationPresentation';

/**
 * One notification row, shared by the bell popover and the notifications
 * page so the two never drift apart.
 *
 * Clicking marks it read and follows its deep link (a fault notification
 * opens that machine's fault tab). Unread rows carry a tinted background
 * and a dot, which is the only difference between the two states -- the
 * text itself stays at full contrast so a read notification is still
 * comfortably legible.
 */
export default function NotificationItem({ notification, onSelect, dense = false }) {
    const { icon, color, label } = notificationDisplay(notification.type);
    const unread = !notification.readAt;

    return (
        <ListItemButton
            onClick={() => onSelect?.(notification)}
            alignItems="flex-start"
            sx={{
                gap: 1.5,
                py: dense ? 1.25 : 1.75,
                px: dense ? 1.75 : 2,
                alignItems: 'flex-start',
                bgcolor: unread
                    ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.05)
                    : 'transparent',
            }}
        >
            <Box
                aria-hidden
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: 2,
                    mt: 0.25,
                    color: `${color}.main`,
                    bgcolor: (theme) => alpha(
                        theme.palette[color]?.main || theme.palette.primary.main,
                        theme.palette.mode === 'dark' ? 0.2 : 0.1
                    ),
                }}
            >
                {icon}
            </Box>

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography
                        variant="body2"
                        fontWeight={unread ? 700 : 600}
                        sx={{ flexGrow: 1, minWidth: 0 }}
                    >
                        {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {formatRelativeTime(notification.createdAt)}
                    </Typography>
                </Box>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mt: 0.25,
                        // Two lines in the popover, full text on the page.
                        ...(dense && {
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }),
                    }}
                >
                    {notification.body}
                </Typography>

                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    {label}
                    {notification.sender?.name ? ` · ${notification.sender.name}` : ''}
                </Typography>
            </Box>

            {unread && (
                <Box
                    // Redundant with the tinted row for sighted users, but it's
                    // the only unread cue a screen reader gets.
                    aria-label="Unread"
                    role="img"
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        flexShrink: 0,
                        mt: 1.25,
                    }}
                />
            )}
        </ListItemButton>
    );
}
