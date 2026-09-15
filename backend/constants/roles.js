// constants/roles.js

/**
 * User role identifiers, matching the `role` enum on the User schema
 * (see models/User.js). Centralized here so role checks and role lists
 * never drift from the schema's allowed values.
 *
 * @type {{ OPERATOR: 'operator', MECHANIC: 'mechanic', ADMIN: 'admin' }}
 */
const ROLES = Object.freeze({
    OPERATOR: 'operator',
    MECHANIC: 'mechanic',
    ADMIN: 'admin',
});

/**
 * All valid role values, in the same order as the User schema's enum.
 * @type {string[]}
 */
const ALL_ROLES = Object.freeze([ROLES.OPERATOR, ROLES.MECHANIC, ROLES.ADMIN]);

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

module.exports = { ROLES, ALL_ROLES, MECHANIC_OR_ADMIN_ROLES, DEFAULT_ROLE };
