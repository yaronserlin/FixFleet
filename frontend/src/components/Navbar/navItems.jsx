// src/components/Navbar/navItems.js
//
// Shared page->path / page->icon resolution for the sidebar, rail, and
// bottom nav variants, so all three stay in sync with a single source of
// truth (previously duplicated between DesktopNav.jsx and MobileNav.jsx).
import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { ROUTES } from '../../constants/routes';

export const PAGE_ICON_MAP = {
    'dashboard':  <DashboardIcon fontSize="small" />,
    'my reports': <AssignmentIcon fontSize="small" />,
    'manuals':    <MenuBookIcon fontSize="small" />,
    'my faults':  <ReportProblemIcon fontSize="small" />,
    'faults':     <ReportProblemIcon fontSize="small" />,
    'equipment':  <PrecisionManufacturingIcon fontSize="small" />,
    'profile':    <PersonIcon fontSize="small" />,
    'account':    <PersonIcon fontSize="small" />,
    'admin':      <AdminPanelSettingsIcon fontSize="small" />,
};

export function pageToPath(page) {
    const lower = page.toLowerCase();
    if (lower === 'dashboard') return ROUTES.DASHBOARD;
    if (lower === 'my reports' || lower === 'reports' || lower === 'my faults' || lower === 'faults') return ROUTES.MY_REPORTS;
    if (lower === 'manuals' || lower === 'equipment manuals' || lower === 'books') return ROUTES.MANUALS;
    if (lower === 'equipment' || lower === 'tools') return ROUTES.EQUIPMENT;
    if (lower === 'admin') return ROUTES.ADMIN;
    return `/${lower}`;
}

export function pageIcon(page) {
    return PAGE_ICON_MAP[page.toLowerCase()] || <DashboardIcon fontSize="small" />;
}

// Nav tabs are icon-only and labelled by `aria-label`, but a page demoted
// into a menu (see BottomNav's `menuPages`) is read as text and gets room
// for a fuller name.
const PAGE_MENU_LABEL_MAP = {
    'admin': 'Admin Panel',
};

/** Label for `page` when it appears as a text menu entry rather than a tab. */
export function pageMenuLabel(page) {
    return PAGE_MENU_LABEL_MAP[page.toLowerCase()] || page;
}

/** True when `pathname` should highlight the nav item for `page`. */
export function isPageActive(page, pathname) {
    const targetPath = pageToPath(page);
    return (
        pathname === targetPath ||
        (targetPath !== ROUTES.DASHBOARD && pathname.startsWith(targetPath))
    );
}
