// src/components/Fault/FaultList/FaultList.test.jsx
//
// FaultList renders BOTH a mobile card layout and a desktop table layout
// simultaneously (visibility is controlled purely by CSS breakpoints, which
// jsdom does not evaluate), so most assertions here scope into the desktop
// <table> with `within` to avoid ambiguous duplicate-text matches.
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FaultList from './FaultList';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext');

const faults = [
    { _id: 'f1', code: 'F-001', status: 'open', description: 'Hydraulic leak', engineHours: 50, createdAt: '2024-01-01T00:00:00.000Z' },
    { _id: 'f2', code: 'F-002', status: 'closed', description: 'Belt worn', closingEngineHours: 80, createdAt: '2024-01-02T00:00:00.000Z' },
];

function setup(props = {}, role = 'mechanic') {
    useAuth.mockReturnValue({ user: role ? { role } : null });
    const handlers = {
        onFaultClick: jest.fn(),
        onCloseFault: jest.fn(),
        onReopenFault: jest.fn(),
        onDeleteFault: jest.fn(),
        ...props,
    };
    render(<FaultList faults={faults} {...handlers} />);
    return handlers;
}

describe('FaultList', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders an empty-state message when there are no faults', () => {
        useAuth.mockReturnValue({ user: { role: 'mechanic' } });
        render(<FaultList faults={[]} />);
        expect(screen.getByText(/No faults recorded for this equipment\./i)).toBeInTheDocument();
    });

    it('renders an empty-state message when faults is undefined', () => {
        useAuth.mockReturnValue({ user: { role: 'mechanic' } });
        render(<FaultList />);
        expect(screen.getByText(/No faults recorded for this equipment\./i)).toBeInTheDocument();
    });

    it('renders one table row per fault with status/code/hours', () => {
        setup();
        const table = screen.getByRole('table');
        // Data rows carry an explicit role="button" (for click/keyboard access),
        // which overrides their implicit "row" role — so only the header row
        // still reports as role="row".
        expect(within(table).getAllByRole('row')).toHaveLength(1);
        expect(within(table).getAllByRole('button', { name: /View fault/i })).toHaveLength(2);
        expect(within(table).getByText('F-001')).toBeInTheDocument();
        expect(within(table).getByText('F-002')).toBeInTheDocument();
        expect(within(table).getByText('50 hrs')).toBeInTheDocument();
        expect(within(table).getByText('80 hrs')).toBeInTheDocument();
    });

    it('shows the Actions column for a mechanic/admin', () => {
        setup({}, 'mechanic');
        const table = screen.getByRole('table');
        expect(within(table).getByText('Actions')).toBeInTheDocument();
    });

    it('hides the Actions column for an operator', () => {
        setup({}, 'operator');
        const table = screen.getByRole('table');
        expect(within(table).queryByText('Actions')).not.toBeInTheDocument();
        expect(within(table).queryByRole('button', { name: /resolve/i })).not.toBeInTheDocument();
    });

    it('clicking a row fires onFaultClick with that fault', () => {
        const handlers = setup();
        fireEvent.click(screen.getByRole('button', { name: /View fault F-001/i }));
        expect(handlers.onFaultClick).toHaveBeenCalledWith(faults[0]);
    });

    it('pressing Enter on a focused row fires onFaultClick', () => {
        const handlers = setup();
        fireEvent.keyDown(screen.getByRole('button', { name: /View fault F-001/i }), { key: 'Enter' });
        expect(handlers.onFaultClick).toHaveBeenCalledWith(faults[0]);
    });

    it('Resolve in the table row calls onCloseFault without also firing onFaultClick', () => {
        const handlers = setup();
        const table = screen.getByRole('table');
        fireEvent.click(within(table).getByRole('button', { name: /^resolve$/i }));
        expect(handlers.onCloseFault).toHaveBeenCalledWith(faults[0]);
        expect(handlers.onFaultClick).not.toHaveBeenCalled();
    });

    it('Reopen in the table row calls onReopenFault without also firing onFaultClick', () => {
        const handlers = setup();
        const table = screen.getByRole('table');
        fireEvent.click(within(table).getByRole('button', { name: /^reopen$/i }));
        expect(handlers.onReopenFault).toHaveBeenCalledWith(faults[1]);
        expect(handlers.onFaultClick).not.toHaveBeenCalled();
    });

    it('Delete in the table row calls onDeleteFault, and is omitted when the prop is absent', () => {
        const handlers = setup();
        const table = screen.getByRole('table');
        const deleteButtons = within(table).getAllByRole('button', { name: /delete/i });
        fireEvent.click(deleteButtons[0]);
        expect(handlers.onDeleteFault).toHaveBeenCalledWith(faults[0]);

        useAuth.mockReturnValue({ user: { role: 'mechanic' } });
        const { container } = render(<FaultList faults={faults} onFaultClick={jest.fn()} />);
        const table2 = within(container).getByRole('table');
        expect(within(table2).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
});
