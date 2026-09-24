// __tests__/LoginForm.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../src/components/LoginComponent/LoginForm';
import { useAuth } from '../src/contexts/AuthContext';
import useForm from '../src/hooks/useForm';

jest.mock('../src/contexts/AuthContext');
jest.mock('../src/hooks/useForm');

describe('LoginForm', () => {
    const mockHandleChange = jest.fn();
    const mockHandleSubmit = jest.fn(e => e.preventDefault());
    const mockResetForm = jest.fn();
    const mockLogin = jest.fn();

    beforeEach(() => {
        // Mock authentication hook
        useAuth.mockReturnValue({ login: mockLogin, loading: false });
        // Mock form hook
        useForm.mockReturnValue({
            values: { email: '', password: '' },
            errors: {},
            isSubmitting: false,
            handleChange: mockHandleChange,
            handleSubmit: mockHandleSubmit,
            resetForm: mockResetForm,
        });
    });

    test('renders email and password inputs and submit button', () => {
        render(<LoginForm />);
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in|login/i })).toBeInTheDocument();
    });

    test('disables button when loading', () => {
        // Set loading to true
        useAuth.mockReturnValueOnce({ login: mockLogin, loading: true });
        const { container } = render(<LoginForm />);
        expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    });

    test('renders the email field start-adornment icon (slotProps migration)', () => {
        // Regression: after the MUI v9 upgrade, `InputProps` was silently
        // dropped to the DOM and this icon disappeared. It must be passed
        // via slotProps.input so it actually renders.
        render(<LoginForm />);
        expect(screen.getByTestId('EmailIcon')).toBeInTheDocument();
    });

    test('calls handleSubmit on form submission', () => {
        render(<LoginForm />);
        fireEvent.submit(screen.getByRole('button', { name: /sign in|login/i }));
        expect(mockHandleSubmit).toHaveBeenCalled();
    });
});
