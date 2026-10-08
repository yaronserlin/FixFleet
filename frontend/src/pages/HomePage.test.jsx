// src/pages/HomePage.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext');

function renderHome(user, loading = false) {
    useAuth.mockReturnValue({ user, loading });
    render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<div>dashboard page</div>} />
                <Route path="/superadmin" element={<div>platform page</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('HomePage', () => {
    it('shows the landing page with a sign-in link to signed-out visitors', () => {
        renderHome(null);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('One platform for your entire fleet');
        const links = screen.getAllByRole('link', { name: /sign in/i });
        expect(links.length).toBeGreaterThan(0);
        links.forEach(link => expect(link).toHaveAttribute('href', '/login'));
        expect(screen.getAllByRole('link', { name: /sign up|create company account/i })
            .every(link => link.getAttribute('href') === '/signup')).toBe(true);
        expect(screen.getAllByRole('link', { name: /user guide/i })[0]).toHaveAttribute('href', '/guide');
    });

    it('renders immediately while the session check is still pending', () => {
        renderHome(null, true);
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('redirects a signed-in tenant user to the dashboard', () => {
        renderHome({ role: 'mechanic' });
        expect(screen.getByText('dashboard page')).toBeInTheDocument();
    });

    it('redirects a superadmin to the platform page', () => {
        renderHome({ role: 'superadmin' });
        expect(screen.getByText('platform page')).toBeInTheDocument();
    });
});
