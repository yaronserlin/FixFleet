// src/components/User/UserForms/UserForms.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserForm, UpdateUserForm } from './UserForms';

describe('CreateUserForm', () => {
    it('renders name/email/password fields and the default-role info note', () => {
        render(<CreateUserForm onSubmit={jest.fn()} />);
        expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
        expect(screen.getByText(/Operators/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Create$/i })).toBeInTheDocument();
    });

    it('shows required-field errors when submitted blank, including password (regression: password used to be optional on Create)', async () => {
        const onSubmit = jest.fn();
        const { container } = render(<CreateUserForm onSubmit={onSubmit} />);
        fireEvent.submit(container.querySelector('form'));
        expect(await screen.findByText(/Name is required\./i)).toBeInTheDocument();
        expect(screen.getByText(/Email is required\./i)).toBeInTheDocument();
        expect(screen.getByText(/Password is required\./i)).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects an invalid email address', () => {
        const { container } = render(<CreateUserForm onSubmit={jest.fn()} />);
        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Jane Doe' } });
        fireEvent.change(screen.getByLabelText(/^Email/i), { target: { name: 'email', value: 'not-an-email' } });
        fireEvent.change(screen.getByLabelText(/^Password/i), { target: { name: 'password', value: 'secret1' } });
        fireEvent.submit(container.querySelector('form'));
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });

    it('rejects a too-short password', () => {
        const { container } = render(<CreateUserForm onSubmit={jest.fn()} />);
        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Jane Doe' } });
        fireEvent.change(screen.getByLabelText(/^Email/i), { target: { name: 'email', value: 'jane@acme.com' } });
        fireEvent.change(screen.getByLabelText(/^Password/i), { target: { name: 'password', value: '123' } });
        fireEvent.submit(container.querySelector('form'));
        expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });

    it('submits valid values and resets the form afterward', async () => {
        const onSubmit = jest.fn().mockResolvedValue();
        render(<CreateUserForm onSubmit={onSubmit} />);
        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Jane Doe' } });
        fireEvent.change(screen.getByLabelText(/^Email/i), { target: { name: 'email', value: 'jane@acme.com' } });
        fireEvent.change(screen.getByLabelText(/^Password/i), { target: { name: 'password', value: 'secret1' } });
        fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Jane Doe', email: 'jane@acme.com', password: 'secret1', role: 'operator',
        })));
        await waitFor(() => expect(screen.getByLabelText(/^Name/i)).toHaveValue(''));
    });

    it('shows a server error alert when onSubmit rejects', async () => {
        const onSubmit = jest.fn().mockRejectedValue(new Error('Email already in use'));
        render(<CreateUserForm onSubmit={onSubmit} />);
        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Jane Doe' } });
        fireEvent.change(screen.getByLabelText(/^Email/i), { target: { name: 'email', value: 'jane@acme.com' } });
        fireEvent.change(screen.getByLabelText(/^Password/i), { target: { name: 'password', value: 'secret1' } });
        fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));
        expect(await screen.findByText('Email already in use')).toBeInTheDocument();
    });
});

describe('UpdateUserForm', () => {
    const initialValues = { name: 'Jane Doe', email: 'jane@acme.com', password: '', role: 'mechanic' };

    it('pre-fills fields and does not require a password', () => {
        render(<UpdateUserForm initialValues={initialValues} onSubmit={jest.fn()} />);
        expect(screen.getByLabelText(/^Name/i)).toHaveValue('Jane Doe');
        expect(screen.getByLabelText(/^Email/i)).toHaveValue('jane@acme.com');
        expect(screen.getByRole('button', { name: /^Update$/i })).toBeInTheDocument();
    });

    it('submits successfully with the password left blank (blank means "leave unchanged" on Update, unlike Create)', async () => {
        const onSubmit = jest.fn().mockResolvedValue();
        render(<UpdateUserForm initialValues={initialValues} onSubmit={onSubmit} />);
        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Jane Updated' } });
        fireEvent.click(screen.getByRole('button', { name: /^Update$/i }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane Updated', password: '' })));
    });

    it('does not reset the form after a successful update (only Create resets)', async () => {
        const onSubmit = jest.fn().mockResolvedValue();
        render(<UpdateUserForm initialValues={initialValues} onSubmit={onSubmit} />);
        fireEvent.change(screen.getByLabelText(/^Name/i), { target: { name: 'name', value: 'Jane Updated' } });
        fireEvent.click(screen.getByRole('button', { name: /^Update$/i }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalled());
        expect(screen.getByLabelText(/^Name/i)).toHaveValue('Jane Updated');
    });

    it('validates a too-short password if one is entered', () => {
        const { container } = render(<UpdateUserForm initialValues={initialValues} onSubmit={jest.fn()} />);
        fireEvent.change(screen.getByLabelText(/^Password/i), { target: { name: 'password', value: '123' } });
        fireEvent.submit(container.querySelector('form'));
        expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });
});
