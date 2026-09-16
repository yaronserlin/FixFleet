// src/components/Navbar/SidebarNav.test.jsx
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import { useThemeMode } from '../../contexts/ThemeContext';

jest.mock('../../contexts/ThemeContext');

const pages = ['Dashboard', 'Equipment', 'Manuals', 'Admin'];
const user = { id: 'u1', name: 'jane doe', role: 'admin' };

function setup({ variant = 'full', route = '/dashboard', overrides = {} } = {}) {
    const toggleColorMode = jest.fn();
    useThemeMode.mockReturnValue({ mode: 'light', toggleColorMode, ...overrides });
    return render(
        <MemoryRouter initialEntries={[route]}>
            <SidebarNav variant={variant} display={{ xs: 'none', lg: 'block' }} user={user} pages={pages} />
        </MemoryRouter>
    );
}

describe('SidebarNav', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders nothing when there is no logged-in user', () => {
        useThemeMode.mockReturnValue({ mode: 'light', toggleColorMode: jest.fn() });
        const { container } = render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <SidebarNav variant="full" display={{}} user={null} pages={pages} />
            </MemoryRouter>
        );
        expect(container).toBeEmptyDOMElement();
    });

    describe('variant="full"', () => {
        it('shows the brand text and a text label for every nav page', () => {
            setup({ variant: 'full' });
            expect(screen.getByText('MAINTENANCE')).toBeInTheDocument();
            pages.forEach((page) => {
                expect(screen.getByRole('link', { name: page })).toBeInTheDocument();
            });
        });

        it('marks the link matching the current route as active via aria-current', () => {
            setup({ variant: 'full', route: '/dashboard' });
            expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
            expect(screen.getByRole('link', { name: 'Equipment' })).not.toHaveAttribute('aria-current');
        });

        it('marks a nested route (e.g. /equipment/123) as active for its parent nav item', () => {
            setup({ variant: 'full', route: '/equipment/abc123' });
            expect(screen.getByRole('link', { name: 'Equipment' })).toHaveAttribute('aria-current', 'page');
        });
    });

    describe('variant="rail"', () => {
        it('does not render visible text labels for nav pages (icon-only)', () => {
            setup({ variant: 'rail' });
            // The brand's text subtitle/title shouldn't render in rail mode either.
            expect(screen.queryByText('MAINTENANCE')).not.toBeInTheDocument();
            // Scope to the nav item list itself -- the footer UserMenu also
            // renders a role chip (e.g. "Admin") that would otherwise collide
            // with a same-named nav page in this text query.
            const navList = screen.getByRole('list');
            pages.forEach((page) => {
                expect(within(navList).queryByText(page)).not.toBeInTheDocument();
            });
        });

        it('still renders a navigable link per page', () => {
            setup({ variant: 'rail', route: '/manuals' });
            const links = screen.getAllByRole('link');
            // Brand logo link + one per nav page
            expect(links.length).toBeGreaterThanOrEqual(pages.length);
        });
    });

    it('does not expose the theme control in navigation', () => {
        setup();
        expect(screen.queryByRole('button', { name: /switch to dark mode|switch to light mode/i })).not.toBeInTheDocument();
    });

    it('renders the user menu trigger', () => {
        setup();
        expect(screen.getByRole('button', { name: /open account menu/i })).toBeInTheDocument();
    });

    it('nav links point at the correct routes', () => {
        setup({ variant: 'full' });
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
        expect(screen.getByRole('link', { name: 'Equipment' })).toHaveAttribute('href', '/equipment');
        expect(screen.getByRole('link', { name: 'Manuals' })).toHaveAttribute('href', '/manuals');
        expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    });

    it('renders correctly for an operator (My Reports page) without crashing', () => {
        useThemeMode.mockReturnValue({ mode: 'light', toggleColorMode: jest.fn() });
        render(
            <MemoryRouter initialEntries={['/my-reports']}>
                <SidebarNav
                    variant="full"
                    display={{}}
                    user={{ id: 'u2', name: 'oscar operator', role: 'operator' }}
                    pages={['Dashboard', 'My Reports', 'Manuals']}
                />
            </MemoryRouter>
        );
        const link = screen.getByRole('link', { name: 'My Reports' });
        expect(link).toHaveAttribute('href', '/my-reports');
        expect(link).toHaveAttribute('aria-current', 'page');
    });
});
