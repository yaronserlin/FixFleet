// src/components/Fault/FaultDetailsDialog/FaultDetailsDialog.test.jsx
//
// Regression coverage for a real bug fixed this session: the `onDeleteFault`
// prop used to be silently dropped by this component (no Delete button was
// ever wired to it). It is now gated behind `canManage && onDeleteFault`,
// same as the Resolve/Reopen actions. These tests pin that gating down.
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

    describe('Delete button gating (regression: onDeleteFault used to be dropped)', () => {
        it('shows Delete for a mechanic when onDeleteFault is provided', () => {
            setup({}, 'mechanic');
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('shows Delete for an admin when onDeleteFault is provided', () => {
            setup({}, 'admin');
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('hides Delete for an operator even when onDeleteFault is provided', () => {
            setup({}, 'operator');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('hides Delete when there is no logged-in user', () => {
            setup({}, null);
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('hides Delete when onDeleteFault is not supplied, even for a mechanic', () => {
            setup({ onDeleteFault: undefined }, 'mechanic');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('closes the dialog and fires onDeleteFault with the fault when clicked', () => {
            const props = setup({}, 'mechanic');
            fireEvent.click(screen.getByRole('button', { name: /delete/i }));
            expect(props.onClose).toHaveBeenCalledTimes(1);
            expect(props.onDeleteFault).toHaveBeenCalledWith(baseFault);
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
