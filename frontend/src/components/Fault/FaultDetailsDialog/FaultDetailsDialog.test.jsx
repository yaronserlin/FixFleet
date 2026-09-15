// src/components/Fault/FaultDetailsDialog/FaultDetailsDialog.test.jsx
//
// Regression coverage: an earlier session's testing pass had added a
// Delete button here (wired to `onDeleteFault`). Product direction is that
// deleting a fault should only be available from the fault cards
// (FaultCard/FaultList), not from this dialog. These tests pin down that
// the Delete button never renders here, regardless of role or whether
// `onDeleteFault` is supplied, while `onDeleteFault` itself may still be
// accepted as a prop (harmless if unused).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FaultDetailsDialog from './FaultDetailsDialog';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext');

const baseFault = {
    _id: 'f1',
    code: 'F-001',
    description: 'Hydraulic leak',
    status: 'open',
    engineHours: 120,
    operator: { name: 'jane doe' },
    createdAt: '2024-01-01T00:00:00.000Z',
};

function setup(overrides = {}, role = 'mechanic') {
    useAuth.mockReturnValue({ user: role ? { role } : null });
    const props = {
        open: true,
        onClose: jest.fn(),
        fault: baseFault,
        onDeleteFault: jest.fn(),
        onCloseFault: jest.fn(),
        onReopenFault: jest.fn(),
        ...overrides,
    };
    render(<FaultDetailsDialog {...props} />);
    return props;
}

describe('FaultDetailsDialog', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders core fault details', () => {
        setup();
        expect(screen.getByText('Fault Details')).toBeInTheDocument();
        expect(screen.getByText('F-001')).toBeInTheDocument();
        expect(screen.getByText('Hydraulic leak')).toBeInTheDocument();
        expect(screen.getByText('120 hrs')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    describe('Delete button removed from this dialog (delete only lives on FaultCard/FaultList)', () => {
        it('never shows Delete for a mechanic, even when onDeleteFault is provided', () => {
            setup({}, 'mechanic');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('never shows Delete for an admin, even when onDeleteFault is provided', () => {
            setup({}, 'admin');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('never shows Delete for an operator', () => {
            setup({}, 'operator');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('never shows Delete when there is no logged-in user', () => {
            setup({}, null);
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('never shows Delete when onDeleteFault is not supplied', () => {
            setup({ onDeleteFault: undefined }, 'mechanic');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });
    });

    describe('Resolve / Reopen gating', () => {
        it('shows Resolve for an open fault when canManage and onCloseFault are set', () => {
            setup({ fault: { ...baseFault, status: 'open' } }, 'mechanic');
            expect(screen.getByRole('button', { name: /resolve fault/i })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /reopen fault/i })).not.toBeInTheDocument();
        });

        it('shows Reopen for a closed fault when canManage and onReopenFault are set', () => {
            setup({ fault: { ...baseFault, status: 'closed', closedAt: '2024-02-01T00:00:00.000Z' } }, 'mechanic');
            expect(screen.getByRole('button', { name: /reopen fault/i })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /resolve fault/i })).not.toBeInTheDocument();
        });

        it('hides both actions for an operator', () => {
            setup({}, 'operator');
            expect(screen.queryByRole('button', { name: /resolve fault/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /reopen fault/i })).not.toBeInTheDocument();
        });

        it('clicking Resolve closes the dialog and fires onCloseFault', () => {
            const props = setup({ fault: { ...baseFault, status: 'open' } }, 'mechanic');
            fireEvent.click(screen.getByRole('button', { name: /resolve fault/i }));
            expect(props.onClose).toHaveBeenCalledTimes(1);
            expect(props.onCloseFault).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }));
        });
    });

    it('calls onClose when Dismiss is clicked', () => {
        const props = setup();
        fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the close icon is clicked', () => {
        const props = setup();
        fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('renders resolution notes and resolvedBy for a closed fault', () => {
        setup({
            fault: {
                ...baseFault,
                status: 'closed',
                closedAt: '2024-02-01T00:00:00.000Z',
                resolvedBy: { name: 'bob mechanic' },
                resolutionDescription: 'Replaced hose',
            },
        }, 'mechanic');
        expect(screen.getByText('Bob Mechanic')).toBeInTheDocument();
        expect(screen.getByText('Replaced hose')).toBeInTheDocument();
    });
});
