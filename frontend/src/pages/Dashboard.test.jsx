// src/pages/Dashboard.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Dashboard from './Dashboard';
import equipmentService from '../services/equipmentService';
import faultService from '../services/faultsService';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { useEquipment } from '../contexts/EquipmentContext';
import { useFault } from '../contexts/FaultContext';
import { ROUTES } from '../constants/routes';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock('../services/equipmentService', () => ({ __esModule: true, default: { getAll: jest.fn() } }));
jest.mock('../services/faultsService', () => ({
    __esModule: true,
    default: { getAll: jest.fn(), create: jest.fn(), close: jest.fn(), reopen: jest.fn(), delete: jest.fn() },
}));

jest.mock('../contexts/AuthContext', () => ({ __esModule: true, useAuth: jest.fn() }));
jest.mock('../contexts/NotificationContext', () => ({ __esModule: true, useNotify: jest.fn() }));
jest.mock('../contexts/EquipmentContext', () => ({ __esModule: true, useEquipment: jest.fn() }));
jest.mock('../contexts/FaultContext', () => ({ __esModule: true, useFault: jest.fn() }));

// recharts' ResponsiveContainer relies on ResizeObserver (not available in
// jsdom) and real layout to size itself — irrelevant to Dashboard's own
// logic, so it's stubbed out entirely.
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="chart">{children}</div>,
    AreaChart: ({ children }) => <div>{children}</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    CartesianGrid: () => null,
    Legend: () => null,
}));

jest.mock('../components/Fault/FaultCard/FaultCard', () => (props) => (
    <div data-testid={`fault-card-${props.fault._id}`}>
        <span>{props.fault.code}</span>
        <button onClick={() => props.onClick(props.fault)}>view-{props.fault._id}</button>
        {props.onCloseFault && <button onClick={() => props.onCloseFault(props.fault)}>close-{props.fault._id}</button>}
        {props.onReopenFault && <button onClick={() => props.onReopenFault(props.fault)}>reopen-{props.fault._id}</button>}
        {props.onDeleteFault && <button onClick={() => props.onDeleteFault(props.fault)}>delete-{props.fault._id}</button>}
    </div>
));

jest.mock('../components/Fault/FaultModal/FaultModal', () => (props) => (
    props.open ? (
        <div data-testid="fault-modal">
            <span>{props.fault?.code}</span>
            <button onClick={props.handleClose}>close-modal</button>
        </div>
    ) : null
));

jest.mock('../components/Fault/CloseFaultDialog/CloseFaultDialog', () => (props) => (
    props.open ? (
        <div data-testid="close-fault-dialog">
            <button onClick={() => props.onConfirm(props.fault, { engineHours: 42 })}>confirm-close</button>
        </div>
    ) : null
));

jest.mock('../components/Fault/CreateFaultDialog/CreateFaultDialog', () => (props) => (
    props.open ? (
        <div data-testid="create-fault-dialog">
            <button onClick={() => props.onSubmit({ description: 'Broken', code: 'F-NEW', tool: 't1' })}>submit-create</button>
            <button onClick={() => props.onSubmit({ description: 'No equipment selected' })}>submit-create-no-tool</button>
        </div>
    ) : null
));

const technician = { id: 'u1', name: 'jane doe', role: 'mechanic' };
const operator = { id: 'u1', name: 'oscar operator', role: 'operator' };

const faults = [
    { _id: 'f1', code: 'F-001', status: 'open', tool: { _id: 't1', name: 'Forklift' }, operator: { _id: 'u1' }, createdAt: new Date().toISOString() },
    { _id: 'f2', code: 'F-002', status: 'closed', tool: { _id: 't2', name: 'Crane' }, operator: { _id: 'u2' }, closedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
];
const equipment = [{ _id: 't1' }, { _id: 't2' }, { _id: 't3' }];

const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };

function setup(user = technician, { faultsData = faults, equipmentData = equipment } = {}) {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user });
    useNotify.mockReturnValue(notify);
    useEquipment.mockReturnValue({ fetchEquipment: jest.fn() });
    useFault.mockReturnValue({ fetchFaults: jest.fn() });
    faultService.getAll.mockResolvedValue(faultsData);
    equipmentService.getAll.mockResolvedValue(equipmentData);
}

