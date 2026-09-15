// src/components/Notifications/notificationPresentation.test.jsx
import { notificationDisplay, formatRelativeTime, NOTIFICATION_TYPES } from './notificationPresentation';

describe('notificationDisplay', () => {
    it('gives each known type its own icon, colour and label', () => {
        const fault = notificationDisplay(NOTIFICATION_TYPES.FAULT_REPORTED);
        const announcement = notificationDisplay(NOTIFICATION_TYPES.ANNOUNCEMENT);

        expect(fault.label).toBe('Fault reported');
        expect(fault.color).toBe('error');
        expect(announcement.label).toBe('Announcement');
        expect(announcement.color).toBe('primary');
        expect(fault.icon).not.toBe(announcement.icon);
    });

    it('falls back to a generic bell for an unknown type', () => {
        // A type the server added before this client shipped must still render.
        const unknown = notificationDisplay('something_new');
        expect(unknown.label).toBe('Notification');
        expect(unknown.icon).toBeTruthy();
    });

    it('falls back for a missing type', () => {
        expect(notificationDisplay(undefined).label).toBe('Notification');
    });
});

describe('formatRelativeTime', () => {
    const minutes = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();
    const hours = (n) => minutes(n * 60);
    const days = (n) => hours(n * 24);

    it('says "just now" under a minute', () => {
        expect(formatRelativeTime(new Date().toISOString())).toBe('just now');
    });

    it('counts minutes, then hours, then days', () => {
        expect(formatRelativeTime(minutes(5))).toBe('5m ago');
        expect(formatRelativeTime(hours(3))).toBe('3h ago');
        expect(formatRelativeTime(days(2))).toBe('2d ago');
    });

    it('switches to a date past a week, where "14d ago" stops being useful', () => {
        const old = new Date('2020-03-14T10:00:00.000Z');
        expect(formatRelativeTime(old.toISOString())).toMatch(/Mar/);
    });

    it('returns an empty string for missing or unparseable input', () => {
        expect(formatRelativeTime(null)).toBe('');
        expect(formatRelativeTime(undefined)).toBe('');
        expect(formatRelativeTime('not a date')).toBe('');
    });

    it('accepts a Date as well as an ISO string', () => {
        expect(formatRelativeTime(new Date(Date.now() - 10 * 60 * 1000))).toBe('10m ago');
    });
});
