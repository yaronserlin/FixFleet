jest.mock('./apiClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
}));

import apiClient from './apiClient';
import notificationsService from './notificationsService';

const resolveWithData = (data) => Promise.resolve({ data });

describe('notificationsService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getAll requests the feed and returns the envelope', async () => {
        const envelope = { notifications: [{ _id: 'n1' }], unreadCount: 1, total: 1 };
        apiClient.get.mockReturnValueOnce(resolveWithData(envelope));

        const result = await notificationsService.getAll({ limit: 20 });

        expect(apiClient.get).toHaveBeenCalledWith('/notifications', { params: { limit: 20 } });
        expect(result).toEqual(envelope);
    });

    it('getUnreadCount hits the dedicated badge endpoint', async () => {
        apiClient.get.mockReturnValueOnce(resolveWithData({ unreadCount: 3 }));

        const result = await notificationsService.getUnreadCount();

        expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
        expect(result).toEqual({ unreadCount: 3 });
    });

    it('markRead PATCHes the notification', async () => {
        apiClient.patch.mockReturnValueOnce(resolveWithData({ _id: 'n1', readAt: 'now' }));

        await notificationsService.markRead('n1');

        expect(apiClient.patch).toHaveBeenCalledWith('/notifications/n1/read');
    });

    it('markAllRead POSTs to read-all', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({ updated: 4 }));

        const result = await notificationsService.markAllRead();

        expect(apiClient.post).toHaveBeenCalledWith('/notifications/read-all');
        expect(result).toEqual({ updated: 4 });
    });

    it('sendAnnouncement posts the composed message', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({ recipients: 7 }));
        const payload = { title: 'Depot closed', body: 'Friday', roles: ['mechanic'] };

        const result = await notificationsService.sendAnnouncement(payload);

        expect(apiClient.post).toHaveBeenCalledWith('/notifications/announcements', payload);
        expect(result).toEqual({ recipients: 7 });
    });

    describe('push registration', () => {
        it('getPushPublicKey reports whether the server has push configured', async () => {
            apiClient.get.mockReturnValueOnce(resolveWithData({ enabled: true, publicKey: 'BKey' }));

            const result = await notificationsService.getPushPublicKey();

            expect(apiClient.get).toHaveBeenCalledWith('/notifications/push/public-key');
            expect(result).toEqual({ enabled: true, publicKey: 'BKey' });
        });

        it('serializes a browser PushSubscription via toJSON before sending it', async () => {
            apiClient.post.mockReturnValueOnce(resolveWithData({ subscribed: true }));
            // A real PushSubscription isn't a plain object -- its fields only
            // survive JSON via toJSON(), so the service must call it.
            const browserSubscription = {
                endpoint: 'https://push.example.com/abc',
                toJSON: () => ({
                    endpoint: 'https://push.example.com/abc',
                    keys: { p256dh: 'p', auth: 'a' },
                }),
            };

            await notificationsService.subscribeToPush(browserSubscription);

            expect(apiClient.post).toHaveBeenCalledWith('/notifications/push/subscriptions', {
                subscription: { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p', auth: 'a' } },
            });
        });

        it('accepts a plain subscription object too', async () => {
            apiClient.post.mockReturnValueOnce(resolveWithData({ subscribed: true }));
            const plain = { endpoint: 'https://push.example.com/xyz', keys: { p256dh: 'p', auth: 'a' } };

            await notificationsService.subscribeToPush(plain);

            expect(apiClient.post).toHaveBeenCalledWith('/notifications/push/subscriptions', {
                subscription: plain,
            });
        });

        it('unsubscribeFromPush sends the endpoint in the DELETE body', async () => {
            apiClient.delete.mockReturnValueOnce(resolveWithData({ removed: true }));

            await notificationsService.unsubscribeFromPush('https://push.example.com/abc');

            expect(apiClient.delete).toHaveBeenCalledWith('/notifications/push/subscriptions', {
                data: { endpoint: 'https://push.example.com/abc' },
            });
        });
    });
});
