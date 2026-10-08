// __tests__/ForcePasswordChangePage.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForcePasswordChangePage from '../src/pages/ForcePasswordChangePage';
import { useAuth } from '../src/contexts/AuthContext';
import apiClient from '../src/services/apiClient';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

jest.mock('../src/contexts/AuthContext');
jest.mock('../src/services/apiClient');

describe('ForcePasswordChangePage', () => {
    const mockSetUser = jest.fn();
    const mockLogout = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue({
            user: { name: 'John Doe', mustChangePassword: true },
            setUser: mockSetUser,
            logout: mockLogout,
        });
    });

    test('does NOT render old or current temporary password input field', () => {
        render(<ForcePasswordChangePage />);
        expect(screen.queryByLabelText(/current temporary password/i)).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/enter temporary password/i)).not.toBeInTheDocument();

        // Renders new password and confirmation
        expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Confirm New Password/i)).toBeInTheDocument();
    });

    test('shows error if submitting without agreeing to terms', async () => {
        render(<ForcePasswordChangePage />);

        fireEvent.change(screen.getByLabelText(/^New Password/i), {
            target: { value: 'brandNewPassword123' },
        });
        fireEvent.change(screen.getByLabelText(/^Confirm New Password/i), {
            target: { value: 'brandNewPassword123' },
        });

        fireEvent.submit(screen.getByRole('button', { name: /Set Password & Continue/i }));

        await waitFor(() => {
            expect(screen.getByText(/You must agree to the Terms of Service and Privacy Policy to continue/i)).toBeInTheDocument();
        });
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    test('submits the new password without the login password once terms are agreed', async () => {
        apiClient.post.mockResolvedValueOnce({ data: { message: 'Success' } });

        render(<ForcePasswordChangePage />);

        fireEvent.change(screen.getByLabelText(/^New Password/i), {
            target: { value: 'brandNewPassword123' },
        });
        fireEvent.change(screen.getByLabelText(/^Confirm New Password/i), {
            target: { value: 'brandNewPassword123' },
        });

        // Check the terms agreement checkbox
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        fireEvent.submit(screen.getByRole('button', { name: /Set Password & Continue/i }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/auth/me/change-password', {
                newPassword: 'brandNewPassword123',
                agreeToTerms: true,
            });
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        });
    });
});
