// src/components/Fault/FaultModal/FaultModal.test.jsx
//
// Regression coverage for a real bug fixed this session: `onDeleteFault`
// used to be silently dropped by this component. It is now gated behind
// `canManage && onDeleteFault`, same as the Resolve/Reopen actions.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FaultModal from './FaultModal';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext');

const baseFault = {
    _id: 'f1',
    code: 'F-001',
    tool: { name: 'Forklift' },
    description: 'Hydraulic leak',
    status: 'open',
    engineHours: 120,
    createdAt: '2024-01-01T00:00:00.000Z',
};

function setup(overrides = {}, role = 'mechanic') {
    useAuth.mockReturnValue({ user: role ? { role } : null });
    const props = {
        open: true,
        handleClose: jest.fn(),
        fault: baseFault,
        onDeleteFault: jest.fn(),
        onCloseFault: jest.fn(),
        onReopenFault: jest.fn(),
        ...overrides,
    };
    render(<FaultModal {...props} />);
    return props;
}

describe('FaultModal', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders nothing when there is no fault', () => {
        useAuth.mockReturnValue({ user: { role: 'mechanic' } });
        const { container } = render(
            <FaultModal open handleClose={jest.fn()} fault={null} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders core fault details', () => {
        setup();
        expect(screen.getByText(/Forklift/)).toBeInTheDocument();
        expect(screen.getByText(/F-001/)).toBeInTheDocument();
        expect(screen.getByText('Hydraulic leak')).toBeInTheDocument();
        expect(screen.getByText('Reported Hours: 120 hrs')).toBeInTheDocument();
    });

    describe('Delete button gating (regression: onDeleteFault used to be dropped)', () => {
        it('shows Delete for a mechanic/admin when onDeleteFault is provided', () => {
            setup({}, 'mechanic');
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('hides Delete for an operator', () => {
            setup({}, 'operator');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('hides Delete when there is no logged-in user', () => {
            setup({}, null);
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('hides Delete when onDeleteFault is not supplied', () => {
            setup({ onDeleteFault: undefined }, 'mechanic');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('fires onDeleteFault with the fault and then closes when clicked', () => {
            const props = setup({}, 'admin');
            fireEvent.click(screen.getByRole('button', { name: /delete/i }));
            expect(props.onDeleteFault).toHaveBeenCalledWith(baseFault);
            expect(props.handleClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Resolve / Reopen gating', () => {
        it('shows Resolve for a non-closed fault when canManage and onCloseFault are set', () => {
            setup({ fault: { ...baseFault, status: 'open' } }, 'mechanic');
            expect(screen.getByRole('button', { name: /resolve fault/i })).toBeInTheDocument();
        });

        it('shows Reopen for a closed fault when canManage and onReopenFault are set', () => {
            setup({ fault: { ...baseFault, status: 'closed' } }, 'mechanic');
            expect(screen.getByRole('button', { name: /reopen fault/i })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /resolve fault/i })).not.toBeInTheDocument();
        });

        it('hides both for an operator', () => {
            setup({}, 'operator');
            expect(screen.queryByRole('button', { name: /resolve fault/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /reopen fault/i })).not.toBeInTheDocument();
        });
    });

    it('calls handleClose when Dismiss is clicked', () => {
        const props = setup();
        fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
        expect(props.handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders resolution notes when present', () => {
        setup({
            fault: {
                ...baseFault,
                status: 'closed',
                resolutionDescription: 'Replaced hose',
                resolvedBy: { name: 'bob mechanic' },
            },
        });
        expect(screen.getByText('Replaced hose')).toBeInTheDocument();
        expect(screen.getByText(/Bob Mechanic/)).toBeInTheDocument();
    });
});
