// src/hooks/usePushNotifications.test.js
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import usePushNotifications, { urlBase64ToUint8Array } from './usePushNotifications';
import notificationsService from '../services/notificationsService';

jest.mock('../services/notificationsService', () => ({
    __esModule: true,
    default: {
        getPushPublicKey: jest.fn(),
        subscribeToPush: jest.fn(),
        unsubscribeFromPush: jest.fn(),
    },
}));

function Consumer() {
    const { supported, enabled, serverConfigured, ready, subscribe, unsubscribe } = usePushNotifications();
    return (
        <div>
            <span data-testid="supported">{String(supported)}</span>
            <span data-testid="enabled">{String(enabled)}</span>
            <span data-testid="configured">{String(serverConfigured)}</span>
            <span data-testid="ready">{String(ready)}</span>
            <button onClick={subscribe}>subscribe</button>
            <button onClick={unsubscribe}>unsubscribe</button>
        </div>
    );
}

const originalNotification = global.Notification;
const originalServiceWorker = global.navigator.serviceWorker;
const originalPushManager = global.window.PushManager;

let pushManager;
let existingSubscription;

function installPushEnvironment({ permission = 'default', existing = null } = {}) {
    existingSubscription = existing;

    pushManager = {
        getSubscription: jest.fn(async () => existingSubscription),
        subscribe: jest.fn(async () => ({
            endpoint: 'https://push.example.com/new',
            toJSON: () => ({ endpoint: 'https://push.example.com/new', keys: { p256dh: 'p', auth: 'a' } }),
            unsubscribe: jest.fn(async () => true),
        })),
    };

    global.Notification = {
        permission,
        requestPermission: jest.fn(async () => 'granted'),
    };
    global.window.PushManager = function PushManagerStub() {};
    Object.defineProperty(global.navigator, 'serviceWorker', {
        configurable: true,
        value: { ready: Promise.resolve({ pushManager }) },
    });
}

function removePushSupport() {
    delete global.window.PushManager;
    Object.defineProperty(global.navigator, 'serviceWorker', {
        configurable: true,
        value: undefined,
    });
}

describe('usePushNotifications', () => {
    let warnSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        notificationsService.getPushPublicKey.mockResolvedValue({ enabled: true, publicKey: 'QUJD' });
        notificationsService.subscribeToPush.mockResolvedValue({ subscribed: true });
        notificationsService.unsubscribeFromPush.mockResolvedValue({ removed: true });
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
        global.Notification = originalNotification;
        global.window.PushManager = originalPushManager;
        Object.defineProperty(global.navigator, 'serviceWorker', {
            configurable: true,
            value: originalServiceWorker,
        });
    });

    describe('urlBase64ToUint8Array', () => {
        it('decodes a base64url VAPID key, restoring padding', () => {
            // "ABC" base64url-encodes to "QUJD"; PushManager.subscribe needs bytes.
            expect(Array.from(urlBase64ToUint8Array('QUJD'))).toEqual([65, 66, 67]);
        });

        it('translates the url-safe alphabet back to standard base64', () => {
            // '-' and '_' stand in for '+' and '/'.
            const decoded = urlBase64ToUint8Array('-_8');
            expect(Array.from(decoded)).toEqual([251, 255]);
        });
    });

    it('reports an unsupported browser without calling the server', async () => {
        removePushSupport();
        render(<Consumer />);

        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
        expect(screen.getByTestId('supported').textContent).toBe('false');
        expect(notificationsService.getPushPublicKey).not.toHaveBeenCalled();
    });

    it('detects a subscription this browser already holds', async () => {
        installPushEnvironment({ permission: 'granted', existing: { endpoint: 'https://push.example.com/existing' } });
        render(<Consumer />);

        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
        expect(screen.getByTestId('enabled').textContent).toBe('true');
        expect(screen.getByTestId('configured').textContent).toBe('true');
    });

    it('starts disabled when this browser has no subscription', async () => {
        installPushEnvironment();
        render(<Consumer />);

        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
        expect(screen.getByTestId('enabled').textContent).toBe('false');
    });

    it('subscribes: asks permission, subscribes the browser, registers the endpoint', async () => {
        installPushEnvironment();
        render(<Consumer />);
        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        await act(async () => { screen.getByText('subscribe').click(); });

        expect(global.Notification.requestPermission).toHaveBeenCalled();
        expect(pushManager.subscribe).toHaveBeenCalledWith(
            expect.objectContaining({ userVisibleOnly: true })
        );
        expect(notificationsService.subscribeToPush).toHaveBeenCalled();
        expect(screen.getByTestId('enabled').textContent).toBe('true');
    });

    it('reuses an existing browser subscription instead of minting a second endpoint', async () => {
        const existing = { endpoint: 'https://push.example.com/existing', toJSON: () => ({}) };
        installPushEnvironment({ permission: 'granted', existing });
        render(<Consumer />);
        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        await act(async () => { screen.getByText('subscribe').click(); });

        // Re-subscribing would orphan the old endpoint server-side.
        expect(pushManager.subscribe).not.toHaveBeenCalled();
        expect(notificationsService.subscribeToPush).toHaveBeenCalledWith(existing);
    });

    it('stays off when the user denies permission', async () => {
        installPushEnvironment();
        global.Notification.requestPermission = jest.fn(async () => 'denied');
        render(<Consumer />);
        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        await act(async () => { screen.getByText('subscribe').click(); });

        expect(pushManager.subscribe).not.toHaveBeenCalled();
        expect(screen.getByTestId('enabled').textContent).toBe('false');
    });

    it('stays off when the server has no VAPID keys configured', async () => {
        installPushEnvironment();
        notificationsService.getPushPublicKey.mockResolvedValue({ enabled: false, publicKey: '' });
        render(<Consumer />);
        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        await act(async () => { screen.getByText('subscribe').click(); });

        expect(pushManager.subscribe).not.toHaveBeenCalled();
        expect(screen.getByTestId('enabled').textContent).toBe('false');
    });

    it('unsubscribes both server-side and in the browser', async () => {
        const unsubscribe = jest.fn(async () => true);
        installPushEnvironment({
            permission: 'granted',
            existing: { endpoint: 'https://push.example.com/existing', unsubscribe },
        });
        render(<Consumer />);
        await waitFor(() => expect(screen.getByTestId('enabled').textContent).toBe('true'));

        await act(async () => { screen.getByText('unsubscribe').click(); });

        expect(notificationsService.unsubscribeFromPush).toHaveBeenCalledWith('https://push.example.com/existing');
        expect(unsubscribe).toHaveBeenCalled();
        expect(screen.getByTestId('enabled').textContent).toBe('false');
    });

    it('resolves to "off" rather than throwing when subscribing fails', async () => {
        installPushEnvironment();
        notificationsService.subscribeToPush.mockRejectedValueOnce(new Error('network'));
        render(<Consumer />);
        await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

        await act(async () => { screen.getByText('subscribe').click(); });

        // Push is an enhancement: a failure leaves it off, not broken.
        expect(screen.getByTestId('enabled').textContent).toBe('false');
    });
});
