// src/components/ProtectedRoute/index.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './index';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext');

function renderAt(path, user) {
    useAuth.mockReturnValue({ user, loading: false });
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/login" element={<div>login page</div>} />
                <Route path="/superadmin" element={<ProtectedRoute><div>platform page</div></ProtectedRoute>} />
                <Route path="/superadmin/:tab" element={<ProtectedRoute><div>platform section</div></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><div>account page</div></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><div>dashboard page</div></ProtectedRoute>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('ProtectedRoute', () => {
    it('sends signed-out users to login', () => {
        renderAt('/dashboard', null);
        expect(screen.getByText('login page')).toBeInTheDocument();
    });

    it('lets tenant users through', () => {
        renderAt('/dashboard', { role: 'admin' });
        expect(screen.getByText('dashboard page')).toBeInTheDocument();
    });

    it('keeps a superadmin off tenant pages', () => {
        renderAt('/dashboard', { role: 'superadmin' });
        expect(screen.getByText('platform page')).toBeInTheDocument();
    });

    it('lets a superadmin reach the platform sections', () => {
        renderAt('/superadmin/users', { role: 'superadmin' });
        expect(screen.getByText('platform section')).toBeInTheDocument();
    });

    it('lets a superadmin reach their account page', () => {
        renderAt('/account', { role: 'superadmin' });
        expect(screen.getByText('account page')).toBeInTheDocument();
    });
});