describe('Dashboard', () => {
    describe('technician/admin view', () => {
        beforeEach(() => setup(technician));

        it('shows a loading skeleton before data resolves', async () => {
            faultService.getAll.mockReturnValueOnce(new Promise(() => {}));
            render(<Dashboard />);
            expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
        });

        it('renders KPI cards computed from faults + equipment', async () => {
            render(<Dashboard />);
            expect(await screen.findByText('Welcome back, Jane Doe')).toBeInTheDocument();

            const totalCard = screen.getByText('TOTAL REPORTED').closest('.MuiCard-root');
            expect(within(totalCard).getByText('2')).toBeInTheDocument();

            const activeCard = screen.getByText('ACTIVE FAULTS').closest('.MuiCard-root');
            expect(within(activeCard).getByText('1')).toBeInTheDocument();

            const resolvedCard = screen.getByText('RESOLVED').closest('.MuiCard-root');
            expect(within(resolvedCard).getByText('1')).toBeInTheDocument();

            expect(screen.getAllByText('67%').length).toBeGreaterThan(0); // 2 of 3 operational (compact strip + KPI card)
            expect(screen.getByText('2 of 3 machines operational')).toBeInTheDocument();
        });

        it('notifies an error when the data fetch fails', async () => {
            faultService.getAll.mockRejectedValueOnce(new Error('network down'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            render(<Dashboard />);
            await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to refresh dashboard data'));
            consoleSpy.mockRestore();
        });

        it('renders one FaultCard per fault, most recent first, with delete/close/reopen wired', async () => {
            render(<Dashboard />);
            await screen.findByTestId('fault-card-f1');
            expect(screen.getByTestId('fault-card-f2')).toBeInTheDocument();
        });

        describe('filtering', () => {
            it('filters to only open faults', async () => {
                render(<Dashboard />);
                await screen.findByTestId('fault-card-f1');
                fireEvent.click(screen.getByRole('button', { name: /^Open \(1\)$/ }));
                expect(screen.getByTestId('fault-card-f1')).toBeInTheDocument();
                expect(screen.queryByTestId('fault-card-f2')).not.toBeInTheDocument();
            });

            it('filters by search query across code/description/equipment name', async () => {
                render(<Dashboard />);
                await screen.findByTestId('fault-card-f1');
                fireEvent.change(screen.getByPlaceholderText(/search faults/i), { target: { value: 'crane' } });
                expect(screen.queryByTestId('fault-card-f1')).not.toBeInTheDocument();
                expect(screen.getByTestId('fault-card-f2')).toBeInTheDocument();
            });

            it('shows an empty state with a clear-filters action when nothing matches', async () => {
                render(<Dashboard />);
                await screen.findByTestId('fault-card-f1');
                fireEvent.change(screen.getByPlaceholderText(/search faults/i), { target: { value: 'nonexistent-xyz' } });
                expect(screen.getByText('No matching faults found')).toBeInTheDocument();
                fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
                expect(await screen.findByTestId('fault-card-f1')).toBeInTheDocument();
            });
        });

        describe('fault dialogs and handlers', () => {
            it('opens FaultModal on card click and closes it', async () => {
                render(<Dashboard />);
                fireEvent.click(await screen.findByText('view-f1'));
                expect(await screen.findByTestId('fault-modal')).toBeInTheDocument();
                fireEvent.click(screen.getByText('close-modal'));
                await waitFor(() => expect(screen.queryByTestId('fault-modal')).not.toBeInTheDocument());
            });

            it('reports a validation error when creating a fault without an equipment selected', async () => {
                render(<Dashboard />);
                fireEvent.click((await screen.findAllByRole('button', { name: /^Report Fault$/i }))[0]);
                fireEvent.click(await screen.findByText('submit-create-no-tool'));
                await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Please select an equipment to report a fault for'));
                expect(faultService.create).not.toHaveBeenCalled();
            });

            it('creates a fault, notifies success, closes the dialog, and refreshes', async () => {
                faultService.create.mockResolvedValueOnce({});
                render(<Dashboard />);
                fireEvent.click((await screen.findAllByRole('button', { name: /^Report Fault$/i }))[0]);
                faultService.getAll.mockClear();
                fireEvent.click(await screen.findByText('submit-create'));
                await waitFor(() => expect(faultService.create).toHaveBeenCalledWith({
                    description: 'Broken', code: 'F-NEW', tool: 't1', operator: 'u1',
                }));
                await waitFor(() => expect(screen.queryByTestId('create-fault-dialog')).not.toBeInTheDocument());
                await waitFor(() => expect(faultService.getAll).toHaveBeenCalled());
            });

            it('closes a fault via the FaultCard action and refreshes', async () => {
                faultService.close.mockResolvedValueOnce({});
                render(<Dashboard />);
                fireEvent.click(await screen.findByText('close-f1'));
                fireEvent.click(await screen.findByText('confirm-close'));
                await waitFor(() => expect(faultService.close).toHaveBeenCalledWith('f1', { engineHours: 42 }));
                expect(notify.success).toHaveBeenCalledWith('Fault marked as resolved');
            });

            it('reopens a fault via the FaultCard action and refreshes', async () => {
                faultService.reopen.mockResolvedValueOnce({});
                render(<Dashboard />);
                fireEvent.click(await screen.findByText('reopen-f2'));
                await waitFor(() => expect(faultService.reopen).toHaveBeenCalledWith('f2'));
                expect(notify.success).toHaveBeenCalledWith('Fault reopened');
            });

            it('prompts for confirmation before deleting a fault via the FaultCard action, and does not delete until confirmed', async () => {
                faultService.delete.mockResolvedValueOnce({});
                render(<Dashboard />);
                fireEvent.click(await screen.findByText('delete-f1'));

                // Clicking the card's delete action only opens the confirmation dialog --
                // the delete service call must not fire until the user confirms.
                expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();
                expect(faultService.delete).not.toHaveBeenCalled();

                fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
                await waitFor(() => expect(faultService.delete).toHaveBeenCalledWith('f1'));
                expect(notify.success).toHaveBeenCalledWith('Fault deleted');
            });

            it('cancelling the delete confirmation dialog does not delete the fault', async () => {
                render(<Dashboard />);
                fireEvent.click(await screen.findByText('delete-f1'));
                expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();

                fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
                await waitFor(() => expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument());
                expect(faultService.delete).not.toHaveBeenCalled();
            });

            it('surfaces a server-provided error message when closing a fault fails', async () => {
                faultService.close.mockRejectedValueOnce({ response: { data: { message: 'Cannot close' } } });
                render(<Dashboard />);
                fireEvent.click(await screen.findByText('close-f1'));
                fireEvent.click(await screen.findByText('confirm-close'));
                await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Cannot close'));
            });
        });

        it('navigates to the equipment list when Browse Equipment is clicked', async () => {
            render(<Dashboard />);
            fireEvent.click(await screen.findByRole('button', { name: /browse equipment/i }));
            expect(mockNavigate).toHaveBeenCalledWith(ROUTES.EQUIPMENT);
        });
    });

    describe('operator view', () => {
        beforeEach(() => setup(operator));

        it('shows the hero CTA to report a fault instead of KPI cards', async () => {
            render(<Dashboard />);
            expect(await screen.findByText('Need to Report an Issue?')).toBeInTheDocument();
            expect(screen.queryByText('TOTAL REPORTED')).not.toBeInTheDocument();
        });

        it('shows only faults reported by the current operator', async () => {
            render(<Dashboard />);
            expect(await screen.findByTestId('fault-card-f1')).toBeInTheDocument();
            expect(screen.queryByTestId('fault-card-f2')).not.toBeInTheDocument();
        });

        it('navigates to My Reports when View All is clicked', async () => {
            render(<Dashboard />);
            fireEvent.click(await screen.findByText(/View All \(1\)/));
            expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MY_REPORTS);
        });

        it('navigates to manuals and account pages from the quick-access cards', async () => {
            render(<Dashboard />);
            fireEvent.click(await screen.findByRole('button', { name: /browse manuals/i }));
            expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MANUALS);
            fireEvent.click(screen.getByRole('button', { name: /manage account/i }));
            expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ACCOUNT);
        });

        it('shows an empty state when the operator has no faults reported', async () => {
            setup(operator, { faultsData: [] });
            render(<Dashboard />);
            expect(await screen.findByText('No faults reported')).toBeInTheDocument();
        });
    });
});
