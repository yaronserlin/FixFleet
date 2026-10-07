// src/constants/roles.js

/**
 * User role identifiers, matching the `role` enum on the backend User
 * schema (see backend/models/User.js and backend/constants/roles.js).
 * Centralized here so role checks never drift due to a typo'd string
 * literal scattered across components.
 *
 * `SUPERADMIN` is platform-level (no company) and deliberately left out of
 * {@link ALL_ROLES}, which lists the assignable tenant roles.
 *
 * @type {{ OPERATOR: 'operator', MECHANIC: 'mechanic', ADMIN: 'admin', SUPERADMIN: 'superadmin' }}
 */
export const ROLES = Object.freeze({
    OPERATOR: 'operator',
    MECHANIC: 'mechanic',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin',
});

/**
 * All tenant (company-scoped) role values. Excludes superadmin.
 * @type {string[]}
 */
export const ALL_ROLES = Object.freeze([ROLES.OPERATOR, ROLES.MECHANIC, ROLES.ADMIN]);

/**
 * Roles permitted to perform mechanic-or-admin-gated actions (e.g. closing
 * faults, managing equipment books/maintenance schedules).
 * @type {string[]}
 */
export const MECHANIC_OR_ADMIN_ROLES = Object.freeze([ROLES.MECHANIC, ROLES.ADMIN]);

/**
 * Default role for a newly created user.
 * @type {string}
 */
export const DEFAULT_ROLE = ROLES.OPERATOR;

/**
 * True if the given role is mechanic or admin (i.e. staff who can manage
 * equipment/faults, as opposed to an operator who can only report them).
 * @param {string|undefined|null} role
 * @returns {boolean}
 */
export const isMechanicOrAdmin = (role) => MECHANIC_OR_ADMIN_ROLES.includes(role);

/**
 * True if `user` may call the tenant-scoped API (equipment, faults,
 * notifications...): signed in, past the forced password change, and not a
 * superadmin, whom the backend confines to /api/superadmin.
 * @param {{ role?: string, mustChangePassword?: boolean }|null|undefined} user
 * @returns {boolean}
 */
export const canUseTenantApi = (user) =>
    Boolean(user) && !user.mustChangePassword && user.role !== ROLES.SUPERADMIN;
