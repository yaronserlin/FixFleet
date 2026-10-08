// routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, ensureMechanicOrAdmin } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');
const {
    getAllMaintenance,
    deleteMaintenance,
} = require('../controllers/maintenanceController');

router.use(verifyToken);

router.get('/', getAllMaintenance);
router.delete('/:id', validateObjectId('id'), ensureMechanicOrAdmin, deleteMaintenance);

module.exports = router;