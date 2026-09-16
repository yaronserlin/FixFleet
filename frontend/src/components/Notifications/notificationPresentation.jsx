// src/components/Notifications/notificationPresentation.jsx
import React from 'react';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CampaignIcon from '@mui/icons-material/Campaign';
import NotificationsIcon from '@mui/icons-material/Notifications';

/**
 * Presentation rules shared by every surface that renders a notification
 * (the bell's popover and the full-page feed), so an announcement looks the
 * same wherever it appears.
 *
 * Kept in its own module rather than alongside the components so the
 * helpers can be imported without dragging a component tree along, and so
 * the component files stay component-only for Fast Refresh.
 */

/** Notification `type` values, mirroring backend/constants/notifications.js. */
export const NOTIFICATION_TYPES = Object.freeze({
    FAULT_REPORTED: 'fault_reported',
    ANNOUNCEMENT: 'announcement',
});

const TYPE_CONFIG = {
    [NOTIFICATION_TYPES.FAULT_REPORTED]: {
        icon: <ReportProblemIcon fontSize="small" />,
        color: 'error',
        label: 'Fault reported',
    },
    [NOTIFICATION_TYPES.ANNOUNCEMENT]: {
        icon: <CampaignIcon fontSize="small" />,
        color: 'primary',
        label: 'Announcement',
    },
};

const FALLBACK_CONFIG = {
    icon: <NotificationsIcon fontSize="small" />,
    color: 'primary',
    label: 'Notification',
};

/**
 * Icon, palette colour and human label for a notification type.
 * Unknown types (e.g. one added server-side before this client ships) fall
 * back to a generic bell rather than rendering nothing.
 *
 * @param {string} type
 * @returns {{ icon: React.ReactNode, color: string, label: string }}
 */
export function notificationDisplay(type) {
    return TYPE_CONFIG[type] || FALLBACK_CONFIG;
}

/**
 * Orders a notification list unread-first, otherwise preserving the input
 * order (a stable sort, relied on here since the list already arrives
 * newest-first from the server).
 *
 * Without this, a handful of unread items can end up buried below a run of
 * older, already-read ones -- easy to miss, especially in the bell's
 * six-item preview -- purely because of when they happened to arrive
 * relative to what's already been read.
 *
 * @param {Array<{ readAt: string|null }>} notifications
 * @returns {Array} A new, re-ordered array; the input is left untouched.
 */
export function sortByUnreadFirst(notifications) {
    return [...notifications].sort((a, b) => (a.readAt ? 1 : 0) - (b.readAt ? 1 : 0));
}

/**
 * Compact relative time ("just now", "5m ago", "3d ago"), falling back to a
 * date once something is more than a week old -- past that, "14d ago" is
 * less useful than the actual day.
 *
 * @param {string|Date} value - An ISO timestamp or Date.
 * @returns {string}
 */
export function formatRelativeTime(value) {
    if (!value) return '';
    const then = new Date(value);
    if (Number.isNaN(then.getTime())) return '';

    const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
