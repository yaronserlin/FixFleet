// constants/audit.js

/**
 * Audit-log action identifiers. Mirrored in frontend/src/constants/audit.js
 * for display labels; add new actions in both places.
 */
const AUDIT_ACTIONS = Object.freeze({
    COMPANY_REGISTERED: 'company.registered',
    COMPANY_ACTIVATED: 'company.activated',
    COMPANY_DEACTIVATED: 'company.deactivated',
    USER_CREATED: 'user.created',
    USER_ROLE_CHANGED: 'user.role_changed',
    USER_DELETED: 'user.deleted',
    USER_PASSWORD_RESET: 'user.password_reset',
    ACCOUNT_SELF_DELETED: 'account.self_deleted',
    SUPERADMIN_LOGIN: 'auth.superadmin_login',
    LOGIN_FAILED: 'auth.login_failed',
    PLATFORM_ANNOUNCEMENT: 'announcement.platform_sent',
});

const ALL_AUDIT_ACTIONS = Object.freeze(Object.values(AUDIT_ACTIONS));

/** How long audit entries are kept before MongoDB's TTL monitor removes them. */
const AUDIT_RETENTION_DAYS = 365;

module.exports = { AUDIT_ACTIONS, ALL_AUDIT_ACTIONS, AUDIT_RETENTION_DAYS };
