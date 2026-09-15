// src/contexts/NotificationFeedContext.test.jsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { NotificationFeedProvider, useNotificationFeed } from './NotificationFeedContext';
import notificationsService from '../services/notificationsService';
import { useAuth } from './AuthContext';

jest.mock('../services/notificationsService', () => ({
    __esModule: true,
    default: {
        getAll: jest.fn(),
        getUnreadCount: jest.fn(),
        markRead: jest.fn(),
        markAllRead: jest.fn(),
    },
}));
jest.mock('./AuthContext', () => ({ __esModule: true, useAuth: jest.fn() }));

function Consumer() {
    const { notifications, unreadCount, loading, markRead, markAllRead, refresh } = useNotificationFeed();
    return (
        <div>
            <span data-testid="unread">{unreadCount}</span>
            <span data-testid="count">{notifications.length}</span>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="titles">{notifications.map(n => `${n.title}:${n.readAt ? 'read' : 'unread'}`).join(',')}</span>
            <button onClick={() => markRead('n1')}>mark-n1</button>
            <button onClick={markAllRead}>mark-all</button>
            <button onClick={() => refresh()}>refresh</button>
        </div>
    );
}

const feed = (overrides = {}) => ({
    notifications: [
        { _id: 'n1', title: 'Fault', body: 'b', readAt: null, createdAt: '2026-01-01T00:00:00.000Z' },
        { _id: 'n2', title: 'Notice', body: 'b', readAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    unreadCount: 1,
    ...overrides,
});

function renderFeed(user = { id: 'u1', role: 'mechanic' }) {
    useAuth.mockReturnValue({ user });
    return render(
        <NotificationFeedProvider>
            <Consumer />
        </NotificationFeedProvider>
    );
}

describe('NotificationFeedContext', () => {
    let warnSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        notificationsService.getAll.mockResolvedValue(feed());
        notificationsService.getUnreadCount.mockResolvedValue({ unreadCount: 1 });
        notificationsService.markRead.mockResolvedValue({});
        notificationsService.markAllRead.mockResolvedValue({ updated: 1 });
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => warnSpy.mockRestore());

    it('loads the feed and its unread count for a signed-in user', async () => {
        renderFeed();
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        expect(screen.getByTestId('unread').textContent).toBe('1');
        expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    it('fetches nothing when there is no signed-in user', async () => {
        renderFeed(null);
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        expect(notificationsService.getAll).not.toHaveBeenCalled();
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('fetches nothing while a forced password change is pending', async () => {
        // Such a user is blocked from every other API route, so polling
        // would just generate 403s.
        renderFeed({ id: 'u1', role: 'mechanic', mustChangePassword: true });
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        expect(notificationsService.getAll).not.toHaveBeenCalled();
    });

    it('marks one notification read optimistically, before the server replies', async () => {
        let resolveMarkRead;
        notificationsService.markRead.mockReturnValueOnce(new Promise((resolve) => { resolveMarkRead = resolve; }));

        renderFeed();
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

        await act(async () => { screen.getByText('mark-n1').click(); });

        // Badge and row update immediately, with the request still in flight.
        expect(screen.getByTestId('unread').textContent).toBe('0');
        expect(screen.getByTestId('titles').textContent).toContain('Fault:read');

        await act(async () => { resolveMarkRead({}); });
        expect(notificationsService.markRead).toHaveBeenCalledWith('n1');
    });

    it('does not double-decrement when an already-read notification is marked again', async () => {
        notificationsService.getAll.mockResolvedValue(feed({
            notifications: [{ _id: 'n1', title: 'Fault', body: 'b', readAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' }],
            unreadCount: 0,
        }));
        renderFeed();
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

        await act(async () => { screen.getByText('mark-n1').click(); });

        expect(screen.getByTestId('unread').textContent).toBe('0');
    });

    it('re-syncs from the server when marking read fails', async () => {
        notificationsService.markRead.mockRejectedValueOnce(new Error('offline'));
        renderFeed();
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
        notificationsService.getAll.mockClear();

        await act(async () => { screen.getByText('mark-n1').click(); });

        // The server is the authority on what's read, so it refetches rather
        // than trying to invert the optimistic update.
        await waitFor(() => expect(notificationsService.getAll).toHaveBeenCalled());
    });

    it('marks everything read and zeroes the badge', async () => {
        renderFeed();
        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

        await act(async () => { screen.getByText('mark-all').click(); });

        expect(screen.getByTestId('unread').textContent).toBe('0');
        expect(screen.getByTestId('titles').textContent).toBe('Fault:read,Notice:read');
        expect(notificationsService.markAllRead).toHaveBeenCalled();
    });

    it('keeps the app usable when the feed request fails', async () => {
        notificationsService.getAll.mockRejectedValueOnce(new Error('network'));
        renderFeed();

        // The feed is ambient: a failed load leaves an empty list, never an
        // error that blocks the page the user is actually working on.
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('exposes an inert feed outside a provider so components render in isolation', () => {
        useAuth.mockReturnValue({ user: null });
        expect(() => render(<Consumer />)).not.toThrow();
        expect(screen.getByTestId('unread').textContent).toBe('0');
    });
});
