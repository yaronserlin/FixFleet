// src/components/Navbar/BottomNav.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useThemeMode } from '../../contexts/ThemeContext';

jest.mock('../../contexts/ThemeContext');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const pages = ['Dashboard', 'Equipment', 'Manuals', 'Admin'];
const user = { id: 'u1', name: 'jane doe', role: 'admin', avatar: null };

function setup({ route = '/dashboard', onOpenCreateFault = jest.fn(), overrides = {} } = {}) {
    useThemeMode.mockReturnValue({ mode: 'light', toggleColorMode: jest.fn(), ...overrides });
    const utils = render(
        <MemoryRouter initialEntries={[route]}>
            <BottomNav display={{ xs: 'flex', sm: 'none' }} user={user} pages={pages} onOpenCreateFault={onOpenCreateFault} />
        </MemoryRouter>
    );
    return { ...utils, onOpenCreateFault };
}

describe('BottomNav', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders nothing when there is no logged-in user', () => {
        useThemeMode.mockReturnValue({ mode: 'light', toggleColorMode: jest.fn() });
        const { container } = render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <BottomNav display={{}} user={null} pages={pages} onOpenCreateFault={jest.fn()} />
            </MemoryRouter>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a tab for every nav page plus the center FAB and account tab', () => {
        setup();
        pages.forEach((page) => {
            expect(screen.getByRole('link', { name: page })).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: /report a fault/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /open account menu/i })).toBeInTheDocument();
    });

    it('marks the tab matching the current route as active', () => {
        setup({ route: '/equipment' });
        expect(screen.getByRole('link', { name: 'Equipment' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    });

    it('clicking the center FAB calls onOpenCreateFault, reachable from any page', () => {
        const onOpenCreateFault = jest.fn();
        setup({ route: '/manuals', onOpenCreateFault });
        fireEvent.click(screen.getByRole('button', { name: /report a fault/i }));
        expect(onOpenCreateFault).toHaveBeenCalledTimes(1);
    });

    describe('account bottom sheet', () => {
        it('opens with the user summary and menu items when the account tab is clicked', () => {
            setup();
            expect(screen.queryByText('Account Settings')).not.toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: /open account menu/i }));

            expect(screen.getByText('Jane Doe')).toBeInTheDocument();
            expect(screen.getByText('Admin')).toBeInTheDocument();
            expect(screen.getByText('Account Settings')).toBeInTheDocument();
            expect(screen.getByText('My Activity')).toBeInTheDocument();
            expect(screen.getByText('Log out')).toBeInTheDocument();
        });

        it('navigates to /account and closes the sheet when Account Settings is clicked', () => {
            setup();
            fireEvent.click(screen.getByRole('button', { name: /open account menu/i }));
            fireEvent.click(screen.getByText('Account Settings'));
            expect(mockNavigate).toHaveBeenCalledWith('/account');
        });

        it('navigates to /profile when My Activity is clicked', () => {
            setup();
            fireEvent.click(screen.getByRole('button', { name: /open account menu/i }));
            fireEvent.click(screen.getByText('My Activity'));
            expect(mockNavigate).toHaveBeenCalledWith('/profile');
        });

        it('navigates to /logout when Log out is clicked', () => {
            setup();
            fireEvent.click(screen.getByRole('button', { name: /open account menu/i }));
            fireEvent.click(screen.getByText('Log out'));
            expect(mockNavigate).toHaveBeenCalledWith('/logout');
        });

        it('shows a Dark Mode entry that toggles the theme, keeping it reachable on phone', () => {
            const toggleColorMode = jest.fn();
            setup({ overrides: { toggleColorMode } });
            fireEvent.click(screen.getByRole('button', { name: /open account menu/i }));
            fireEvent.click(screen.getByText('Dark Mode'));
            expect(toggleColorMode).toHaveBeenCalledTimes(1);
        });

        it('shows a Light Mode entry when already in dark mode', () => {
            setup({ overrides: { mode: 'dark' } });
            fireEvent.click(screen.getByRole('button', { name: /open account menu/i }));
            expect(screen.getByText('Light Mode')).toBeInTheDocument();
        });
    });
});
