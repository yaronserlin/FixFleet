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
                display={{ xs: 'flex', sm: 'none' }}
                user={user}
                pages={navPages}
                onOpenCreateFault={onOpenCreateFault}
            />
        </>
    );
}
