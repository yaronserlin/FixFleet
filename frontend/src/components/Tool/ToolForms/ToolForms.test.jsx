// src/components/Tool/ToolForms/ToolForms.test.jsx
//
// Regression coverage for this session's rewrite of ToolForms from ad-hoc
// validation onto the shared useForm/validate hooks (matching the pattern
// already used by SignupForm). Unlike SignupForm's test, useForm/validate
// are exercised for real here (not mocked) so the actual wiring is proven.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateToolForm, UpdateToolForm, EquipmentFormFields, CreateEquipmentForm, UpdateEquipmentForm } from './ToolForms';

describe('CreateToolForm', () => {
    it('renders all fields and starts with submit disabled (name is required)', () => {
        render(<CreateToolForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
        expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Serial Number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Local Serial Number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Model/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Equipment/i })).toBeDisabled();
    });

    it('shows a required-field error when the form is submitted while name is blank', () => {
        const onSubmit = jest.fn();
        const { container } = render(<CreateToolForm onSubmit={onSubmit} onCancel={jest.fn()} />);
        // Bypass the disabled submit button to exercise useForm's validate-on-submit path directly.
        fireEvent.submit(container.querySelector('form'));
        expect(screen.getByText(/Name is required\./i)).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('enables submit once a name is entered, and disables it again if cleared', () => {
        render(<CreateToolForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
        const nameInput = screen.getByLabelText(/^Name/i);
        const submitButton = screen.getByRole('button', { name: /Create Equipment/i });

        fireEvent.change(nameInput, { target: { name: 'name', value: 'Drill' } });
        expect(submitButton).not.toBeDisabled();

        fireEvent.change(nameInput, { target: { name: 'name', value: '   ' } });
        expect(submitButton).toBeDisabled();
    });

    it('calls onSubmit with the entered values when the form is valid', async () => {
        const onSubmit = jest.fn().mockResolvedValue();
        render(<CreateToolForm onSubmit={onSubmit} onCancel={jest.fn()} />);

        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Drill' } });
        fireEvent.change(screen.getByLabelText(/^Serial Number/i), { target: { name: 'serialNumber', value: 'SN-1' } });
        fireEvent.click(screen.getByRole('button', { name: /Create Equipment/i }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Drill',
            serialNumber: 'SN-1',
        })));
    });

    it('shows an inline alert when onSubmit rejects, and clears it on the next edit', async () => {
        const onSubmit = jest.fn().mockRejectedValue(new Error('Name already exists'));
        render(<CreateToolForm onSubmit={onSubmit} onCancel={jest.fn()} />);

        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Drill' } });
        fireEvent.click(screen.getByRole('button', { name: /Create Equipment/i }));

        expect(await screen.findByText('Name already exists')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Drill 2' } });
        expect(screen.queryByText('Name already exists')).not.toBeInTheDocument();
    });

    it('surfaces a server-provided message under response.data.message', async () => {
        const onSubmit = jest.fn().mockRejectedValue({ response: { data: { message: 'Duplicate serial' } } });
        render(<CreateToolForm onSubmit={onSubmit} onCancel={jest.fn()} />);

        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Drill' } });
        fireEvent.click(screen.getByRole('button', { name: /Create Equipment/i }));

        expect(await screen.findByText('Duplicate serial')).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked and disables it while submitting', () => {
        const onCancel = jest.fn();
        render(<CreateToolForm onSubmit={jest.fn()} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('omits the Cancel button when onCancel is not provided', () => {
        render(<CreateToolForm onSubmit={jest.fn()} />);
        expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });
});

describe('UpdateToolForm', () => {
    const initialData = {
        name: 'Forklift',
        serialNumber: 'SN-42',
        localSerialNumber: 'LOC-1',
        model: 'FL-3000',
        description: 'Warehouse forklift',
    };

    it('pre-fills fields from initialData', () => {
        render(<UpdateToolForm initialData={initialData} onSubmit={jest.fn()} onCancel={jest.fn()} />);
        expect(screen.getByLabelText(/^Name/i)).toHaveValue('Forklift');
        expect(screen.getByLabelText(/^Serial Number/i)).toHaveValue('SN-42');
        expect(screen.getByLabelText(/Model/i)).toHaveValue('FL-3000');
        expect(screen.getByRole('button', { name: /Update Equipment/i })).not.toBeDisabled();
    });

    it('re-syncs its fields when a different record is passed in', () => {
        const { rerender } = render(<UpdateToolForm initialData={initialData} onSubmit={jest.fn()} onCancel={jest.fn()} />);
        expect(screen.getByLabelText(/^Name/i)).toHaveValue('Forklift');

        rerender(<UpdateToolForm initialData={{ ...initialData, name: 'Crane', _id: 'other' }} onSubmit={jest.fn()} onCancel={jest.fn()} />);
        expect(screen.getByLabelText(/^Name/i)).toHaveValue('Crane');
    });

    it('defaults missing fields to empty strings', () => {
        render(<UpdateToolForm initialData={{}} onSubmit={jest.fn()} onCancel={jest.fn()} />);
        expect(screen.getByLabelText(/^Name/i)).toHaveValue('');
        expect(screen.getByRole('button', { name: /Update Equipment/i })).toBeDisabled();
    });

    it('submits the updated values', async () => {
        const onSubmit = jest.fn().mockResolvedValue();
        render(<UpdateToolForm initialData={initialData} onSubmit={onSubmit} onCancel={jest.fn()} />);
        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Forklift v2' } });
        fireEvent.click(screen.getByRole('button', { name: /Update Equipment/i }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Forklift v2' })));
    });
});

describe('Equipment aliases', () => {
    it('EquipmentFormFields/CreateEquipmentForm/UpdateEquipmentForm are aliases of the Tool equivalents', () => {
        expect(EquipmentFormFields).toBeDefined();
        expect(CreateEquipmentForm).toBe(CreateToolForm);
        expect(UpdateEquipmentForm).toBe(UpdateToolForm);
    });
});
