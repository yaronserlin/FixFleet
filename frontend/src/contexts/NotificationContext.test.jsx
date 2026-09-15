// src/contexts/NotificationContext.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotify } from './NotificationContext';

function Consumer() {
    const notify = useNotify();
    return (
        <div>
            <button onClick={() => notify.success('Saved successfully')}>fire-success</button>
            <button onClick={() => notify.error('Something broke')}>fire-error</button>
            <button onClick={() => notify.info('Heads up')}>fire-info</button>
            <button onClick={() => notify.warning('Careful now')}>fire-warning</button>
        </div>
    );
}

describe('NotificationContext', () => {
    it('shows a success snackbar with the given message', async () => {
        render(<NotificationProvider><Consumer /></NotificationProvider>);
        fireEvent.click(screen.getByText('fire-success'));
        expect(await screen.findByText('Saved successfully')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorSuccess');
    });

    it('shows an error snackbar with the given message', async () => {
        render(<NotificationProvider><Consumer /></NotificationProvider>);
        fireEvent.click(screen.getByText('fire-error'));
        expect(await screen.findByText('Something broke')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError');
    });

    it('shows an info snackbar with the given message', async () => {
        render(<NotificationProvider><Consumer /></NotificationProvider>);
        fireEvent.click(screen.getByText('fire-info'));
        expect(await screen.findByText('Heads up')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorInfo');
    });

    it('shows a warning snackbar with the given message', async () => {
        render(<NotificationProvider><Consumer /></NotificationProvider>);
        fireEvent.click(screen.getByText('fire-warning'));
        expect(await screen.findByText('Careful now')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorWarning');
    });

    it('replaces the previous message when a new one is fired before the old one is dismissed', async () => {
        render(<NotificationProvider><Consumer /></NotificationProvider>);
        fireEvent.click(screen.getByText('fire-success'));
        expect(await screen.findByText('Saved successfully')).toBeInTheDocument();

        fireEvent.click(screen.getByText('fire-error'));
        await waitFor(() => expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError'));
        expect(screen.getByText('Something broke')).toBeInTheDocument();
    });

    it('closes the snackbar when the alert close button is clicked', async () => {
        render(<NotificationProvider><Consumer /></NotificationProvider>);
        fireEvent.click(screen.getByText('fire-success'));
        expect(await screen.findByText('Saved successfully')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        await waitFor(() => expect(screen.queryByText('Saved successfully')).not.toBeInTheDocument());
    });

    describe('notify identity', () => {
        it('is stable across renders (useMemo with empty deps)', () => {
            const captured = [];
            function Capture() {
                const notify = useNotify();
                captured.push(notify);
                return null;
            }
            function Harness() {
                const [tick, setTick] = React.useState(0);
                return (
                    <>
                        <NotificationProvider><Capture /></NotificationProvider>
                        <button onClick={() => setTick((t) => t + 1)}>tick-{tick}</button>
                    </>
                );
            }
            render(<Harness />);
            const first = captured[0];
            fireEvent.click(screen.getByText(/tick-/));
            expect(captured[captured.length - 1]).toBe(first);
        });
    });

    describe('useNotify guard', () => {
        it('throws when used outside a NotificationProvider', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const Bad = () => { useNotify(); return null; };
            expect(() => render(<Bad />)).toThrow('useNotify must be used within NotificationProvider');
            consoleSpy.mockRestore();
        });
    });
});
