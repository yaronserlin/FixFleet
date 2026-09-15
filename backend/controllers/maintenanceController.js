// controllers/maintenanceController.js
const Maintenance = require('../models/Maintenance');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const Tool = require('../models/Tool');
const { syncEquipmentEngineHours } = require('../utils/equipmentEngineHours');

exports.getAllMaintenance = async (req, res, next) => {
    try {
        const { page, limit, toolId } = req.query;
        const query = { companyId: req.user.companyId };
        if (toolId) {
            query.tool = toolId;
        }

        if (page || limit) {
            const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
            const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
            const skip = (pageNum - 1) * limitNum;

            const [logs, total] = await Promise.all([
                Maintenance.find(query)
                    .populate('tool', 'name serialNumber model')
                    .populate('mechanic', 'name email')
                    .sort({ date: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Maintenance.countDocuments(query),
            ]);

            return res.json({
                logs,
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            });
        }

        const logs = await Maintenance.find(query)
            .populate('tool', 'name serialNumber model')
            .populate('mechanic', 'name email')
            .sort({ date: -1 });

        res.json(logs);
    } catch (err) {
        next(err);
    }
};

exports.getMaintenanceById = async (req, res, next) => {
    try {
        const record = await Maintenance.findOne({ _id: req.params.id, companyId: req.user.companyId })
            .populate('tool')
            .populate('mechanic', 'name email');

        if (!record) {
            return res.status(404).json({ message: 'Maintenance record not found' });
        }
        res.json(record);
    } catch (err) {
        next(err);
    }
};

exports.createMaintenance = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const { tool: toolId, details, date, engineHours } = req.body;

        if (!details || typeof details !== 'string' || details.trim().length === 0) {
            return res.status(400).json({ message: 'Maintenance details are required' });
        }

        if (!toolId) {
            return res.status(400).json({ message: 'Tool reference is required' });
        }

        const tool = await Tool.findOne({ _id: toolId, companyId: req.user.companyId });
        if (!tool) {
            return res.status(400).json({ message: 'Referenced tool does not exist in your organization' });
        }

        const parsedHours = engineHours !== undefined && engineHours !== '' && engineHours !== null ? parseFloat(engineHours) : null;
        const validHours = parsedHours !== null && !isNaN(parsedHours) && parsedHours >= 0 ? parsedHours : null;

        const maintenancePayload = {
            tool: tool._id,
            mechanic: req.user.userId,
            details: details.trim(),
            date: date ? new Date(date) : new Date(),
            companyId: req.user.companyId,
        };
        if (validHours !== null) {
            maintenancePayload.engineHours = validHours;
        }

        const maintenance = await Maintenance.create(maintenancePayload);

        // Update equipment engine hours to highest reading across resolved faults or services
        await syncEquipmentEngineHours(tool._id, req.user.companyId, validHours);

        const populated = await Maintenance.findById(maintenance._id)
            .populate('tool', 'name serialNumber model currentEngineHours')
            .populate('mechanic', 'name email');

        res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

exports.deleteMaintenance = async (req, res, next) => {
    try {
        const record = await Maintenance.findOneAndDelete({
            _id: req.params.id,
            companyId: req.user.companyId,
        });

        if (!record) {
            return res.status(404).json({ message: 'Maintenance record not found' });
        }

        if (record.tool) {
            await syncEquipmentEngineHours(record.tool, req.user.companyId);
        }

        res.json({ message: 'Maintenance record deleted successfully' });
    } catch (err) {
        next(err);
    }
};