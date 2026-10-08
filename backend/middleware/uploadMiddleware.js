// middleware/uploadMiddleware.js
const multer = require('multer');
const { httpError } = require('../utils/httpError');

/**
 * Restricts uploads to jpeg/png/webp/gif images and PDF documents by mime
 * type. A rejected file is passed on as a 400 `httpError`, which the global
 * error handler (middleware/errorMiddleware.js) returns as a client error.
 *
 * @param {import('express').Request} req - Express request (unused).
 * @param {Express.Multer.File} file - The incoming file; reads `mimetype`.
 * @param {(error: Error|null, acceptFile?: boolean) => void} cb - Multer callback.
 * @returns {void}
 */
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(httpError(400, 'Only image files (jpeg, png, webp, gif) and PDF documents are allowed'), false);
    }
};

/**
 * Configured multer instance used by every file-upload route (avatars,
 * fault photos, equipment book PDFs): in-memory storage (`req.file(s).buffer`)
 * with a 50MB per-file size limit and the jpeg/png/webp/gif/PDF mime-type
 * filter above. Routes call `.single(field)` or `.array(field, maxCount)`
 * on this instance (see routes/*.js).
 *
 * Memory, not disk: callers (services/faultService.js, equipmentService.js,
 * authService.js) hand the buffer straight to utils/mediaStorage.js, which
 * persists it to GridFS -- see that module for why disk storage was
 * dropped (it doesn't survive a redeploy on most hosts).
 * @type {import('multer').Multer}
 */
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
});

module.exports = upload;
