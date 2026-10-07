// src/constants/audit.js

/**
 * Display info per audit action. Keys mirror backend/constants/audit.js
 * AUDIT_ACTIONS; add new actions in both places. `color` is an MUI Chip
 * color hinting at how much attention the event deserves.
 */
export const AUDIT_ACTION_INFO = Object.freeze({
    'company.registered':         { label: 'Company registered',    color: 'success' },
    'company.activated':          { label: 'Company activated',     color: 'success' },
    'company.deactivated':        { label: 'Company deactivated',   color: 'error' },
    'user.created':               { label: 'User created',          color: 'default' },
    'user.role_changed':          { label: 'Role changed',          color: 'info' },
    'user.deleted':               { label: 'User deleted',          color: 'error' },
    'user.password_reset':        { label: 'Password reset',        color: 'warning' },
    'account.self_deleted':       { label: 'Account deleted',       color: 'error' },
    'auth.superadmin_login':      { label: 'Superadmin sign-in',    color: 'default' },
    'auth.login_failed':          { label: 'Failed sign-in',        color: 'warning' },
    'announcement.platform_sent': { label: 'Platform announcement', color: 'info' },
});

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * One-line, human-readable sentence for an audit entry, e.g.
 * "Megan Carter changed tom@farm.com's role from mechanic to admin".
 * @param {{ action: string, actor?: { name?: string, email?: string }|null, target?: { label?: string }|null, metadata?: Object }} log
 * @returns {string}
 */
export function describeAudit(log) {
    const who = log.actor?.name || log.actor?.email || 'Someone';
    const what = log.target?.label || 'an item';
    const m = log.metadata || {};

    switch (log.action) {
        case 'company.registered': return `${who} registered ${what}`;
        case 'company.activated': return `${who} activated ${what}`;
        case 'company.deactivated': return `${who} deactivated ${what}`;
        case 'user.created': return `${who} created ${what}${m.role ? ` as ${m.role}` : ''}`;
        case 'user.role_changed': return `${who} changed ${what}'s role from ${m.from} to ${m.to}`;
        case 'user.deleted': return `${who} deleted ${what}`;
        case 'user.password_reset': return `${who} reset ${what}'s password`;
        case 'account.self_deleted': return `${who} deleted their own account`;
        case 'auth.superadmin_login': return `${who} signed in`;
        case 'auth.login_failed': return `Failed sign-in for ${m.email || 'an unknown email'}`;
        case 'announcement.platform_sent':
            return `${who} announced "${m.title}" to ${count(m.recipients || 0, 'user', 'users')} in ${count(m.companies || 0, 'company', 'companies')}`;
        default: return `${who}: ${log.action}`;
    }
}
