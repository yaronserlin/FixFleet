// __tests__/SignupForm.test.jsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SignupForm from '../src/components/LoginComponent/SignupForm';
import { useAuth } from '../src/contexts/AuthContext';
import useForm from '../src/hooks/useForm';

jest.mock('../src/contexts/AuthContext');
jest.mock('../src/hooks/useForm');

describe('SignupForm', () => {
    const mockHandleChange = jest.fn();
    const mockHandleSubmit = jest.fn((e) => e.preventDefault());
    const mockResetForm = jest.fn();
    const mockSignup = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue({ signup: mockSignup, loading: false });
        useForm.mockReturnValue({
            values: { companyName: '', name: '', email: '', password: '', agreeToTerms: false },
            errors: {},
            isSubmitting: false,
            handleChange: mockHandleChange,
            handleSubmit: mockHandleSubmit,
            resetForm: mockResetForm,
        });
    });

    test('renders form inputs, terms agreement checkbox, and submit button', () => {
        render(<SignupForm />);
        expect(screen.getByLabelText(/Company name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Admin full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
        expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
        expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Company Account/i })).toBeInTheDocument();
    });

    test('displays validation error when agreeToTerms is false', () => {
        useForm.mockReturnValue({
            values: { companyName: 'Acme', name: 'Admin', email: 'admin@acme.com', password: 'password123', agreeToTerms: false },
            errors: { agreeToTerms: 'You must agree to the Terms of Service and Privacy Policy to register' },
            isSubmitting: false,
            handleChange: mockHandleChange,
            handleSubmit: mockHandleSubmit,
            resetForm: mockResetForm,
        });

        render(<SignupForm />);
        expect(screen.getByText(/You must agree to the Terms of Service and Privacy Policy to register/i)).toBeInTheDocument();
    });

    test('calls handleSubmit on submission', () => {
        render(<SignupForm />);
        fireEvent.submit(screen.getByRole('button', { name: /Create Company Account/i }));
        expect(mockHandleSubmit).toHaveBeenCalled();
    });

    test('replaces the form with a check-your-inbox message after signup', async () => {
        mockSignup.mockResolvedValueOnce({ email: 'admin@acme.com' });
        render(<SignupForm />);
        const { onSubmit } = useForm.mock.calls[0][0];

        await act(() => onSubmit({ email: 'admin@acme.com' }));

        expect(screen.getByText(/check your inbox/i)).toHaveTextContent('admin@acme.com');
        expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Create Company Account/i })).not.toBeInTheDocument();
    });
});
