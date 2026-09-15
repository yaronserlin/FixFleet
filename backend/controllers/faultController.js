// controllers/faultController.js
const Fault = require('../models/Fault');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const Tool = require('../models/Tool');
const { syncEquipmentEngineHours } = require('../utils/equipmentEngineHours');

exports.getAllFaults = async (req, res, next) => {
    try {
        const { page, limit, status } = req.query;
        const query = { companyId: req.user.companyId };
        if (status) {
            query.status = status;
        }

        if (page || limit) {
            const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
            const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
            const skip = (pageNum - 1) * limitNum;

            const [faults, total] = await Promise.all([
                Fault.find(query)
                    .populate('tool', 'name serialNumber model')
                    .populate('operator', 'name email role')
                    .populate('resolvedBy', 'name email role')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Fault.countDocuments(query),
            ]);

            return res.json({
                faults,
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            });
        }

        const faults = await Fault.find(query)
            .populate('tool', 'name serialNumber model')
            .populate('operator', 'name email role')
            .populate('resolvedBy', 'name email role')
            .sort({ createdAt: -1 });

        res.json(faults);
    } catch (err) {
        next(err);
    }
};

exports.getFaultById = async (req, res, next) => {
    try {
        const fault = await Fault.findOne({ _id: req.params.id, companyId: req.user.companyId })
            .populate('tool')
            .populate('operator', 'name email role')
            .populate('resolvedBy', 'name email role');

        if (!fault) {
            return res.status(404).json({ message: 'Fault not found' });
        }
        res.json(fault);
    } catch (err) {
        next(err);
    }
};

exports.createFault = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const { tool: toolId, description, code, photos: bodyPhotos, engineHours } = req.body;

        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return res.status(400).json({ message: 'Description is required' });
        }

        if (!toolId) {
            return res.status(400).json({ message: 'Tool reference is required' });
        }

        // Validate that the tool belongs to this company
        const tool = await Tool.findOne({ _id: toolId, companyId: req.user.companyId });
        if (!tool) {
            return res.status(400).json({ message: 'Referenced tool does not exist in your organization' });
        }

        // Gather uploaded photo paths / filenames
        const uploadedPhotos = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

        // Parse any photo URLs sent in the body
        let additionalPhotos = [];
        if (bodyPhotos) {
            if (Array.isArray(bodyPhotos)) {
                additionalPhotos = bodyPhotos.filter(p => typeof p === 'string' && p.trim().length > 0);
            } else if (typeof bodyPhotos === 'string') {
                additionalPhotos = bodyPhotos.split(',').map(s => s.trim()).filter(Boolean);
            }
        }

        const allPhotos = [...uploadedPhotos, ...additionalPhotos];

        const parsedHours = engineHours !== undefined && engineHours !== '' ? parseFloat(engineHours) : undefined;
        const validHours = parsedHours !== undefined && !isNaN(parsedHours) && parsedHours >= 0 ? parsedHours : undefined;

        const fault = await Fault.create({
            companyId: req.user.companyId,
            tool: tool._id,
            operator: req.user.userId,
            description: description.trim(),
            code: code && typeof code === 'string' ? code.trim() : undefined,
            engineHours: validHours,
            photos: allPhotos,
            status: 'open',
        });

        // Atomically push fault into Tool backref without modifying currentEngineHours.
        // Machine engine hours are only updated when a mechanic/admin resolves the fault and only if higher.
        const toolUpdates = { $push: { faults: fault._id } };
        await Tool.findOneAndUpdate(
            { _id: tool._id, companyId: req.user.companyId },
            toolUpdates
        );

        const populatedFault = await Fault.findById(fault._id)
            .populate('tool', 'name serialNumber model currentEngineHours')
            .populate('operator', 'name email role')
            .populate('resolvedBy', 'name email role');

        res.status(201).json(populatedFault);
    } catch (err) {
        next(err);
    }
};

