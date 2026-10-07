// services/superadminService.js
//
// Platform-level (cross-company) operations for the `superadmin` role. Every
// other service is tenant-scoped by `req.user.companyId`; these deliberately
// are not, and they report on the platform itself (companies, accounts,
// activity, storage, audit) rather than tenants' operational data. Server-built
// `$` filters go through mongoose.trusted() because of the global
// `sanitizeFilter` (config/db.js).
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');
const userService = require('./userService');
const { ROLES, ALL_ROLES } = require('../constants/roles');
const { ALL_AUDIT_ACTIONS } = require('../constants/audit');
const { BCRYPT_SALT_ROUNDS } = require('../constants/auth');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const { httpError } = require('../utils/httpError');

const MONTHS_OF_HISTORY = 12;
const TOP_COMPANIES = 10;
const DORMANT_SAMPLE = 5;
/** A user counts as active, and a company as not dormant, within this window. */
const ACTIVE_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** GridFS files collection used by utils/mediaStorage.js (bucketName 'uploads'). */
const UPLOADS_FILES_COLLECTION = 'uploads.files';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive "contains" regex for a search box value, or null if blank/not a string. */
function searchRegex(search) {
    if (typeof search !== 'string' || !search.trim()) return null;
    return new RegExp(escapeRegex(search.trim()), 'i');
}

/** Pagination params from a raw query, clamped to constants/pagination.js. */
function pageParams(query) {
    const page = Math.max(DEFAULT_PAGE, parseInt(query.page, 10) || DEFAULT_PAGE);
    const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(query.limit, 10) || DEFAULT_LIMIT));
    return { page, limit, skip: (page - 1) * limit };
}

/** Filter matching tenant accounts only (every role except superadmin). */
const tenantUsersFilter = () => ({ role: mongoose.trusted({ $in: ALL_ROLES }) });

/** Counts per month (`YYYY-MM`) since `since`, as a zero-filled, oldest-first series. */
async function monthlyCounts(Model, since, match = {}) {
    const rows = await Model.aggregate([
        { $match: { ...match, createdAt: mongoose.trusted({ $gte: since }) } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]);
    const byMonth = new Map(rows.map(r => [r._id, r.count]));

    const series = [];
    for (let i = 0; i < MONTHS_OF_HISTORY; i += 1) {
        const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
        const month = d.toISOString().slice(0, 7);
        series.push({ month, count: byMonth.get(month) || 0 });
    }
    return series;
}

/** Per company: number of tenant users and the most recent `lastActiveAt` among them. */
async function userActivityByCompany() {
    const rows = await User.aggregate([
        { $match: tenantUsersFilter() },
        { $group: { _id: '$companyId', userCount: { $sum: 1 }, lastActiveAt: { $max: '$lastActiveAt' } } },
    ]);
    return new Map(rows.map(r => [String(r._id), { userCount: r.userCount, lastActiveAt: r.lastActiveAt || null }]));
}

/**
 * Platform-wide KPIs and trends for the superadmin dashboard: companies,
 * accounts, activity, growth and storage. Deliberately excludes tenants'
 * operational data (equipment, faults, maintenance).
 *
 * @returns {Promise<{
 *   totals: { companies: number, activeCompanies: number, newCompaniesThisMonth: number, users: number, newUsersThisMonth: number, activeUsers: number, storageBytes: number, storedFiles: number },
 *   activeWindowDays: number,
 *   companiesPerMonth: Array<{ month: string, count: number }>,
 *   usersPerMonth: Array<{ month: string, count: number }>,
 *   largestCompanies: Array<{ companyId: string, name: string, users: number }>,
 *   attention: { inactiveCompanies: number, dormantCompanies: number, dormantSample: Array<{ _id: string, name: string, lastActiveAt: Date|null }> }
 * }>}
 */
async function getStats() {
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_OF_HISTORY - 1), 1));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);

    const [
        companies,
        activeCompanyDocs,
        newCompaniesThisMonth,
        users,
        newUsersThisMonth,
        activeUsers,
        companiesPerMonth,
        usersPerMonth,
        activity,
        storageRows,
    ] = await Promise.all([
        Company.countDocuments(),
        Company.find({ isActive: true }).select('name').lean(),
        Company.countDocuments({ createdAt: mongoose.trusted({ $gte: monthStart }) }),
        User.countDocuments(tenantUsersFilter()),
        User.countDocuments({ ...tenantUsersFilter(), createdAt: mongoose.trusted({ $gte: monthStart }) }),
        User.countDocuments({ ...tenantUsersFilter(), lastActiveAt: mongoose.trusted({ $gte: activeSince }) }),
        monthlyCounts(Company, since),
        monthlyCounts(User, since, tenantUsersFilter()),
        userActivityByCompany(),
        mongoose.connection.db.collection(UPLOADS_FILES_COLLECTION).aggregate([
            { $group: { _id: null, bytes: { $sum: '$length' }, files: { $sum: 1 } } },
        ]).toArray(),
    ]);

    const companyNames = new Map(activeCompanyDocs.map(c => [String(c._id), c.name]));
    const largestCompanies = [...activity.entries()]
        .filter(([id]) => companyNames.has(id))
        .sort((a, b) => b[1].userCount - a[1].userCount)
        .slice(0, TOP_COMPANIES)
        .map(([id, a]) => ({ companyId: id, name: companyNames.get(id), users: a.userCount }));

    // Active companies where nobody has signed in or refreshed a session lately.
    const dormant = activeCompanyDocs
        .map(c => ({ _id: String(c._id), name: c.name, lastActiveAt: activity.get(String(c._id))?.lastActiveAt || null }))
        .filter(c => !c.lastActiveAt || c.lastActiveAt < activeSince)
        .sort((a, b) => (a.lastActiveAt || 0) - (b.lastActiveAt || 0));

    return {
        totals: {
            companies,
            activeCompanies: activeCompanyDocs.length,
            newCompaniesThisMonth,
            users,
            newUsersThisMonth,
            activeUsers,
            storageBytes: storageRows[0]?.bytes || 0,
            storedFiles: storageRows[0]?.files || 0,
        },
        activeWindowDays: ACTIVE_WINDOW_DAYS,
        companiesPerMonth,
        usersPerMonth,
        largestCompanies,
        attention: {
            inactiveCompanies: companies - activeCompanyDocs.length,
            dormantCompanies: dormant.length,
            dormantSample: dormant.slice(0, DORMANT_SAMPLE),
        },
    };
}

