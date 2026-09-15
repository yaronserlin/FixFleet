import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';

import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToolProvider } from './contexts/ToolContext';
import { FaultProvider } from './contexts/FaultContext';

import ProtectedRoute from './components/ProtectedRoute';
import RequireAdmin from './components/RequireAdmin';
import Navbar from './components/Navbar';
import LoadingComponent from './components/LoadingComponent/LoadingComponent';

const Dashboard            = lazy(() => import('./pages/Dashboard'));
const ToolPage             = lazy(() => import('./pages/ToolPage'));
const Login                = lazy(() => import('./pages/Login'));
const NotFound             = lazy(() => import('./pages/NotFound'));
const Logout               = lazy(() => import('./pages/Logout'));
const ToolsPage            = lazy(() => import('./pages/ToolsPage'));
const EquipmentSchedulePage = lazy(() => import('./pages/EquipmentSchedulePage'));
const ProfilePage          = lazy(() => import('./pages/ProfilePage'));
const AccountPage          = lazy(() => import('./pages/AccountPage'));
const AdminDashboard       = lazy(() => import('./pages/AdminDashboard'));
const OperatorReportsPage  = lazy(() => import('./pages/OperatorReportsPage'));
const EquipmentBooksPage   = lazy(() => import('./pages/EquipmentBooksPage'));
const ForcePasswordChangePage = lazy(() => import('./pages/ForcePasswordChangePage'));
const LegalPage               = lazy(() => import('./pages/LegalPage'));
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
};

// Top-level route fallback with immediate progress feedback
function RouteFallback() {
    return (
        <Box sx={{ width: '100%' }}>
            <LinearProgress sx={{ height: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <LoadingComponent message="Loading page..." />
            </Box>
        </Box>
    );
}

// Pages that use a full-screen layout (no Navbar)
const HIDE_NAVBAR_PATHS = ['/login', '/force-password-change'];

function RequirePasswordChange({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <LoadingComponent />;
    if (!user) return <Navigate to="/login" replace />;
    if (!user.mustChangePassword) return <Navigate to="/dashboard" replace />;
    return children;
}

function RequireStaff({ children }) {
    const { user } = useAuth();
    if (user?.role === 'operator') {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}

function AppLayout() {
    const location  = useLocation();
    const { user } = useAuth();
    const hideNavbar = HIDE_NAVBAR_PATHS.some(p => location.pathname === p);

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

    return (
        <>
            {!hideNavbar && <Navbar />}
            {!hideNavbar && <ForcePasswordChangeDialog />}
            <Box
                component="main"
                sx={{ flexGrow: 1, minHeight: hideNavbar ? '100dvh' : 'calc(100vh - 64px)' }}
            >
                <Suspense fallback={<RouteFallback />}>
                    <Routes>
                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />

                        {/* Public routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/terms" element={<LegalPage />} />
                        <Route path="/privacy" element={<LegalPage />} />
                        <Route path="/legal" element={<LegalPage />} />
                        <Route
                            path="/force-password-change"
                            element={
                                <RequirePasswordChange>
                                    <ForcePasswordChangePage />
                                </RequirePasswordChange>
                            }
                        />

                        {/* Protected routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/equipment"
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
                        <Route path="/tools" element={<Navigate to="/equipment" replace />} />
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
                            path="/logout"
                            element={
                                <ProtectedRoute>
                                    <Logout />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <ProfilePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/account"
                            element={
                                <ProtectedRoute>
                                    <AccountPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute>
                                    <RequireAdmin>
                                        <AdminDashboard />
                                    </RequireAdmin>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/my-reports"
                            element={
                                <ProtectedRoute>
                                    <OperatorReportsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/manuals"
                            element={
                                <ProtectedRoute>
                                    <EquipmentBooksPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/books" element={<Navigate to="/manuals" replace />} />

                        {/* Fallback */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </Box>
        </>
    );
}

export default function AppRoutes() {
    return (
        <NotificationProvider>
            <AuthProvider>
                <ToolProvider>
                    <FaultProvider>
                        <AppLayout />
                    </FaultProvider>
                </ToolProvider>
            </AuthProvider>
        </NotificationProvider>
    );
}
