// src/components/PullToRefresh/PullToRefresh.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PullToRefresh from './PullToRefresh';

function touch(clientY) {
    return { touches: [{ clientY }] };
}

describe('PullToRefresh', () => {
    afterEach(() => {
        window.scrollY = 0;
    });

    it('renders its children', () => {
        render(
            <PullToRefresh onRefresh={jest.fn()}>
                <div data-testid="page-content">Dashboard content</div>
            </PullToRefresh>
        );
        expect(screen.getByTestId('page-content')).toHaveTextContent('Dashboard content');
    });

    it('calls onRefresh when the page is pulled down past the threshold and released', async () => {
        let resolveRefresh;
        const onRefresh = jest.fn(() => new Promise((resolve) => { resolveRefresh = resolve; }));
        const { container } = render(
            <PullToRefresh onRefresh={onRefresh}>
                <div>content</div>
            </PullToRefresh>
        );
        const wrapper = container.firstChild;

        fireEvent.touchStart(wrapper, touch(0));
        fireEvent.touchMove(wrapper, touch(250)); // well past the default 70px threshold
        fireEvent.touchEnd(wrapper);

        expect(onRefresh).toHaveBeenCalledTimes(1);
        resolveRefresh();
        await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    });

    it('does not call onRefresh for a short pull under the threshold', () => {
        const onRefresh = jest.fn();
        const { container } = render(
            <PullToRefresh onRefresh={onRefresh}>
                <div>content</div>
            </PullToRefresh>
        );
        const wrapper = container.firstChild;

        fireEvent.touchStart(wrapper, touch(0));
        fireEvent.touchMove(wrapper, touch(20));
        fireEvent.touchEnd(wrapper);

        expect(onRefresh).not.toHaveBeenCalled();
    });

    it('does not respond to the gesture when disabled', () => {
        const onRefresh = jest.fn();
        const { container } = render(
            <PullToRefresh onRefresh={onRefresh} disabled>
                <div>content</div>
            </PullToRefresh>
        );
        const wrapper = container.firstChild;

        fireEvent.touchStart(wrapper, touch(0));
        fireEvent.touchMove(wrapper, touch(250));
        fireEvent.touchEnd(wrapper);

        expect(onRefresh).not.toHaveBeenCalled();
    });
});
