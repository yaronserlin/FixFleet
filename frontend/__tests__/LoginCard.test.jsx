// __tests__/LoginCard.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginCard from '../src/components/LoginComponent/LoginCard';

// Mock LoginForm to isolate LoginCard
jest.mock('../src/components/LoginComponent/LoginForm', () => () => <div>LoginFormMock</div>);
jest.mock('../src/components/LoginComponent/SignupForm', () => () => <div>SignupFormMock</div>);

const renderAt = (path) => render(
    <MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/login" element={<LoginCard />} />
            <Route path="/signup" element={<LoginCard />} />
        </Routes>
    </MemoryRouter>
);

describe('LoginCard', () => {
    test('renders title and LoginForm', () => {
        renderAt('/login');
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
        expect(screen.getByText('LoginFormMock')).toBeInTheDocument();
    });

    test('renders the sign-up form on /signup', () => {
        renderAt('/signup');
        expect(screen.getByText(/Create an account/i)).toBeInTheDocument();
        expect(screen.getByText('SignupFormMock')).toBeInTheDocument();
    });

    test('toggles between sign-in and sign-up routes', () => {
        renderAt('/login');
        fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
        expect(screen.getByText('SignupFormMock')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(screen.getByText('LoginFormMock')).toBeInTheDocument();
    });
});
