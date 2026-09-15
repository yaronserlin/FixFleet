// src/components/Fault/CloseFaultDialog/CloseFaultDialog.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CloseFaultDialog from './CloseFaultDialog';

const fault = { _id: 'f1', code: 'F-001', description: 'Hydraulic leak', engineHours: 100, tool: { name: 'Forklift' } };

describe('CloseFaultDialog', () => {
    it('renders nothing when there is no fault', () => {
        const { container } = render(<CloseFaultDialog open onClose={jest.fn()} onConfirm={jest.fn()} fault={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the fault summary and current meter chip', () => {
        render(<CloseFaultDialog open onClose={jest.fn()} onConfirm={jest.fn()} fault={fault} />);
        expect(screen.getByText(/F-001 — Hydraulic leak/)).toBeInTheDocument();
        expect(screen.getByText(/Equipment: Forklift/)).toBeInTheDocument();
        expect(screen.getByText('Current meter: 100 hrs')).toBeInTheDocument();
    });

    it('shows a validation error and does not call onConfirm when engine hours is blank', () => {
        const onConfirm = jest.fn();
        render(<CloseFaultDialog open onClose={jest.fn()} onConfirm={onConfirm} fault={fault} />);
        fireEvent.click(screen.getByRole('button', { name: /confirm & resolve/i }));
        expect(screen.getByText(/please enter a valid non-negative engine hours reading/i)).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('shows a validation error for a negative engine hours value', () => {
        const onConfirm = jest.fn();
        render(<CloseFaultDialog open onClose={jest.fn()} onConfirm={onConfirm} fault={fault} />);
        fireEvent.change(screen.getByLabelText(/closing engine hours/i), { target: { value: '-5' } });
        fireEvent.click(screen.getByRole('button', { name: /confirm & resolve/i }));
        expect(screen.getByText(/please enter a valid non-negative engine hours reading/i)).toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm with the parsed engine hours and trimmed resolution notes when valid', () => {
        const onConfirm = jest.fn();
        render(<CloseFaultDialog open onClose={jest.fn()} onConfirm={onConfirm} fault={fault} />);
        fireEvent.change(screen.getByLabelText(/closing engine hours/i), { target: { value: '150' } });
        fireEvent.change(screen.getByLabelText(/resolution notes/i), { target: { value: '  Replaced hose  ' } });
        fireEvent.click(screen.getByRole('button', { name: /confirm & resolve/i }));
        expect(onConfirm).toHaveBeenCalledWith(fault, { engineHours: 150, resolutionDescription: 'Replaced hose' });
    });

    it('warns when the entered hours are lower than the current equipment reading', () => {
        render(<CloseFaultDialog open onClose={jest.fn()} onConfirm={jest.fn()} fault={fault} equipment={{ currentEngineHours: 200 }} />);
        fireEvent.change(screen.getByLabelText(/closing engine hours/i), { target: { value: '150' } });
        expect(screen.getByText(/lower than current equipment reading \(200 hrs\)/i)).toBeInTheDocument();
    });

    it('resets its fields whenever the dialog is reopened', () => {
        const { rerender } = render(<CloseFaultDialog open onClose={jest.fn()} onConfirm={jest.fn()} fault={fault} />);
        fireEvent.change(screen.getByLabelText(/closing engine hours/i), { target: { value: '150' } });
        expect(screen.getByLabelText(/closing engine hours/i)).toHaveValue(150);

        rerender(<CloseFaultDialog open={false} onClose={jest.fn()} onConfirm={jest.fn()} fault={fault} />);
        rerender(<CloseFaultDialog open onClose={jest.fn()} onConfirm={jest.fn()} fault={fault} />);
        expect(screen.getByLabelText(/closing engine hours/i)).toHaveValue(null);
    });

    it('calls onClose when Cancel or the close icon is clicked', () => {
        const onClose = jest.fn();
        render(<CloseFaultDialog open onClose={onClose} onConfirm={jest.fn()} fault={fault} />);
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
