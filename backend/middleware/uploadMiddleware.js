// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    /**
     * Always writes uploaded files to the shared `backend/uploads/` directory.
     * @param {import('express').Request} req - Express request (unused).
     * @param {Express.Multer.File} file - The incoming file (unused).
     * @param {(error: Error|null, destination: string) => void} cb - Multer callback.
     * @returns {void}
     */
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    /**
     * Generates a collision-resistant filename: a `book-`/`photo-` prefix
     * based on mime type, a timestamp + random suffix for uniqueness, and
     * the original file's extension (lowercased).
     * @param {import('express').Request} req - Express request (unused).
     * @param {Express.Multer.File} file - The incoming file; reads `mimetype` and `originalname`.
     * @param {(error: Error|null, filename: string) => void} cb - Multer callback.
     * @returns {void}
     */
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const prefix = file.mimetype === 'application/pdf' ? 'book' : 'photo';
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
});

/**
 * Restricts uploads to jpeg/png/webp/gif images and PDF documents by mime
 * type. Rejecting via `cb(new Error(...), false)` surfaces as a request
 * error that the global error handler (middleware/errorMiddleware.js)
 * turns into a response (see its "Unhandled server error" fallback path,
 * since this isn't a `MulterError`).
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
        cb(new Error('Only image files (jpeg, png, webp, gif) and PDF documents are allowed'), false);
    }
};

/**
 * Configured multer instance used by every file-upload route (avatars,
 * fault photos, equipment book PDFs): disk storage under `backend/uploads/`
 * with collision-resistant filenames, a 50MB per-file size limit, and the
 * jpeg/png/webp/gif/PDF mime-type filter above. Routes call `.single(field)`
 * or `.array(field, maxCount)` on this instance (see routes/*.js).
 * @type {import('multer').Multer}
 */
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
});

module.exports = upload;
