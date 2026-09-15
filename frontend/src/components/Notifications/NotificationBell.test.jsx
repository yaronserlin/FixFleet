// src/components/Notifications/NotificationBell.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useNotificationFeed } from '../../contexts/NotificationFeedContext';

jest.mock('../../contexts/NotificationFeedContext', () => ({
    __esModule: true,
    useNotificationFeed: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const faultNotification = {
    _id: 'n1',
    type: 'fault_reported',
    title: 'New fault on Bulldozer',
    body: 'Dana reported: hydraulic leak',
    link: '/equipment/t1?tab=faults',
    readAt: null,
    createdAt: new Date().toISOString(),
};

const readAnnouncement = {
    _id: 'n2',
    type: 'announcement',
    title: 'Depot closed',
    body: 'Friday',
    link: '/notifications',
    readAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
};

function setup(overrides = {}) {
    const feed = {
        notifications: [faultNotification, readAnnouncement],
        unreadCount: 1,
        loading: false,
        markRead: jest.fn(),
        markAllRead: jest.fn(),
        refresh: jest.fn(),
        ...overrides,
    };
    useNotificationFeed.mockReturnValue(feed);
    render(
        <MemoryRouter>
            <NotificationBell />
        </MemoryRouter>
    );
    return feed;
}

const openBell = () => fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

describe('NotificationBell', () => {
    afterEach(() => jest.clearAllMocks());

    it('announces the unread count in its accessible name', () => {
        setup({ unreadCount: 3 });
        expect(screen.getByRole('button', { name: /notifications \(3 unread\)/i })).toBeInTheDocument();
    });

    it('drops the count from the label when everything is read', () => {
        setup({ unreadCount: 0 });
        const button = screen.getByRole('button', { name: /notifications/i });
        expect(button).toHaveAccessibleName('Notifications');
    });

    it('lists recent notifications when opened, and refreshes the possibly-stale list', () => {
        const feed = setup();
        openBell();

        expect(screen.getByText('New fault on Bulldozer')).toBeInTheDocument();
        expect(screen.getByText('Depot closed')).toBeInTheDocument();
        // The badge is polled, but the list behind it may be a minute old.
        expect(feed.refresh).toHaveBeenCalled();
    });

    it('marks an unread notification read and follows its deep link', () => {
        const feed = setup();
        openBell();

        fireEvent.click(screen.getByText('New fault on Bulldozer'));

        expect(feed.markRead).toHaveBeenCalledWith('n1');
        expect(mockNavigate).toHaveBeenCalledWith('/equipment/t1?tab=faults');
    });

    it('does not re-mark a notification that is already read', () => {
        const feed = setup();
        openBell();

        fireEvent.click(screen.getByText('Depot closed'));

        expect(feed.markRead).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/notifications');
    });

    it('offers "mark all read" only while something is unread', () => {
        const feed = setup();
        openBell();
        fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
        expect(feed.markAllRead).toHaveBeenCalled();
    });

    it('hides "mark all read" when the feed is fully read', () => {
        setup({ unreadCount: 0, notifications: [readAnnouncement] });
        openBell();
        expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument();
    });

    it('shows an empty state when there is nothing to show', () => {
        setup({ notifications: [], unreadCount: 0 });
        openBell();
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });

    it('shows a skeleton on first load rather than a misleading empty state', () => {
        setup({ notifications: [], unreadCount: 0, loading: true });
        openBell();
        expect(screen.getByRole('status', { name: /loading notifications/i })).toBeInTheDocument();
        expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    });

    it('links through to the full notifications page', () => {
        setup();
        openBell();
        fireEvent.click(screen.getByRole('button', { name: /view all notifications/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/notifications');
    });
});
