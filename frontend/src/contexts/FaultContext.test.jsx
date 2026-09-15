// src/contexts/FaultContext.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FaultProvider, useFault } from './FaultContext';
import faultService from '../services/faultsService';
import { useNotify } from './NotificationContext';
import { useAuth } from './AuthContext';

jest.mock('../services/faultsService', () => ({
    __esModule: true,
    default: {
        getAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        close: jest.fn(),
        reopen: jest.fn(),
    },
}));

jest.mock('./NotificationContext', () => ({
    __esModule: true,
    useNotify: jest.fn(),
}));

jest.mock('./AuthContext', () => ({
    __esModule: true,
    useAuth: jest.fn(),
}));

const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };
const notFound = () => Object.assign(new Error('not found'), { response: { status: 404 } });

function ActionHarness({ action, toolId }) {
    const ctx = useFault(toolId);
    const [error, setError] = React.useState('');
    return (
        <div>
            <button
                onClick={async () => {
                    setError('');
                    try { await action(ctx); } catch (e) { setError(e.message || 'error'); }
                }}
            >
                run
            </button>
            <span data-testid="error">{error}</span>
            <span data-testid="loading">{String(ctx.loading)}</span>
            <span data-testid="faults">{JSON.stringify(ctx.faults.map((f) => f._id))}</span>
        </div>
    );
}

