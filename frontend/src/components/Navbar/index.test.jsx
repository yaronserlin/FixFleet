// src/components/Navbar/index.test.jsx
//
// Orchestration tests: verify Navbar computes the correct role-based page
// list and threads user/pages/onOpenCreateFault down to the three
// breakpoint variants. SidebarNav/BottomNav are mocked here (each has its
// own dedicated test file) purely to make the prop-wiring assertions
// unambiguous -- without mocking, both a full and rail SidebarNav render
// simultaneously (by design, see SidebarNav.jsx's doc comment), which
// would mean every nav link/label appears twice in this render.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './index';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext');

jest.mock('./SidebarNav', () => (props) => (
    <div data-testid={`sidebar-${props.variant}`}>
        {props.user ? `user:${props.user.role}` : 'no-user'} | pages:{props.pages.join(',')}
    </div>
));

jest.mock('./BottomNav', () => (props) => (
    <div data-testid="bottom-nav">
        {props.user ? `user:${props.user.role}` : 'no-user'} | pages:{props.pages.join(',')}
        <button onClick={props.onOpenCreateFault}>trigger-create-fault</button>
    </div>
));

function setup(user) {
    useAuth.mockReturnValue({ user });
    const onOpenCreateFault = jest.fn();
    render(
        <MemoryRouter>
            <Navbar onOpenCreateFault={onOpenCreateFault} />
        </MemoryRouter>
    );
    return { onOpenCreateFault };
}

describe('Navbar', () => {
    afterEach(() => jest.clearAllMocks());

    it('renders a full sidebar, a rail sidebar, and a bottom nav simultaneously', () => {
        setup({ id: 'u1', role: 'mechanic' });
        expect(screen.getByTestId('sidebar-full')).toBeInTheDocument();
        expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
        expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    });

    it('gives a mechanic Dashboard/Equipment/Manuals (no Admin)', () => {
        setup({ id: 'u1', role: 'mechanic' });
        const expected = 'pages:Dashboard,Equipment,Manuals';
        expect(screen.getByTestId('sidebar-full')).toHaveTextContent(expected);
        expect(screen.getByTestId('sidebar-rail')).toHaveTextContent(expected);
        expect(screen.getByTestId('bottom-nav')).toHaveTextContent(expected);
    });

    it('gives an admin Dashboard/Equipment/Manuals/Admin', () => {
        setup({ id: 'u1', role: 'admin' });
        const expected = 'pages:Dashboard,Equipment,Manuals,Admin';
        expect(screen.getByTestId('sidebar-full')).toHaveTextContent(expected);
    });

    it('gives an operator Dashboard/My Reports/Manuals (their own reports, not the full equipment/admin set)', () => {
        setup({ id: 'u1', role: 'operator' });
        const expected = 'pages:Dashboard,My Reports,Manuals';
        expect(screen.getByTestId('sidebar-full')).toHaveTextContent(expected);
        expect(screen.getByTestId('bottom-nav')).toHaveTextContent(expected);
    });

    it('passes the current user down to every variant', () => {
        setup({ id: 'u1', role: 'admin' });
        expect(screen.getByTestId('sidebar-full')).toHaveTextContent('user:admin');
        expect(screen.getByTestId('sidebar-rail')).toHaveTextContent('user:admin');
        expect(screen.getByTestId('bottom-nav')).toHaveTextContent('user:admin');
    });

    it('threads onOpenCreateFault down to BottomNav so its center FAB can open fault creation from anywhere', () => {
        const { onOpenCreateFault } = setup({ id: 'u1', role: 'mechanic' });
        screen.getByText('trigger-create-fault').click();
        expect(onOpenCreateFault).toHaveBeenCalledTimes(1);
    });
});
