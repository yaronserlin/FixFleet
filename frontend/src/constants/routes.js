// src/constants/routes.js

/**
 * Static (non-parameterized) app route paths. Centralized so navigate()
 * calls, <Navigate>/<Link> targets, and the <Route path=...> table in
 * routes.jsx can never drift apart from a typo'd literal.
 */
export const ROUTES = Object.freeze({
    HOME: '/',
    LOGIN: '/login',
    LOGOUT: '/logout',
    TERMS: '/terms',
    PRIVACY: '/privacy',
    LEGAL: '/legal',
    FORCE_PASSWORD_CHANGE: '/force-password-change',
    DASHBOARD: '/dashboard',
    EQUIPMENT: '/equipment',
    TOOLS: '/tools',
    PROFILE: '/profile',
    ACCOUNT: '/account',
    ADMIN: '/admin',
    MY_REPORTS: '/my-reports',
    MANUALS: '/manuals',
    BOOKS: '/books',
});

/** Equipment detail page for a given equipment/tool id. */
export const equipmentDetailRoute = (id) => `/equipment/${id}`;

/** Equipment maintenance schedule detail page. */
export const equipmentScheduleRoute = (id, scheduleId) => `/equipment/${id}/schedules/${scheduleId}`;

/** Equipment detail page pre-selected to a given tab (see EquipmentPage's resolveTab). */
export const equipmentDetailTabRoute = (id, tab) => `/equipment/${id}?tab=${tab}`;
