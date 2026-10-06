// __tests__/ForgotPasswordForm.test.jsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ForgotPasswordForm from '../src/components/LoginComponent/ForgotPasswordForm';
import userService from '../src/services/userService';

jest.mock('../src/services/userService');

describe('ForgotPasswordForm', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        userService.forgotPassword.mockResolvedValue({});
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('resend is disabled during the cooldown, then resends to the same email', async () => {
        render(<ForgotPasswordForm />);
        fireEvent.change(screen.getByLabelText(/email/i), { target: { name: 'email', value: 'a@b.com' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
        });

        const resend = await screen.findByRole('button', { name: /resend email \(60s\)/i });
        expect(resend).toBeDisabled();

        // One act per tick: the countdown re-arms its timer in an effect after each render.
        for (let i = 0; i < 60; i += 1) {
            await act(async () => {
                jest.advanceTimersByTime(1000);
            });
        }
        const enabled = screen.getByRole('button', { name: /^resend email$/i });
        expect(enabled).toBeEnabled();

        await act(async () => {
            fireEvent.click(enabled);
        });
        expect(userService.forgotPassword).toHaveBeenCalledTimes(2);
        expect(userService.forgotPassword).toHaveBeenLastCalledWith('a@b.com');
        expect(screen.getByRole('button', { name: /resend email \(60s\)/i })).toBeDisabled();
    });
});
