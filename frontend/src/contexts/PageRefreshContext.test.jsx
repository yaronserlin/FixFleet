// src/contexts/PageRefreshContext.test.jsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import {
    PageRefreshProvider,
    usePageRefresh,
    usePageRefreshTrigger,
} from './PageRefreshContext';

// Exposes the provider's trigger as a button, so a test can "pull to
// refresh" the same way AppLayout's gesture does.
function RefreshButton() {
    const refresh = usePageRefreshTrigger();
    return <button onClick={() => refresh()}>refresh</button>;
}

function Page({ onRefresh, label = 'page' }) {
    usePageRefresh(onRefresh);
    return <div>{label}</div>;
}

function setup(ui) {
    return render(
        <PageRefreshProvider>
            <RefreshButton />
            {ui}
        </PageRefreshProvider>
    );
}

async function clickRefresh() {
    await act(async () => {
        screen.getByText('refresh').click();
    });
}

describe('PageRefreshContext', () => {
    it("runs the mounted page's registered handler", async () => {
        const onRefresh = jest.fn().mockResolvedValue(undefined);
        setup(<Page onRefresh={onRefresh} />);

        await clickRefresh();

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('stops calling a handler once its page unmounts', async () => {
        const onRefresh = jest.fn().mockResolvedValue(undefined);
        const { rerender } = setup(<Page onRefresh={onRefresh} />);

        await clickRefresh();
        expect(onRefresh).toHaveBeenCalledTimes(1);

        rerender(
            <PageRefreshProvider>
                <RefreshButton />
            </PageRefreshProvider>
        );
        await clickRefresh();

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('calls every registered handler, so a page and a self-fetching child both refresh', async () => {
        const pageRefresh = jest.fn().mockResolvedValue(undefined);
        const childRefresh = jest.fn().mockResolvedValue(undefined);
        setup(
            <>
                <Page onRefresh={pageRefresh} label="page" />
                <Page onRefresh={childRefresh} label="child" />
            </>
        );

        await clickRefresh();

        expect(pageRefresh).toHaveBeenCalledTimes(1);
        expect(childRefresh).toHaveBeenCalledTimes(1);
    });

    it('always invokes the latest handler without re-registering on every render', async () => {
        // Pages pass a fresh closure each render; the subscription reads
        // through a ref so it survives that identity churn.
        const first = jest.fn().mockResolvedValue(undefined);
        const second = jest.fn().mockResolvedValue(undefined);
        const { rerender } = setup(<Page onRefresh={first} />);

        rerender(
            <PageRefreshProvider>
                <RefreshButton />
                <Page onRefresh={second} />
            </PageRefreshProvider>
        );
        await clickRefresh();

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('settles when a handler rejects, so the pull indicator never hangs', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const failing = jest.fn().mockRejectedValue(new Error('boom'));
        const healthy = jest.fn().mockResolvedValue(undefined);
        setup(
            <>
                <Page onRefresh={failing} label="failing" />
                <Page onRefresh={healthy} label="healthy" />
            </>
        );

        await clickRefresh();

        // One handler blowing up must not abort the others.
        expect(failing).toHaveBeenCalledTimes(1);
        expect(healthy).toHaveBeenCalledTimes(1);
        consoleSpy.mockRestore();
    });

    it('is a no-op outside a provider, so pages stay renderable in isolation', () => {
        const onRefresh = jest.fn();
        expect(() => render(<Page onRefresh={onRefresh} />)).not.toThrow();
        expect(screen.getByText('page')).toBeInTheDocument();
    });

    it('resolves the trigger to a harmless promise when no page has registered', async () => {
        render(
            <PageRefreshProvider>
                <RefreshButton />
            </PageRefreshProvider>
        );
        await expect(clickRefresh()).resolves.toBeUndefined();
    });
});