/**
 * Lists every company with its account count and last activity, newest first.
 *
 * @param {{ search?: string }} [query] - Raw query params; `search` matches name or slug.
 * @returns {Promise<Array<Object>>} Companies with `userCount` and `lastActiveAt` (null if nobody ever signed in).
 */
async function listCompanies(query = {}) {
    const regex = searchRegex(query.search);
    // Built here from an escaped regex, not raw request input.
    const filter = regex ? mongoose.trusted({ $or: [{ name: regex }, { slug: regex }] }) : {};

    const [companies, activity] = await Promise.all([
        Company.find(filter).sort({ createdAt: -1 }).lean(),
        userActivityByCompany(),
    ]);

    return companies.map(c => {
        const a = activity.get(String(c._id));
        return { ...c, userCount: a?.userCount || 0, lastActiveAt: a?.lastActiveAt || null };
    });
}

/**
 * Fetches one company and its users.
 *
 * @param {string} companyId
 * @throws {Error & { status: number }} 404 if the company doesn't exist.
 * @returns {Promise<{ company: Object, users: Array<Object> }>}
 */
async function getCompany(companyId) {
    const company = await Company.findById(companyId).lean();
    if (!company) {
        throw httpError(404, 'Company not found');
    }
    const users = await User.find({ companyId }).select('-password').sort({ createdAt: -1 }).lean();
    return { company, users };
}

/**
 * Activates or deactivates a company. Deactivating revokes every refresh
 * token in the company; outstanding access tokens stop working on their next
 * request, since verifyToken reloads the company each time.
 *
 * @param {string} companyId
 * @param {{ isActive?: boolean }} body - Raw request body.
 * @throws {Error & { status: number }} 400 if `isActive` isn't a boolean; 404 if the company doesn't exist.
 * @returns {Promise<Object>} The updated company.
 */
async function setCompanyActive(companyId, body) {
    const { isActive } = body || {};
    if (typeof isActive !== 'boolean') {
        throw httpError(400, 'isActive must be true or false');
    }

    const company = await Company.findByIdAndUpdate(companyId, { isActive }, { new: true }).lean();
    if (!company) {
        throw httpError(404, 'Company not found');
    }

    if (!isActive) {
        await RefreshToken.updateMany({ companyId }, { isRevoked: true });
    }
    return company;
}

/**
 * Lists tenant users across all companies (superadmins excluded), newest
 * first, paginated.
 *
 * @param {{ search?: string, companyId?: string, role?: string, page?: string|number, limit?: string|number }} [query] - Raw query params.
 * @throws {Error & { status: number }} 400 for an invalid `companyId` or `role` filter.
 * @returns {Promise<{ users: Array<Object>, page: number, limit: number, total: number, pages: number }>}
 */
