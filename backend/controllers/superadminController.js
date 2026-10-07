// controllers/superadminController.js
const superadminService = require('../services/superadminService');
const notificationService = require('../services/notificationService');
const { recordAudit, userTarget, companyTarget } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../constants/audit');

/**
 * Wraps a service call as an Express handler that responds with its result
 * as JSON (with `status`), or 204 when it returns nothing, forwarding any
 * thrown error to `next`.
 */
const handle = (fn, status = 200) => async (req, res, next) => {
    try {
        const result = await fn(req);
        if (result === undefined) {
            res.status(204).end();
        } else {
            res.status(status).json(result);
        }
    } catch (err) {
        next(err);
    }
};

/** GET /api/superadmin/stats - Platform-wide KPIs and trends. */
exports.getStats = handle(() => superadminService.getStats());

/** GET /api/superadmin/companies - Every company with usage counts. */
exports.listCompanies = handle(req => superadminService.listCompanies(req.query));

/** GET /api/superadmin/companies/:id - One company and its users. */
exports.getCompany = handle(req => superadminService.getCompany(req.params.id));

/** PATCH /api/superadmin/companies/:id/status - Activates or deactivates a company. Body: `{ isActive }`. */
exports.setCompanyStatus = handle(async (req) => {
    const company = await superadminService.setCompanyActive(req.params.id, req.body);
    await recordAudit(req, {
        action: company.isActive ? AUDIT_ACTIONS.COMPANY_ACTIVATED : AUDIT_ACTIONS.COMPANY_DEACTIVATED,
        companyId: company._id,
        target: companyTarget(company),
    });
    return company;
});

/** GET /api/superadmin/users - Tenant users across all companies (paginated, filterable). */
exports.listUsers = handle(req => superadminService.listUsers(req.query));

/** PATCH /api/superadmin/users/:id/role - Changes a tenant user's role. Body: `{ role }`. */
exports.updateUserRole = handle(async (req) => {
    const { user, previousRole } = await superadminService.updateUserRole(req.user.userId, req.params.id, req.body);
    await recordAudit(req, {
        action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
        companyId: user.companyId,
        target: userTarget(user),
        metadata: { from: previousRole, to: user.role },
    });
    return user;
});

/** POST /api/superadmin/users/:id/reset-password - Issues a one-time temporary password. */
exports.resetUserPassword = handle(async (req) => {
    const { temporaryPassword, user } = await superadminService.resetUserPassword(req.params.id);
    await recordAudit(req, {
        action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
        companyId: user.companyId,
        target: userTarget(user),
    });
    return { temporaryPassword };
});

/** DELETE /api/superadmin/users/:id - Deletes a tenant user. */
exports.deleteUser = handle(async (req) => {
    const deleted = await superadminService.deleteUser(req.user.userId, req.params.id);
    await recordAudit(req, {
        action: AUDIT_ACTIONS.USER_DELETED,
        companyId: deleted.companyId,
        target: userTarget(deleted),
        metadata: { role: deleted.role },
    });
});

/** POST /api/superadmin/announcements - Broadcasts across companies. Body: `{ title, body, roles?, companyIds? }`. */
exports.sendAnnouncement = handle(async (req) => {
    const result = await notificationService.createPlatformAnnouncement(req.user, req.body);
    await recordAudit(req, {
        action: AUDIT_ACTIONS.PLATFORM_ANNOUNCEMENT,
        metadata: { title: req.body.title.trim(), ...result },
    });
    return result;
}, 201);

/** GET /api/superadmin/audit-logs - Audit trail (paginated; filter by action, company, search). */
exports.listAuditLogs = handle(req => superadminService.listAuditLogs(req.query));
