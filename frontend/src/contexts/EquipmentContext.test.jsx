// src/contexts/EquipmentContext.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
    EquipmentProvider,
    useEquipment,
    ToolProvider,
    useTool,
} from './EquipmentContext';
import equipmentService from '../services/equipmentService';
import { useNotify } from './NotificationContext';
import { useAuth } from './AuthContext';

jest.mock('../services/equipmentService', () => ({
    __esModule: true,
    default: {
        getAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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

function ActionHarness({ action }) {
    const ctx = useEquipment();
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
            <span data-testid="equipment">{JSON.stringify(ctx.equipment.map((e) => e._id))}</span>
        </div>
    );
}

describe('EquipmentContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useNotify.mockReturnValue(notify);
    });

    describe('auto-fetch on mount', () => {
        it('does not fetch when there is no logged-in user', () => {
            useAuth.mockReturnValue({ user: null });
            render(<EquipmentProvider><ActionHarness action={() => {}} /></EquipmentProvider>);
            expect(equipmentService.getAll).not.toHaveBeenCalled();
            expect(screen.getByTestId('equipment').textContent).toBe('[]');
        });

        it('does not fetch while the user must still change their password', () => {
            useAuth.mockReturnValue({ user: { id: '1', mustChangePassword: true } });
            render(<EquipmentProvider><ActionHarness action={() => {}} /></EquipmentProvider>);
            expect(equipmentService.getAll).not.toHaveBeenCalled();
        });

        it('fetches equipment for a logged-in user and unwraps an array response', async () => {
            useAuth.mockReturnValue({ user: { id: '1' } });
            equipmentService.getAll.mockResolvedValueOnce([{ _id: 'a', name: 'A' }, { _id: 'b', name: 'B' }]);
            render(<EquipmentProvider><ActionHarness action={() => {}} /></EquipmentProvider>);
            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
            expect(screen.getByTestId('equipment').textContent).toBe('["a","b"]');
        });

        it('unwraps a { tools } response shape', async () => {
            useAuth.mockReturnValue({ user: { id: '1' } });
            equipmentService.getAll.mockResolvedValueOnce({ tools: [{ _id: 'c', name: 'C' }] });
            render(<EquipmentProvider><ActionHarness action={() => {}} /></EquipmentProvider>);
            await waitFor(() => expect(screen.getByTestId('equipment').textContent).toBe('["c"]'));
        });

        it('notifies and sets an error when the fetch fails', async () => {
            useAuth.mockReturnValue({ user: { id: '1' } });
            equipmentService.getAll.mockRejectedValueOnce({ response: { status: 404 } });
            render(<EquipmentProvider><ActionHarness action={() => {}} /></EquipmentProvider>);
            await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to load equipment'));
        });
    });

    describe('mutations', () => {
        beforeEach(() => {
            useAuth.mockReturnValue({ user: null }); // skip the auto-fetch-on-mount effect
        });

        it('createEquipment prepends the new item and notifies success', async () => {
            equipmentService.create.mockResolvedValueOnce({ _id: 'new', name: 'New Item' });
            render(
                <EquipmentProvider>
                    <ActionHarness action={(ctx) => ctx.createEquipment({ name: 'Drill' })} />
                </EquipmentProvider>
            );
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('equipment').textContent).toBe('["new"]'));
            expect(notify.success).toHaveBeenCalledWith('Equipment created successfully');
        });

        it('createEquipment notifies and rethrows on failure', async () => {
            // A 404-shaped error short-circuits the retry() helper's backoff
            // cascade (see src/utils/index.js) so the mock only needs to
            // reject once instead of every retry attempt.
            const boom = Object.assign(new Error('boom'), { response: { status: 404 } });
            equipmentService.create.mockRejectedValueOnce(boom);
            render(
                <EquipmentProvider>
                    <ActionHarness action={(ctx) => ctx.createEquipment({ name: 'Drill' })} />
                </EquipmentProvider>
            );
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to create equipment'));
            expect(screen.getByTestId('error').textContent).toBe('boom');
        });

        it('updateEquipment replaces the matching item in place', async () => {
            equipmentService.getAll.mockResolvedValue([{ _id: '1', name: 'Old' }]);
            equipmentService.update.mockResolvedValueOnce({ _id: '1', name: 'New' });
            useAuth.mockReturnValue({ user: { id: 'u1' } });
            render(
                <EquipmentProvider>
                    <ActionHarness action={(ctx) => ctx.updateEquipment('1', { name: 'New' })} />
                </EquipmentProvider>
            );
            await waitFor(() => expect(screen.getByTestId('equipment').textContent).toBe('["1"]'));
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Equipment updated successfully'));
        });

        it('deleteEquipment removes the item and notifies success', async () => {
            equipmentService.getAll.mockResolvedValue([{ _id: '1', name: 'One' }, { _id: '2', name: 'Two' }]);
            equipmentService.delete.mockResolvedValueOnce(undefined);
            useAuth.mockReturnValue({ user: { id: 'u1' } });
            render(
                <EquipmentProvider>
                    <ActionHarness action={(ctx) => ctx.deleteEquipment('1')} />
                </EquipmentProvider>
            );
            await waitFor(() => expect(screen.getByTestId('equipment').textContent).toBe('["1","2"]'));
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('equipment').textContent).toBe('["2"]'));
            expect(notify.success).toHaveBeenCalledWith('Equipment deleted');
        });
    });

    describe('useEquipment sorting + backward-compatible aliases', () => {
        it('sorts equipment by local serial number (via sortToolsByLocalSerial) for consumers', async () => {
            useAuth.mockReturnValue({ user: { id: '1' } });
            equipmentService.getAll.mockResolvedValueOnce([
                { _id: '1', name: 'B', localSerialNumber: '20' },
                { _id: '2', name: 'A', localSerialNumber: '10' },
            ]);
            function Sorted() {
                const { equipment } = useEquipment();
                return <span data-testid="order">{equipment.map((e) => e._id).join(',')}</span>;
            }
            render(<EquipmentProvider><Sorted /></EquipmentProvider>);
            await waitFor(() => expect(screen.getByTestId('order').textContent).toBe('2,1'));
        });

        it('exposes tools/createTool/updateTool/deleteTool as aliases of the equipment methods', () => {
            useAuth.mockReturnValue({ user: null });
            function AliasCheck() {
                const ctx = useEquipment();
                return (
                    <span data-testid="aliases">
                        {String(ctx.tools === ctx.equipment)}-
                        {String(ctx.createTool === ctx.createEquipment)}-
                        {String(ctx.updateTool === ctx.updateEquipment)}-
                        {String(ctx.deleteTool === ctx.deleteEquipment)}
                    </span>
                );
            }
            render(<EquipmentProvider><AliasCheck /></EquipmentProvider>);
            expect(screen.getByTestId('aliases').textContent).toBe('true-true-true-true');
        });

        it('ToolProvider/useTool are the same implementation as EquipmentProvider/useEquipment', () => {
            expect(ToolProvider).toBe(EquipmentProvider);
            expect(useTool).toBe(useEquipment);
        });
    });

    describe('provider value memoization', () => {
        it('keeps the same value reference across an unrelated re-render', async () => {
            useAuth.mockReturnValue({ user: null });
            const captured = [];
            function Capture() {
                const value = useEquipment();
                captured.push(value);
                return null;
            }
            function Harness() {
                const [tick, setTick] = React.useState(0);
                return (
                    <>
                        <EquipmentProvider><Capture /></EquipmentProvider>
                        <button onClick={() => setTick((t) => t + 1)}>tick-{tick}</button>
                    </>
                );
            }
            render(<Harness />);
            const stable = captured[captured.length - 1];
            captured.length = 0;
            fireEvent.click(screen.getByText(/tick-/));
            expect(captured[captured.length - 1].equipment).toEqual(stable.equipment);
        });
    });

    describe('useEquipment guard', () => {
        it('throws when used outside an EquipmentProvider', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const Bad = () => { useEquipment(); return null; };
            expect(() => render(<Bad />)).toThrow('useEquipment must be used within an EquipmentProvider');
            consoleSpy.mockRestore();
        });
    });
});