async function listUsers(query = {}) {
    const { search, companyId, role } = query;
    const { page, limit, skip } = pageParams(query);

    // Every `$` operator here is built from validated values, hence mongoose.trusted().
    const filter = tenantUsersFilter();
    if (role !== undefined && role !== '') {
        if (typeof role !== 'string' || !ALL_ROLES.includes(role)) {
            throw httpError(400, `Role must be one of: ${ALL_ROLES.join(', ')}`);
        }
        filter.role = role;
    }
    if (companyId !== undefined && companyId !== '') {
        if (typeof companyId !== 'string' || !mongoose.isValidObjectId(companyId)) {
            throw httpError(400, 'Invalid company id');
        }
        filter.companyId = companyId;
    }
    const regex = searchRegex(search);
    if (regex) {
        filter.$or = [{ name: regex }, { email: regex }];
    }

    const trustedFilter = mongoose.trusted(filter);
    const [users, total] = await Promise.all([
        User.find(trustedFilter)
            .select('-password')
            .populate('companyId', 'name slug isActive')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(trustedFilter),
    ]);

    return { users, page, limit, total, pages: Math.ceil(total / limit) };
}

/** Loads a tenant user by id, refusing superadmins (they're managed by the CLI only). */
async function findTenantUser(userId) {
    const user = await User.findById(userId);
    if (!user || user.role === ROLES.SUPERADMIN) {
        throw httpError(404, 'User not found');
    }
    return user;
}

/**
 * Changes any tenant user's role, keeping the company's last-admin guard by
 * delegating to the tenant-scoped userService with the user's own company.
 *
 * @param {string} actingUserId - The superadmin making the change.
 * @param {string} targetUserId
 * @param {{ role?: string }} body - Raw request body.
 * @returns {Promise<{ user: Object, previousRole: string }>} The updated user (without `password`) and its role before the change.
 */
async function updateUserRole(actingUserId, targetUserId, body) {
    const target = await findTenantUser(targetUserId);
    return userService.updateUserRole(target.companyId, actingUserId, targetUserId, body);
}

/**
 * Deletes any tenant user, keeping the company's last-admin guard.
 *
 * @param {string} actingUserId - The superadmin making the change.
 * @param {string} targetUserId
 * @returns {Promise<{ _id: *, name: string, email: string, role: string, companyId: * }>} The deleted user.
 */
async function deleteUser(actingUserId, targetUserId) {
    const target = await findTenantUser(targetUserId);
    return userService.deleteUser(target.companyId, actingUserId, targetUserId);
}

/**
 * Replaces a tenant user's password with a random temporary one, forces a
 * change at next login, and signs out all of their sessions.
 *
 * @param {string} targetUserId
 * @returns {Promise<{ temporaryPassword: string, user: { _id: *, name: string, email: string, companyId: * } }>} The temporary password (to be shown only once) and whose it is.
 */
async function resetUserPassword(targetUserId) {
    const target = await findTenantUser(targetUserId);
    const temporaryPassword = crypto.randomBytes(9).toString('base64url');

    target.password = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);
    target.mustChangePassword = true;
    await target.save();
    await RefreshToken.updateMany({ userId: target._id }, { isRevoked: true });

    return {
        temporaryPassword,
        user: { _id: target._id, name: target.name, email: target.email, companyId: target.companyId },
    };
}

/**
 * Lists audit entries newest first, paginated and filterable.
 *
 * @param {{ action?: string, companyId?: string, search?: string, page?: string|number, limit?: string|number }} [query] - Raw query params; `search` matches the actor's name/email, the target label, or a failed login's email.
 * @throws {Error & { status: number }} 400 for an unknown `action` or invalid `companyId`.
 * @returns {Promise<{ logs: Array<Object>, page: number, limit: number, total: number, pages: number }>}
 */
async function listAuditLogs(query = {}) {
    const { action, companyId, search } = query;
    const { page, limit, skip } = pageParams(query);

    const filter = {};
    if (action !== undefined && action !== '') {
        if (typeof action !== 'string' || !ALL_AUDIT_ACTIONS.includes(action)) {
            throw httpError(400, 'Unknown audit action');
        }
        filter.action = action;
    }
    if (companyId !== undefined && companyId !== '') {
        if (typeof companyId !== 'string' || !mongoose.isValidObjectId(companyId)) {
            throw httpError(400, 'Invalid company id');
        }
        filter.companyId = companyId;
    }
    const regex = searchRegex(search);
    if (regex) {
        // metadata.email: the address tried on a failed login (no actor then).
        filter.$or = [{ 'actor.name': regex }, { 'actor.email': regex }, { 'target.label': regex }, { 'metadata.email': regex }];
    }

    // Built here from validated values and an escaped regex.
    const trustedFilter = mongoose.trusted(filter);
    const [logs, total] = await Promise.all([
        AuditLog.find(trustedFilter)
            .populate('companyId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        AuditLog.countDocuments(trustedFilter),
    ]);

    return { logs, page, limit, total, pages: Math.ceil(total / limit) };
}

module.exports = {
    getStats,
    listCompanies,
    getCompany,
    setCompanyActive,
    listUsers,
    updateUserRole,
    deleteUser,
    resetUserPassword,
    listAuditLogs,
};
