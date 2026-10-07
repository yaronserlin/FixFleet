// utils/audit.js
const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/** Snapshot of `req.user` (or any `{ userId|_id, name, email, role }`) for an audit entry. */
function actorFrom(user) {
    if (!user) return null;
    return {
        userId: user.userId || user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
}

/**
 * Records an audit entry for a request. Never throws: an audit write failing
 * must not undo or fail the action it describes, so errors are logged.
 * ponytail: best-effort write; make it transactional with the action if
 * audit completeness ever becomes a compliance requirement.
 *
 * @param {import('express').Request} req - The request; supplies `req.user` (default actor) and `req.ip`.
 * @param {Object} entry
 * @param {string} entry.action - One of constants/audit.js AUDIT_ACTIONS.
 * @param {Object|null} [entry.actor] - Overrides `req.user` (e.g. the account a signup just created); pass null for anonymous.
 * @param {*} [entry.companyId] - The tenant concerned, if any.
 * @param {{ type: string, id: *, label?: string }} [entry.target]
 * @param {Object} [entry.metadata]
 * @returns {Promise<void>}
 */
async function recordAudit(req, { action, actor, companyId = null, target = null, metadata = {} }) {
    try {
        await AuditLog.create({
            action,
            actor: actorFrom(actor === undefined ? req.user : actor),
            companyId: companyId || null,
            target: target ? { type: target.type, id: String(target.id), label: target.label } : null,
            metadata,
            ip: req.ip || null,
        });
    } catch (err) {
        logger.error(`Failed to record audit entry "${action}": ${err.message}`);
    }
}

/** Audit target for a user document/summary. */
const userTarget = (user) => ({ type: 'user', id: user._id, label: user.email });

/** Audit target for a company document. */
const companyTarget = (company) => ({ type: 'company', id: company._id, label: company.name });

module.exports = { recordAudit, userTarget, companyTarget };