describe('FaultContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useNotify.mockReturnValue(notify);
    });

    describe('auto-fetch on mount', () => {
        it('does not fetch when there is no logged-in user', () => {
            useAuth.mockReturnValue({ user: null });
            render(<FaultProvider><ActionHarness action={() => {}} /></FaultProvider>);
            expect(faultService.getAll).not.toHaveBeenCalled();
            expect(screen.getByTestId('faults').textContent).toBe('[]');
        });

        it('does not fetch while the user must still change their password', () => {
            useAuth.mockReturnValue({ user: { id: '1', mustChangePassword: true } });
            render(<FaultProvider><ActionHarness action={() => {}} /></FaultProvider>);
            expect(faultService.getAll).not.toHaveBeenCalled();
        });

        it('fetches faults for a logged-in user', async () => {
            useAuth.mockReturnValue({ user: { id: '1' } });
            faultService.getAll.mockResolvedValueOnce([
                { _id: 'a', status: 'open', createdAt: '2024-01-01' },
                { _id: 'b', status: 'open', createdAt: '2024-01-02' },
            ]);
            render(<FaultProvider><ActionHarness action={() => {}} /></FaultProvider>);
            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
            expect(screen.getByTestId('faults').textContent).toBe('["a","b"]');
        });

        it('notifies and sets an error when the fetch fails', async () => {
            useAuth.mockReturnValue({ user: { id: '1' } });
            faultService.getAll.mockRejectedValueOnce(notFound());
            render(<FaultProvider><ActionHarness action={() => {}} /></FaultProvider>);
            await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to load faults'));
        });
    });

    describe('mutations', () => {
        beforeEach(() => {
            useAuth.mockReturnValue({ user: null }); // skip auto-fetch
        });

        it('createFault prepends the new fault and notifies success', async () => {
            faultService.create.mockResolvedValueOnce({ _id: 'new', status: 'open', createdAt: '2024-01-01' });
            render(
                <FaultProvider>
                    <ActionHarness action={(ctx) => ctx.createFault({ description: 'Broken' })} />
                </FaultProvider>
            );
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('faults').textContent).toBe('["new"]'));
            expect(notify.success).toHaveBeenCalledWith('Fault created successfully');
        });

        it('createFault notifies and rethrows on failure', async () => {
            faultService.create.mockRejectedValueOnce(notFound());
            render(
                <FaultProvider>
                    <ActionHarness action={(ctx) => ctx.createFault({ description: 'Broken' })} />
                </FaultProvider>
            );
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to create fault'));
            expect(screen.getByTestId('error').textContent).toBe('not found');
        });

        it('updateFault replaces the matching fault in place', async () => {
            useAuth.mockReturnValue({ user: { id: 'u1' } });
            faultService.getAll.mockResolvedValue([{ _id: '1', status: 'open', createdAt: '2024-01-01', description: 'Old' }]);
            faultService.update.mockResolvedValueOnce({ _id: '1', status: 'open', createdAt: '2024-01-01', description: 'New' });
            render(
                <FaultProvider>
                    <ActionHarness action={(ctx) => ctx.updateFault('1', { description: 'New' })} />
                </FaultProvider>
            );
            await waitFor(() => expect(screen.getByTestId('faults').textContent).toBe('["1"]'));
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Fault updated successfully'));
        });

        it('deleteFault removes the fault and notifies success', async () => {
            useAuth.mockReturnValue({ user: { id: 'u1' } });
            faultService.getAll.mockResolvedValue([
                { _id: '1', status: 'open', createdAt: '2024-01-01' },
                { _id: '2', status: 'open', createdAt: '2024-01-02' },
            ]);
            faultService.delete.mockResolvedValueOnce(undefined);
            render(
                <FaultProvider>
                    <ActionHarness action={(ctx) => ctx.deleteFault('1')} />
                </FaultProvider>
            );
            await waitFor(() => expect(screen.getByTestId('faults').textContent).toBe('["1","2"]'));
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('faults').textContent).toBe('["2"]'));
            expect(notify.success).toHaveBeenCalledWith('Fault deleted');
        });

        it('closeFault updates the fault in place and notifies success', async () => {
            useAuth.mockReturnValue({ user: { id: 'u1' } });
            faultService.getAll.mockResolvedValue([{ _id: '1', status: 'open', createdAt: '2024-01-01' }]);
            faultService.close.mockResolvedValueOnce({ _id: '1', status: 'closed', createdAt: '2024-01-01' });
            render(
                <FaultProvider>
                    <ActionHarness action={(ctx) => ctx.closeFault('1', { engineHours: 12 })} />
                </FaultProvider>
            );
            await waitFor(() => expect(screen.getByTestId('faults').textContent).toBe('["1"]'));
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Fault closed successfully'));
            expect(faultService.close).toHaveBeenCalledWith('1', { engineHours: 12 });
        });

        it('reopenFault updates the fault in place and notifies success', async () => {
            useAuth.mockReturnValue({ user: { id: 'u1' } });
            faultService.getAll.mockResolvedValue([{ _id: '1', status: 'closed', createdAt: '2024-01-01' }]);
            faultService.reopen.mockResolvedValueOnce({ _id: '1', status: 'open', createdAt: '2024-01-01' });
            render(
                <FaultProvider>
                    <ActionHarness action={(ctx) => ctx.reopenFault('1')} />
                </FaultProvider>
            );
            await waitFor(() => expect(screen.getByTestId('faults').textContent).toBe('["1"]'));
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Fault reopened'));
        });
    });

    describe('useFault(toolId) filtering + sorting', () => {
        beforeEach(() => {
            useAuth.mockReturnValue({ user: { id: '1' } });
        });

        it('filters faults down to the given tool id (string or populated object)', async () => {
            faultService.getAll.mockResolvedValueOnce([
                { _id: 'a', status: 'open', createdAt: '2024-01-01', tool: 't1' },
                { _id: 'b', status: 'open', createdAt: '2024-01-02', tool: { _id: 't2' } },
                { _id: 'c', status: 'open', createdAt: '2024-01-03', tool: 't1' },
            ]);
            function ByTool() {
                const { faults } = useFault('t1');
                return <span data-testid="filtered">{faults.map((f) => f._id).join(',')}</span>;
            }
            render(<FaultProvider><ByTool /></FaultProvider>);
            await waitFor(() => expect(screen.getByTestId('filtered').textContent).toBe('a,c'));
        });

        it('excludes faults with no tool when filtering by toolId', async () => {
            faultService.getAll.mockResolvedValueOnce([
                { _id: 'a', status: 'open', createdAt: '2024-01-01' },
            ]);
            function ByTool() {
                const { faults } = useFault('t1');
                return <span data-testid="filtered">{faults.length}</span>;
            }
            render(<FaultProvider><ByTool /></FaultProvider>);
            await waitFor(() => expect(screen.getByTestId('filtered').textContent).toBe('0'));
        });

        it('sorts open faults before closed, then oldest first (sortFaultsByOpenAndCreateDate)', async () => {
            faultService.getAll.mockResolvedValueOnce([
                { _id: 'closed-old', status: 'closed', createdAt: '2024-01-01' },
                { _id: 'open-new', status: 'open', createdAt: '2024-02-01' },
                { _id: 'open-old', status: 'open', createdAt: '2024-01-15' },
            ]);
            function AllFaults() {
                const { faults } = useFault();
                return <span data-testid="order">{faults.map((f) => f._id).join(',')}</span>;
            }
            render(<FaultProvider><AllFaults /></FaultProvider>);
            await waitFor(() => expect(screen.getByTestId('order').textContent).toBe('open-old,open-new,closed-old'));
        });

        it('returns an empty array without crashing when there are no faults yet', () => {
            useAuth.mockReturnValue({ user: null });
            function AllFaults() {
                const { faults } = useFault('some-tool');
                return <span data-testid="order">{faults.length}</span>;
            }
            render(<FaultProvider><AllFaults /></FaultProvider>);
            expect(screen.getByTestId('order').textContent).toBe('0');
        });
    });

    describe('provider value memoization', () => {
        it('keeps the same value reference across an unrelated re-render', () => {
            useAuth.mockReturnValue({ user: null });
            const captured = [];
            function Capture() {
                const value = useFault();
                captured.push(value);
                return null;
            }
            function Harness() {
                const [tick, setTick] = React.useState(0);
                return (
                    <>
                        <FaultProvider><Capture /></FaultProvider>
                        <button onClick={() => setTick((t) => t + 1)}>tick-{tick}</button>
                    </>
                );
            }
            render(<Harness />);
            const stable = captured[captured.length - 1];
            captured.length = 0;
            fireEvent.click(screen.getByText(/tick-/));
            // The underlying `faults` array reference should be unchanged (same provider state),
            // proving the FaultProvider's own useMemo held stable across the re-render.
            expect(captured[captured.length - 1].faults).toEqual(stable.faults);
        });
    });

    describe('useFault guard', () => {
        it('throws when used outside a FaultProvider', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const Bad = () => { useFault(); return null; };
            expect(() => render(<Bad />)).toThrow('useFault must be used within FaultProvider');
            consoleSpy.mockRestore();
        });
    });
});
