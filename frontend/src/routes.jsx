import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';

import { NotificationProvider, useNotify } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToolProvider, useTool } from './contexts/ToolContext';
import { FaultProvider, useFault } from './contexts/FaultContext';
import { PageRefreshProvider, usePageRefreshTrigger } from './contexts/PageRefreshContext';
import { NotificationFeedProvider } from './contexts/NotificationFeedContext';

import ProtectedRoute from './components/ProtectedRoute';
import RequireAdmin from './components/RequireAdmin';
import Navbar from './components/Navbar';
import { BOTTOM_NAV_HEIGHT } from './components/Navbar/navConstants';
import CreateFaultDialog from './components/Fault/CreateFaultDialog/CreateFaultDialog';
import PullToRefresh from './components/PullToRefresh/PullToRefresh';
import { PageSkeleton } from './components/Skeletons/Skeletons';
import LoadingComponent from './components/LoadingComponent/LoadingComponent';
import LegalFooter from './components/Legal/LegalFooter';
import AccessibilityMenu from './components/AccessibilityMenu/AccessibilityMenu';
import { ROUTES } from './constants/routes';
import { ROLES } from './constants/roles';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ToolPage = lazy(() => import('./pages/ToolPage'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Logout = lazy(() => import('./pages/Logout'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const EquipmentSchedulePage = lazy(() => import('./pages/EquipmentSchedulePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OperatorReportsPage = lazy(() => import('./pages/OperatorReportsPage'));
const EquipmentBooksPage = lazy(() => import('./pages/EquipmentBooksPage'));
const ForcePasswordChangePage = lazy(() => import('./pages/ForcePasswordChangePage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
import ForcePasswordChangeDialog from './components/Auth/ForcePasswordChangeDialog';

// Preload route chunks in the background to avoid page transition freezes
const preloadRouteChunks = () => {
    import('./pages/Dashboard');
    import('./pages/ToolPage');
    import('./pages/ToolsPage');
    import('./pages/EquipmentSchedulePage');
    import('./pages/ProfilePage');
    import('./pages/AccountPage');
    import('./pages/AdminDashboard');
    import('./pages/OperatorReportsPage');
    import('./pages/EquipmentBooksPage');
    import('./pages/NotificationsPage');
};

// Top-level route fallback: a thin progress bar for immediate feedback,
// over a generic page skeleton. The concrete page's own skeleton takes over
// as soon as its chunk parses, so the two hand off without a blank frame.
function RouteFallback() {
    return (
        <Box sx={{ width: '100%' }}>
            <LinearProgress sx={{ height: 3 }} />
            <PageSkeleton />
        </Box>
    );
}

// Pages that use a full-screen layout (no Navbar)
const HIDE_NAVBAR_PATHS = [ROUTES.LOGIN, ROUTES.FORCE_PASSWORD_CHANGE];

function RequirePasswordChange({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <LoadingComponent />;
    if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
    if (!user.mustChangePassword) return <Navigate to={ROUTES.DASHBOARD} replace />;
    return children;
}

function RequireStaff({ children }) {
    const { user } = useAuth();
    if (user?.role === ROLES.OPERATOR) {
        return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
    return children;
}

function AppLayout() {
    const location = useLocation();
    const { user } = useAuth();
    const notify = useNotify();
    const { fetchEquipment } = useTool();
    const { createFault, fetchFaults } = useFault();
    // Single app-wide pull-to-refresh: pages register what "refresh" means
    // for them via usePageRefresh(), and this one gesture/indicator (below)
    // drives whichever page is on screen. See contexts/PageRefreshContext.
    const refreshPage = usePageRefreshTrigger();
    const hideNavbar = HIDE_NAVBAR_PATHS.some(p => location.pathname === p);

    // Fault-creation dialog state is lifted up here (rather than living only
    // inside Dashboard) so the phone bottom nav's center FAB can open fault
    // creation from anywhere in the app, not just from Dashboard's own
    // local dialog. Per-page "Report Fault" buttons (Dashboard,
    // OperatorReportsPage) keep their own local dialog/state as-is; they're
    // hidden at phone widths, where this FAB stands in for them.
    const [globalCreateFaultOpen, setGlobalCreateFaultOpen] = useState(false);

    const handleOpenGlobalCreateFault = useCallback(() => setGlobalCreateFaultOpen(true), []);
    const handleCloseGlobalCreateFault = useCallback(() => setGlobalCreateFaultOpen(false), []);

    const handleGlobalCreateFault = useCallback(async (values) => {
        if (!values?.tool) {
            notify.error('Please select an equipment to report a fault for');
            return;
        }
        try {
            await createFault({ ...values, operator: user?.id || user?._id });
            setGlobalCreateFaultOpen(false);
            await Promise.all([
                fetchEquipment ? fetchEquipment() : Promise.resolve(),
                fetchFaults ? fetchFaults() : Promise.resolve(),
            ]);
        } catch {
            // createFault() already surfaced a notification; keep the dialog
            // open so the user doesn't lose what they typed and can retry.
        }
    }, [notify, createFault, fetchEquipment, fetchFaults, user]);

    // Preload chunks on idle once authenticated
    useEffect(() => {
        if (user && !user.mustChangePassword) {
            if ('requestIdleCallback' in window) {
                const handle = window.requestIdleCallback(() => preloadRouteChunks());
                return () => window.cancelIdleCallback(handle);
            } else {
                const timer = setTimeout(() => preloadRouteChunks(), 150);
                return () => clearTimeout(timer);
            }
        }
    }, [user]);

    const routedContent = (
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                {/* Default redirect */}
                <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />

                {/* Public routes */}
                <Route path={ROUTES.LOGIN} element={<Login />} />
                <Route path={ROUTES.TERMS} element={<LegalPage />} />
                <Route path={ROUTES.PRIVACY} element={<LegalPage />} />
                <Route path={ROUTES.LEGAL} element={<LegalPage />} />
                <Route path={ROUTES.ACCESSIBILITY} element={<LegalPage />} />
                <Route
                    path={ROUTES.FORCE_PASSWORD_CHANGE}
                    element={
                        <RequirePasswordChange>
                            <ForcePasswordChangePage />
                        </RequirePasswordChange>
                    }
                />

                {/* Protected routes */}
                <Route
                    path={ROUTES.DASHBOARD}
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.EQUIPMENT}
                    element={
                        <ProtectedRoute>
                            <RequireStaff>
                                <ToolsPage />
                            </RequireStaff>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/equipment/:id"
                    element={
                        <ProtectedRoute>
                            <RequireStaff>
                                <ToolPage />
                            </RequireStaff>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/equipment/:id/schedules/:scheduleId"
                    element={
                        <ProtectedRoute>
                            <RequireStaff>
                                <EquipmentSchedulePage />
                            </RequireStaff>
                        </ProtectedRoute>
                    }
                />
                {/* Backward-compatible aliases for /tools */}
                <Route path={ROUTES.TOOLS} element={<Navigate to={ROUTES.EQUIPMENT} replace />} />
                <Route
                    path="/tools/:id"
                    element={
                        <ProtectedRoute>
                            <RequireStaff>
                                <ToolPage />
                            </RequireStaff>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/tools/:id/schedules/:scheduleId"
                    element={
                        <ProtectedRoute>
                            <RequireStaff>
                                <EquipmentSchedulePage />
                            </RequireStaff>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.LOGOUT}
                    element={
                        <ProtectedRoute>
                            <Logout />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.PROFILE}
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.ACCOUNT}
                    element={
                        <ProtectedRoute>
                            <AccountPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.ADMIN}
                    element={
                        <ProtectedRoute>
                            <RequireAdmin>
                                <AdminDashboard />
                            </RequireAdmin>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.MY_REPORTS}
                    element={
                        <ProtectedRoute>
                            <OperatorReportsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.NOTIFICATIONS}
                    element={
                        <ProtectedRoute>
                            <NotificationsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.MANUALS}
                    element={
                        <ProtectedRoute>
                            <EquipmentBooksPage />
                        </ProtectedRoute>
                    }
                />
                <Route path={ROUTES.BOOKS} element={<Navigate to={ROUTES.MANUALS} replace />} />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );

    // Full-bleed layout for login / force-password-change: no sidebar, rail,
    // or bottom bar, and no reserved space for any of them.
    if (hideNavbar) {
        return (
            <Box component="main" sx={{ minHeight: '100dvh' }}>
                {routedContent}
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex' }}>
            <Navbar onOpenCreateFault={handleOpenGlobalCreateFault} />
            <ForcePasswordChangeDialog />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    minHeight: '100dvh',
                    // Keep phone content clear of the fixed bottom nav bar,
                    // respecting the device's safe-area inset (notch/home
                    // indicator). Sidebar/rail variants take no vertical
                    // space, so sm+ needs no bottom padding.
                    pb: { xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`, sm: 0 },
                }}
            >
                <PullToRefresh onRefresh={refreshPage}>
                    {routedContent}
                </PullToRefresh>
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
                    <LegalFooter />
                </Box>
            </Box>
            <CreateFaultDialog
                open={globalCreateFaultOpen}
                onClose={handleCloseGlobalCreateFault}
                onSubmit={handleGlobalCreateFault}
            />
        </Box>
    );
}

export default function AppRoutes() {
    return (
        <NotificationProvider>
            <AuthProvider>
                <ToolProvider>
                    <FaultProvider>
                        <PageRefreshProvider>
                            <NotificationFeedProvider>
                                <AppLayout />
                                <AccessibilityMenu />
                            </NotificationFeedProvider>
                        </PageRefreshProvider>
                    </FaultProvider>
                </ToolProvider>
            </AuthProvider>
        </NotificationProvider>
    );
}
