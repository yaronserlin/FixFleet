// src/components/Fault/FaultCard/FaultCard.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FaultCard from './FaultCard';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext');

const openFault = {
    _id: 'f1',
    code: 'F-001',
    status: 'open',
    description: 'Hydraulic leak',
    engineHours: 120,
    tool: { name: 'Forklift' },
    createdAt: '2024-01-05T00:00:00.000Z',
};

const closedFault = { ...openFault, _id: 'f2', status: 'closed', closingEngineHours: 130 };

function setup(fault, props = {}, role = 'mechanic') {
    useAuth.mockReturnValue({ user: role ? { role } : null });
    const handlers = {
        onClick: jest.fn(),
        onCloseFault: jest.fn(),
        onReopenFault: jest.fn(),
        onDeleteFault: jest.fn(),
        ...props,
    };
    render(<FaultCard fault={fault} {...handlers} />);
    return handlers;
}

describe('FaultCard', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders code, status, equipment name, hours, and description', () => {
        setup(openFault);
        expect(screen.getByText('F-001')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Forklift')).toBeInTheDocument();
        expect(screen.getByText('120 hrs')).toBeInTheDocument();
        expect(screen.getByText('Hydraulic leak')).toBeInTheDocument();
    });

    it('shows the closing engine hours (not reported hours) once closed', () => {
        setup(closedFault);
        expect(screen.getByText('Closed')).toBeInTheDocument();
        expect(screen.getByText('130 hrs')).toBeInTheDocument();
    });

    it('calls onClick with the fault when the card body is clicked', () => {
        const handlers = setup(openFault);
        fireEvent.click(screen.getByText('Hydraulic leak'));
        expect(handlers.onClick).toHaveBeenCalledWith(openFault);
    });

    describe('role-gated actions', () => {
        it('hides all action buttons for an operator', () => {
            setup(openFault, {}, 'operator');
            expect(screen.queryByRole('button', { name: /resolve fault/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });

        it('hides all action buttons when there is no logged-in user', () => {
            setup(openFault, {}, null);
            expect(screen.queryByRole('button', { name: /resolve fault/i })).not.toBeInTheDocument();
        });

        it('shows Resolve Fault for an open fault as mechanic, and calls onCloseFault without triggering onClick', () => {
            const handlers = setup(openFault, {}, 'mechanic');
            fireEvent.click(screen.getByRole('button', { name: /resolve fault/i }));
            expect(handlers.onCloseFault).toHaveBeenCalledWith(openFault);
            expect(handlers.onClick).not.toHaveBeenCalled();
        });

        it('shows Reopen for a closed fault as admin, and calls onReopenFault without triggering onClick', () => {
            const handlers = setup(closedFault, {}, 'admin');
            fireEvent.click(screen.getByRole('button', { name: /reopen/i }));
            expect(handlers.onReopenFault).toHaveBeenCalledWith(closedFault);
            expect(handlers.onClick).not.toHaveBeenCalled();
        });

        it('shows Delete only when onDeleteFault is supplied, and calls it without triggering onClick', () => {
            const handlers = setup(openFault, {}, 'mechanic');
            fireEvent.click(screen.getByRole('button', { name: /delete/i }));
            expect(handlers.onDeleteFault).toHaveBeenCalledWith(openFault);
            expect(handlers.onClick).not.toHaveBeenCalled();
        });

        it('hides Delete when onDeleteFault is not supplied', () => {
            setup(openFault, { onDeleteFault: undefined }, 'mechanic');
            expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
        });
    });

    it('renders a clickable photo thumbnail when the fault has photos', () => {
        setup({ ...openFault, photos: ['photo1.jpg'] });
        expect(screen.getByAltText(/Photo for F-001/i)).toBeInTheDocument();
    });
});
