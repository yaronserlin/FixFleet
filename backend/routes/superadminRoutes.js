// routes/superadminRoutes.js
const express = require('express');
const { verifyToken, ensureSuperAdmin } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');
const {
    getStats,
    listCompanies,
    getCompany,
    setCompanyStatus,
    listUsers,
    updateUserRole,
    resetUserPassword,
    deleteUser,
    sendAnnouncement,
    listAuditLogs,
} = require('../controllers/superadminController');

const router = express.Router();

// Apply auth + superadmin check to every /api/superadmin/* route
router.use(verifyToken, ensureSuperAdmin);

router.get('/stats', getStats);

// Company management
router.get('/companies', listCompanies);
router.get('/companies/:id', validateObjectId('id'), getCompany);
router.patch('/companies/:id/status', validateObjectId('id'), setCompanyStatus);

// Cross-company user management
router.get('/users', listUsers);
router.patch('/users/:id/role', validateObjectId('id'), updateUserRole);
router.post('/users/:id/reset-password', validateObjectId('id'), resetUserPassword);
router.delete('/users/:id', validateObjectId('id'), deleteUser);

router.post('/announcements', sendAnnouncement);

router.get('/audit-logs', listAuditLogs);

module.exports = router;
