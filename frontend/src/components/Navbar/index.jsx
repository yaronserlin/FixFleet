// src/components/Navbar/index.jsx
import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import SidebarNav from './SidebarNav';
import BottomNav from './BottomNav';

/**
 * Top-level navigation. Renders three breakpoint variants, following the
 * same "mount all, toggle with CSS display" pattern the previous
 * MobileNav/DesktopNav pair used (rather than conditionally mounting via
 * useMediaQuery), so there's no remount/flicker at a resize boundary:
 *
 *  - Phone   (< sm / 600px):        BottomNav, a native-app-style bottom
 *                                    tab bar with a raised center FAB that
 *                                    opens fault creation from anywhere.
 *                                    Admin is demoted from a tab to an entry
 *                                    in its account sheet (see below), so
 *                                    the bar holds five icons for every
 *                                    role instead of six for admins.
 *  - Tablet  (sm-lg / 600-1200px):  SidebarNav variant="rail", an
 *                                    icon-only "navigation rail" with
 *                                    hover tooltips.
 *  - Desktop (>= lg / 1200px):      SidebarNav variant="full", icon + text
 *                                    labels.
 *
 * `onOpenCreateFault` is threaded down from AppLayout (src/routes.jsx),
 * which owns the lifted CreateFaultDialog open/close state so the phone
 * bottom bar's center button can open it regardless of which page is
 * currently rendered.
 */
export default function Navbar({ onOpenCreateFault }) {
    const { user } = useAuth();

    const navPages = useMemo(() => {
        if (user?.role === ROLES.OPERATOR) {
            return ['Dashboard', 'My Reports', 'Manuals'];
        }
        const result = ['Dashboard', 'Equipment', 'Manuals'];
        if (user?.role === ROLES.ADMIN) {
            result.push('Admin');
        }
        return result;
    }, [user?.role]);

    // The phone bar is a fixed-width row of icon-only tabs: three nav tabs
    // plus the center FAB and the account tab already fill it. Rather than
    // squeezing a fourth tab in for admins alone, Admin moves into the
    // account sheet -- it's a settings-shaped destination, and every role
    // then gets the same five-icon bar.
    const bottomNavPages = useMemo(
        () => navPages.filter(page => page !== 'Admin'),
        [navPages]
    );
    const bottomMenuPages = useMemo(
        () => navPages.filter(page => page === 'Admin'),
        [navPages]
    );

    return (
        <>
            <SidebarNav
                variant="full"
                display={{ xs: 'none', lg: 'block' }}
                user={user}
                pages={navPages}
            />
            <SidebarNav
                variant="rail"
                display={{ xs: 'none', sm: 'block', lg: 'none' }}
                user={user}
                pages={navPages}
            />
            <BottomNav
                display={{ xs: 'block', sm: 'none' }}
                user={user}
                pages={bottomNavPages}
                menuPages={bottomMenuPages}
                onOpenCreateFault={onOpenCreateFault}
            />
        </>
    );
}
