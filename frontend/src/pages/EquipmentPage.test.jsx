// src/pages/EquipmentPage.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EquipmentPage from './EquipmentPage';
import equipmentService from '../services/equipmentService';
import { useEquipment } from '../contexts/EquipmentContext';
import { useFault } from '../contexts/FaultContext';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../constants/routes';

const mockNavigate = jest.fn();
let mockLocation = { key: 'default', search: '', state: undefined };
let mockSearchParams = new URLSearchParams('');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ id: 't1' }),
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useSearchParams: () => [mockSearchParams],
}));

jest.mock('../services/equipmentService', () => ({
    __esModule: true,
    default: { getById: jest.fn() },
}));

jest.mock('../contexts/EquipmentContext', () => ({ __esModule: true, useEquipment: jest.fn() }));
jest.mock('../contexts/FaultContext', () => ({ __esModule: true, useFault: jest.fn() }));
jest.mock('../contexts/AuthContext', () => ({ __esModule: true, useAuth: jest.fn() }));

jest.mock('../components/Fault/FaultList/FaultList', () => (props) => (
    <div data-testid="fault-list">
        <span data-testid="fault-count">{props.faults?.length ?? 0}</span>
        {props.faults?.[0] && (
            <>
                <button onClick={() => props.onFaultClick(props.faults[0])}>click-fault</button>
                <button onClick={() => props.onCloseFault(props.faults[0])}>open-close-dialog</button>
                <button onClick={() => props.onReopenFault(props.faults[0])}>reopen-fault</button>
                <button onClick={() => props.onDeleteFault(props.faults[0])}>delete-prompt</button>
            </>
        )}
    </div>
));

jest.mock('../components/Fault/FaultDetailsDialog/FaultDetailsDialog', () => (props) => (
    props.open ? (
        <div data-testid="fault-details-dialog">
            <span data-testid="detail-fault-code">{props.fault?.code}</span>
            <button onClick={props.onClose}>close-details</button>
        </div>
    ) : null
));

jest.mock('../components/Fault/CreateFaultDialog/CreateFaultDialog', () => (props) => (
    props.open ? (
        <div data-testid="create-fault-dialog">
            <span data-testid="create-equipment-id">{props.equipmentId}</span>
            <button onClick={() => props.onSubmit({ description: 'Broken', code: 'F-100' })}>submit-create</button>
            <button onClick={props.onClose}>close-create</button>
        </div>
    ) : null
));

jest.mock('../components/Fault/CloseFaultDialog/CloseFaultDialog', () => (props) => (
    props.open ? (
        <div data-testid="close-fault-dialog">
            <button onClick={() => props.onConfirm(props.fault, { engineHours: 50 })}>confirm-close</button>
            <button onClick={props.onClose}>cancel-close</button>
        </div>
    ) : null
));

jest.mock('../components/Tool/EquipmentMaintenanceTab/EquipmentMaintenanceTab', () => () => <div data-testid="maintenance-tab" />);
jest.mock('../components/Tool/EquipmentBooksTab/EquipmentBooksTab', () => () => <div data-testid="books-tab" />);

jest.mock('../components/ConfirmDialog/ConfirmDialog', () => (props) => (
    props.open ? (
        <div data-testid="confirm-dialog">
            <button onClick={props.onConfirm}>confirm-delete</button>
            <button onClick={props.onCancel}>cancel-delete</button>
        </div>
    ) : null
));

const tool = {
    _id: 't1', name: 'Forklift', model: 'FL-3000', serialNumber: 'SN-1',
    currentEngineHours: 10, books: [{ id: 'b1' }], maintenanceSchedule: [{ id: 's1' }],
};
const openFault = { _id: 'f1', code: 'F-001', status: 'open', description: 'Leak', createdAt: '2024-01-01T00:00:00.000Z' };

function mockEquipmentCtx(overrides = {}) {
    useEquipment.mockReturnValue({
        equipment: [tool],
        loading: false,
        error: null,
        fetchEquipment: jest.fn(),
        ...overrides,
    });
}