exports.closeFault = async (req, res, next) => {
    try {
        const { engineHours, resolutionDescription, notes, description: closingDesc } = req.body || {};
        const parsedHours = engineHours !== undefined && engineHours !== '' ? parseFloat(engineHours) : null;
        const validHours = parsedHours !== null && !isNaN(parsedHours) && parsedHours >= 0 ? parsedHours : null;
        const resText = resolutionDescription || notes || closingDesc || '';

        const updateData = {
            status: 'closed',
            closedAt: new Date(),
            resolvedBy: req.user.userId,
            resolutionDescription: typeof resText === 'string' ? resText.trim() : '',
        };
        if (validHours !== null) {
            updateData.closingEngineHours = validHours;
        }

        const fault = await Fault.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            updateData,
            { new: true, runValidators: true }
        ).populate('tool operator resolvedBy');

        if (!fault) {
            return res.status(404).json({ message: 'Fault not found' });
        }

        // Update equipment's currentEngineHours to the highest recorded value in resolved faults or services
        // (only updates if validHours is higher than current hours)
        if (fault.tool) {
            const toolId = fault.tool._id || fault.tool;
            await syncEquipmentEngineHours(toolId, req.user.companyId, validHours);
        }

        res.json(fault);
    } catch (err) {
        next(err);
    }
};

exports.reopenFault = async (req, res, next) => {
    try {
        const fault = await Fault.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            {
                status: 'open',
                $unset: { closedAt: 1, closingEngineHours: 1, resolutionDescription: 1, resolvedBy: 1 },
            },
            { new: true, runValidators: true }
        ).populate('tool operator resolvedBy');

        if (!fault) {
            return res.status(404).json({ message: 'Fault not found' });
        }

        if (fault.tool) {
            const toolId = fault.tool._id || fault.tool;
            await syncEquipmentEngineHours(toolId, req.user.companyId);
        }

        res.json(fault);
    } catch (err) {
        next(err);
    }
};

exports.deleteFault = async (req, res, next) => {
    try {
        const fault = await Fault.findOneAndDelete({
            _id: req.params.id,
            companyId: req.user.companyId,
        });

        if (!fault) {
            return res.status(404).json({ message: 'Fault not found' });
        }

        if (fault.tool) {
            const toolId = fault.tool._id || fault.tool;
            await Tool.findOneAndUpdate(
                { _id: toolId, companyId: req.user.companyId },
                { $pull: { faults: fault._id } }
            );
            await syncEquipmentEngineHours(toolId, req.user.companyId);
        }

        res.json({ message: 'Fault deleted successfully' });
    } catch (err) {
        next(err);
    }
};

exports.updateFault = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const updates = {};
        if (req.body.description && typeof req.body.description === 'string' && req.body.description.trim()) {
            updates.description = req.body.description.trim();
        }
        if (req.body.code !== undefined) {
            updates.code = typeof req.body.code === 'string' ? req.body.code.trim() : req.body.code;
        }
        if (req.body.engineHours !== undefined && req.body.engineHours !== '') {
            const parsed = parseFloat(req.body.engineHours);
            if (!isNaN(parsed) && parsed >= 0) {
                updates.engineHours = parsed;
            }
        }
        if (req.body.resolutionDescription !== undefined) {
            updates.resolutionDescription = typeof req.body.resolutionDescription === 'string' ? req.body.resolutionDescription.trim() : '';
        }
        if (req.body.status && ['open', 'closed'].includes(req.body.status)) {
            updates.status = req.body.status;
            if (updates.status === 'closed') {
                updates.closedAt = new Date();
                updates.resolvedBy = req.user.userId;
            } else {
                updates.$unset = { closedAt: 1, closingEngineHours: 1, resolutionDescription: 1, resolvedBy: 1 };
            }
        }

        const fault = await Fault.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            updates,
            { new: true, runValidators: true }
        ).populate('tool', 'name serialNumber model currentEngineHours')
         .populate('operator', 'name email role')
         .populate('resolvedBy', 'name email role');

        if (!fault) {
            return res.status(404).json({ message: 'Fault not found' });
        }

        if (fault.tool) {
            const toolId = fault.tool._id || fault.tool;
            await syncEquipmentEngineHours(toolId, req.user.companyId);
        }

        res.json(fault);
    } catch (err) {
        next(err);
    }
};