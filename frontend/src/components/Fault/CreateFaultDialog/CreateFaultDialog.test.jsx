// src/components/Fault/CreateFaultDialog/CreateFaultDialog.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateFaultDialog from './CreateFaultDialog';

// Isolate CreateFaultDialog from the (heavier) real FaultForms implementation,
// following the same isolation approach as LoginCard.test.jsx mocking LoginForm.
jest.mock('../FaultForms/FaultForms', () => ({
    CreateFaultForm: (props) => (
        <div data-testid="create-fault-form">
            <span data-testid="tool-id">{props.toolId}</span>
            <span data-testid="lock-equipment">{String(props.lockEquipment)}</span>
            <button onClick={() => props.onSubmittingChange(true)}>start-submitting</button>
            <button onClick={() => props.onSubmittingChange(false)}>stop-submitting</button>
        </div>
    ),
}));

describe('CreateFaultDialog', () => {
    it('renders the title and the create fault form when open', () => {
        render(<CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} />);
        expect(screen.getByText('Report New Fault')).toBeInTheDocument();
        expect(screen.getByTestId('create-fault-form')).toBeInTheDocument();
    });

    it('renders nothing when closed', () => {
        render(<CreateFaultDialog open={false} onClose={jest.fn()} onSubmit={jest.fn()} />);
        expect(screen.queryByText('Report New Fault')).not.toBeInTheDocument();
    });

    describe('resolving the active equipment id', () => {
        it('prefers equipment._id, then equipment.id, then equipmentId, then toolId', () => {
            const { rerender } = render(
                <CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} toolId="from-tool" equipmentId="from-equipment-id" equipment={{ _id: 'from-equipment-obj' }} />
            );
            expect(screen.getByTestId('tool-id').textContent).toBe('from-equipment-obj');

            rerender(<CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} toolId="from-tool" equipmentId="from-equipment-id" />);
            expect(screen.getByTestId('tool-id').textContent).toBe('from-equipment-id');

            rerender(<CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} toolId="from-tool" />);
            expect(screen.getByTestId('tool-id').textContent).toBe('from-tool');
        });

        it('locks equipment selection when an id is resolved, unless lockEquipment is explicitly overridden', () => {
            const { rerender } = render(
                <CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} toolId="t1" />
            );
            expect(screen.getByTestId('lock-equipment').textContent).toBe('true');

            rerender(<CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} toolId="t1" lockEquipment={false} />);
            expect(screen.getByTestId('lock-equipment').textContent).toBe('false');

            rerender(<CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} />);
            expect(screen.getByTestId('lock-equipment').textContent).toBe('false');
        });
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = jest.fn();
        render(<CreateFaultDialog open onClose={onClose} onSubmit={jest.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the close icon is clicked', () => {
        const onClose = jest.fn();
        render(<CreateFaultDialog open onClose={onClose} onSubmit={jest.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows "Submitting…" and disables Cancel/Submit while the form reports submitting', () => {
        render(<CreateFaultDialog open onClose={jest.fn()} onSubmit={jest.fn()} />);
        expect(screen.getByRole('button', { name: /submit fault report/i })).not.toBeDisabled();

        fireEvent.click(screen.getByText('start-submitting'));
        expect(screen.getByRole('button', { name: /^submitting/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

        fireEvent.click(screen.getByText('stop-submitting'));
        expect(screen.getByRole('button', { name: /submit fault report/i })).not.toBeDisabled();
    });
});
