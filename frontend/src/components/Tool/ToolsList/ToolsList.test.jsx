// src/components/Tool/ToolsList/ToolsList.test.jsx
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToolsList from './ToolsList';
import { equipmentDetailRoute } from '../../../constants/routes';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const tools = [
    {
        _id: 't1', name: 'Forklift', model: 'FL-3000', serialNumber: 'SN-1',
        localSerialNumber: 'UNIT-1', currentEngineHours: 200,
        maintenanceSchedule: [{ id: 's1' }], books: [{ id: 'b1' }],
    },
    { _id: 't2', name: 'Crane', serialNumber: 'SN-2' },
];

function renderList(props = {}) {
    return render(
        <MemoryRouter>
            <ToolsList tools={tools} {...props} />
        </MemoryRouter>
    );
}

describe('ToolsList', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders an empty state when there is no equipment', () => {
        render(<MemoryRouter><ToolsList tools={[]} /></MemoryRouter>);
        expect(screen.getByText('No equipment found')).toBeInTheDocument();
    });

    describe('grid view (default)', () => {
        it('renders a card per tool with name, model, serial, and hours', () => {
            renderList();
            expect(screen.getByText('Forklift')).toBeInTheDocument();
            expect(screen.getByText('Model: FL-3000')).toBeInTheDocument();
            expect(screen.getByText('S/N: SN-1')).toBeInTheDocument();
            expect(screen.getByText('200 hrs')).toBeInTheDocument();
            expect(screen.getByText('Crane')).toBeInTheDocument();
        });

        it('shows a Ready badge with no open faults, and a Fault badge when there are open faults', () => {
            renderList({ openFaultsByTool: { t1: 2 } });
            expect(screen.getByText('2 Faults')).toBeInTheDocument();
            expect(screen.getByText('Ready')).toBeInTheDocument(); // t2 has none
        });

        it('shows schedule and book counts', () => {
            renderList();
            expect(screen.getByTitle('1 Maintenance Schedules')).toBeInTheDocument();
            expect(screen.getByTitle('1 Manuals')).toBeInTheDocument();
        });

        it('navigates to the equipment detail route when a card is clicked', () => {
            renderList();
            fireEvent.click(screen.getByText('Forklift'));
            expect(mockNavigate).toHaveBeenCalledWith(equipmentDetailRoute('t1'));
        });

        it('navigates when the Manage button is clicked', () => {
            renderList();
            fireEvent.click(screen.getAllByRole('button', { name: /manage/i })[0]);
            expect(mockNavigate).toHaveBeenCalledWith(equipmentDetailRoute('t1'));
        });
    });

    describe('table view', () => {
        it('renders one row per tool with the right columns', () => {
            renderList({ viewMode: 'table' });
            const table = screen.getByRole('table');
            expect(within(table).getByText('Forklift')).toBeInTheDocument();
            expect(within(table).getByText('FL-3000')).toBeInTheDocument();
            expect(within(table).getByText('SN-1')).toBeInTheDocument();
            expect(within(table).getByText('200 hrs')).toBeInTheDocument();
            expect(within(table).getByText('UNIT-1')).toBeInTheDocument();
        });

        it('shows an em dash for tools missing optional fields', () => {
            renderList({ viewMode: 'table' });
            const table = screen.getByRole('table');
            const craneRow = within(table).getByText('Crane').closest('tr');
            expect(within(craneRow).getAllByText('—').length).toBeGreaterThan(0);
        });

        it('navigates when the row Details button is clicked', () => {
            renderList({ viewMode: 'table' });
            const table = screen.getByRole('table');
            fireEvent.click(within(table).getAllByRole('button', { name: /details/i })[0]);
            expect(mockNavigate).toHaveBeenCalledWith(equipmentDetailRoute('t1'));
        });
    });
});
