// src/hooks/usePullToRefresh.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import usePullToRefresh from './usePullToRefresh';

function TestHarness({ onRefresh, disabled, getScrollTop, threshold, maxPull }) {
    const { containerRef, pullDistance, refreshing } = usePullToRefresh({
        onRefresh,
        disabled,
        getScrollTop,
        threshold,
        maxPull,
    });
    return (
        <div ref={containerRef} data-testid="scroll-area">
            <span data-testid="pull-distance">{pullDistance}</span>
            <span data-testid="refreshing">{String(refreshing)}</span>
        </div>
    );
}

function touch(clientY) {
    return { touches: [{ clientY }] };
}

describe('usePullToRefresh', () => {
    afterEach(() => {
        window.scrollY = 0;
    });

    it('tracks pull distance (with resistance) while dragging down from the top', () => {
        render(<TestHarness onRefresh={jest.fn()} threshold={70} maxPull={120} getScrollTop={() => 0} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(0));
        fireEvent.touchMove(el, touch(60)); // deltaY = 60, * 0.5 resistance = 30

        expect(Number(screen.getByTestId('pull-distance').textContent)).toBe(30);
    });

    it('caps the pull distance at maxPull', () => {
        render(<TestHarness onRefresh={jest.fn()} threshold={70} maxPull={80} getScrollTop={() => 0} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(0));
        fireEvent.touchMove(el, touch(1000)); // way past maxPull after resistance

        expect(Number(screen.getByTestId('pull-distance').textContent)).toBe(80);
    });

    it('does nothing when the drag starts while the page is not scrolled to the top', () => {
        render(<TestHarness onRefresh={jest.fn()} getScrollTop={() => 50} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(0));
        fireEvent.touchMove(el, touch(80));

        expect(Number(screen.getByTestId('pull-distance').textContent)).toBe(0);
    });

    it('resets without calling onRefresh when released before the threshold', async () => {
        const onRefresh = jest.fn();
        render(<TestHarness onRefresh={onRefresh} threshold={70} getScrollTop={() => 0} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(0));
        fireEvent.touchMove(el, touch(60)); // 30px pulled, under the 70px threshold
        fireEvent.touchEnd(el);

        await waitFor(() => expect(screen.getByTestId('pull-distance').textContent).toBe('0'));
        expect(onRefresh).not.toHaveBeenCalled();
    });

    it('calls onRefresh and shows refreshing when released past the threshold, then resets', async () => {
        let resolveRefresh;
        const onRefresh = jest.fn(() => new Promise((resolve) => { resolveRefresh = resolve; }));
        render(<TestHarness onRefresh={onRefresh} threshold={70} maxPull={120} getScrollTop={() => 0} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(0));
        fireEvent.touchMove(el, touch(200)); // 100px pulled, past the 70px threshold
        fireEvent.touchEnd(el);

        expect(onRefresh).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(screen.getByTestId('refreshing').textContent).toBe('true'));

        resolveRefresh();
        await waitFor(() => expect(screen.getByTestId('refreshing').textContent).toBe('false'));
        expect(screen.getByTestId('pull-distance').textContent).toBe('0');
    });

    it('ignores the gesture entirely while disabled', () => {
        const onRefresh = jest.fn();
        render(<TestHarness onRefresh={onRefresh} disabled getScrollTop={() => 0} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(0));
        fireEvent.touchMove(el, touch(200));
        fireEvent.touchEnd(el);

        expect(Number(screen.getByTestId('pull-distance').textContent)).toBe(0);
        expect(onRefresh).not.toHaveBeenCalled();
    });

    it('defaults to reading window.scrollY when no getScrollTop is provided', () => {
        window.scrollY = 10;
        render(<TestHarness onRefresh={jest.fn()} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(0));
        fireEvent.touchMove(el, touch(80));

        // Page isn't at the top per window.scrollY, so the pull is ignored.
        expect(Number(screen.getByTestId('pull-distance').textContent)).toBe(0);
    });

    it('an upward drag (deltaY <= 0) never registers a pull', () => {
        render(<TestHarness onRefresh={jest.fn()} getScrollTop={() => 0} />);
        const el = screen.getByTestId('scroll-area');

        fireEvent.touchStart(el, touch(100));
        fireEvent.touchMove(el, touch(40)); // moved up

        expect(Number(screen.getByTestId('pull-distance').textContent)).toBe(0);
    });
});