function mockFaultCtx(overrides = {}) {
    useFault.mockReturnValue({
        faults: [openFault],
        error: null,
        fetchFaults: jest.fn(),
        createFault: jest.fn().mockResolvedValue({}),
        deleteFault: jest.fn().mockResolvedValue({}),
        closeFault: jest.fn().mockResolvedValue({}),
        reopenFault: jest.fn().mockResolvedValue({}),
        ...overrides,
    });
}

describe('EquipmentPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocation = { key: 'default', search: '', state: undefined };
        mockSearchParams = new URLSearchParams('');
        equipmentService.getById.mockResolvedValue(tool);
        useAuth.mockReturnValue({ user: { id: 'u1' } });
        mockEquipmentCtx();
        mockFaultCtx();
    });

    it('shows a loading state and nothing else while equipment is loading', async () => {
        mockEquipmentCtx({ loading: true });
        render(<EquipmentPage />);
        expect(screen.queryByTestId('fault-list')).not.toBeInTheDocument();
        // The page's own equipment-detail fetch effect still fires on mount
        // regardless of the context's loading flag; wait for it to settle so
        // it doesn't leak an unwrapped state update into the next test.
        await waitFor(() => expect(equipmentService.getById).toHaveBeenCalled());
    });

    it('shows an error state when the fault or equipment context reports an error', async () => {
        mockFaultCtx({ error: 'Failed to load faults' });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        render(<EquipmentPage />);
        expect(screen.getByText('Failed to load faults')).toBeInTheDocument();
        await waitFor(() => expect(equipmentService.getById).toHaveBeenCalled());
        consoleSpy.mockRestore();
    });

    it('shows "No equipment found." when the tool cannot be resolved', async () => {
        mockEquipmentCtx({ equipment: [] });
        equipmentService.getById.mockRejectedValueOnce(new Error('not found'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        render(<EquipmentPage />);
        expect(await screen.findByText('No equipment found.')).toBeInTheDocument();
        consoleSpy.mockRestore();
    });

    it('renders the equipment header banner with name, model, serial, and hours', async () => {
        render(<EquipmentPage />);
        expect(await screen.findByText('Forklift')).toBeInTheDocument();
        expect(screen.getByText(/FL-3000/)).toBeInTheDocument();
        expect(screen.getByText(/SN-1/)).toBeInTheDocument();
        expect(screen.getByText('10 Operating Hours')).toBeInTheDocument();
        expect(screen.getByText('1 Active Fault')).toBeInTheDocument();
    });

    it('shows "Operational" when there are no open faults', async () => {
        mockFaultCtx({ faults: [{ ...openFault, status: 'closed' }] });
        render(<EquipmentPage />);
        expect(await screen.findByText('Operational')).toBeInTheDocument();
    });

    describe('tabs', () => {
        it('defaults to the Faults tab', async () => {
            render(<EquipmentPage />);
            expect(await screen.findByTestId('fault-list')).toBeInTheDocument();
            expect(screen.queryByTestId('maintenance-tab')).not.toBeInTheDocument();
        });

        it('switches to Maintenance and Books tabs on click', async () => {
            render(<EquipmentPage />);
            await screen.findByTestId('fault-list');

            fireEvent.click(screen.getByRole('tab', { name: /maintenance/i }));
            expect(screen.getByTestId('maintenance-tab')).toBeInTheDocument();
            expect(screen.queryByTestId('fault-list')).not.toBeInTheDocument();

            fireEvent.click(screen.getByRole('tab', { name: /manuals & books/i }));
            expect(screen.getByTestId('books-tab')).toBeInTheDocument();
        });

        it('honors a `tab=maintenance` search param on initial load', async () => {
            mockSearchParams = new URLSearchParams('tab=maintenance');
            render(<EquipmentPage />);
            expect(await screen.findByTestId('maintenance-tab')).toBeInTheDocument();
        });

        it('honors location.state.tab, taking priority over the search param', async () => {
            mockSearchParams = new URLSearchParams('tab=maintenance');
            mockLocation = { key: 'x', search: '?tab=maintenance', state: { tab: 2 } };
            render(<EquipmentPage />);
            expect(await screen.findByTestId('books-tab')).toBeInTheDocument();
        });
    });

    it('navigates back to the equipment list when Back is clicked', async () => {
        render(<EquipmentPage />);
        await screen.findByText('Forklift');
        fireEvent.click(screen.getByRole('button', { name: /back to fleet directory/i }));
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.EQUIPMENT);
    });

    describe('fault creation', () => {
        it('opens CreateFaultDialog, submits, and refreshes on success', async () => {
            const createFault = jest.fn().mockResolvedValue({});
            mockFaultCtx({ createFault });
            render(<EquipmentPage />);
            await screen.findByTestId('fault-list');

            fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
            expect(await screen.findByTestId('create-fault-dialog')).toBeInTheDocument();
            expect(screen.getByTestId('create-equipment-id').textContent).toBe('t1');

            equipmentService.getById.mockClear();
            fireEvent.click(screen.getByText('submit-create'));

            await waitFor(() => expect(createFault).toHaveBeenCalledWith({
                description: 'Broken', code: 'F-100', tool: 't1', operator: 'u1',
            }));
            await waitFor(() => expect(screen.queryByTestId('create-fault-dialog')).not.toBeInTheDocument());
            await waitFor(() => expect(equipmentService.getById).toHaveBeenCalled());
        });
    });

    describe('fault detail / delete / close / reopen flows', () => {
        it('opens the fault details dialog with the clicked fault', async () => {
            render(<EquipmentPage />);
            await screen.findByTestId('fault-list');
            fireEvent.click(screen.getByText('click-fault'));
            expect(await screen.findByTestId('fault-details-dialog')).toBeInTheDocument();
            expect(screen.getByTestId('detail-fault-code').textContent).toBe('F-001');
        });

        it('prompts, confirms, and deletes a fault, then refreshes', async () => {
            const deleteFault = jest.fn().mockResolvedValue({});
            mockFaultCtx({ deleteFault });
            render(<EquipmentPage />);
            await screen.findByTestId('fault-list');

            fireEvent.click(screen.getByText('delete-prompt'));
            expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument();

            fireEvent.click(screen.getByText('confirm-delete'));
            await waitFor(() => expect(deleteFault).toHaveBeenCalledWith('f1'));
            await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
        });

        it('cancels the delete prompt without calling deleteFault', async () => {
            const deleteFault = jest.fn();
            mockFaultCtx({ deleteFault });
            render(<EquipmentPage />);
            await screen.findByTestId('fault-list');
            fireEvent.click(screen.getByText('delete-prompt'));
            fireEvent.click(await screen.findByText('cancel-delete'));
            expect(deleteFault).not.toHaveBeenCalled();
            expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
        });

        it('opens the close dialog and confirms with the parsed payload', async () => {
            const closeFault = jest.fn().mockResolvedValue({});
            mockFaultCtx({ closeFault });
            render(<EquipmentPage />);
            await screen.findByTestId('fault-list');

            fireEvent.click(screen.getByText('open-close-dialog'));
            expect(await screen.findByTestId('close-fault-dialog')).toBeInTheDocument();

            fireEvent.click(screen.getByText('confirm-close'));
            await waitFor(() => expect(closeFault).toHaveBeenCalledWith('f1', { engineHours: 50 }));
            await waitFor(() => expect(screen.queryByTestId('close-fault-dialog')).not.toBeInTheDocument());
        });

        it('reopens a fault and refreshes', async () => {
            const reopenFault = jest.fn().mockResolvedValue({});
            mockFaultCtx({ reopenFault });
            render(<EquipmentPage />);
            await screen.findByTestId('fault-list');
            fireEvent.click(screen.getByText('reopen-fault'));
            await waitFor(() => expect(reopenFault).toHaveBeenCalledWith('f1'));
        });
    });
});
