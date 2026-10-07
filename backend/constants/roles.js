// constants/roles.js

/**
 * User role identifiers, matching the `role` enum on the User schema
 * (see models/User.js). Centralized here so role checks and role lists
 * never drift from the schema's allowed values.
 *
 * `SUPERADMIN` is a platform-level role with no company: it is deliberately
 * left out of {@link ALL_ROLES} (the tenant roles), so no company admin can
 * ever assign it through the role-change or announcement validators.
 *
 * @type {{ OPERATOR: 'operator', MECHANIC: 'mechanic', ADMIN: 'admin', SUPERADMIN: 'superadmin' }}
 */
const ROLES = Object.freeze({
    OPERATOR: 'operator',
    MECHANIC: 'mechanic',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin',
});

/**
 * All tenant (company-scoped) role values. Excludes `superadmin`.
 * @type {string[]}
 */
const ALL_ROLES = Object.freeze([ROLES.OPERATOR, ROLES.MECHANIC, ROLES.ADMIN]);

/**
 * Every value the User schema's `role` enum accepts: the tenant roles plus
 * the platform-level superadmin.
 * @type {string[]}
 */
const USER_SCHEMA_ROLES = Object.freeze([...ALL_ROLES, ROLES.SUPERADMIN]);

/**
 * Roles permitted to perform mechanic-or-admin-gated actions (e.g. equipment
 * books, maintenance schedules).
 * @type {string[]}
 */
const MECHANIC_OR_ADMIN_ROLES = Object.freeze([ROLES.MECHANIC, ROLES.ADMIN]);

/**
 * Default role assigned to a new user created by a company admin.
 * @type {string}
 */
const DEFAULT_ROLE = ROLES.OPERATOR;

module.exports = { ROLES, ALL_ROLES, USER_SCHEMA_ROLES, MECHANIC_OR_ADMIN_ROLES, DEFAULT_ROLE };
