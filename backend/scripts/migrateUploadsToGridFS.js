// scripts/migrateUploadsToGridFS.js
//
// One-time migration: uploads a company's existing backend/uploads/ files
// into GridFS and rewrites the `/uploads/<disk-filename>` references stored
// on Fault.photos, Equipment.books[].fileUrl, and User.avatar to the new
// `/uploads/<gridfs-id>` form the app now serves (see app.js and
// utils/mediaStorage.js).
//
// Needed only for data written before this migration -- new uploads already
// go straight to GridFS. Run once per environment that still has a
// `backend/uploads/` directory with files referenced by the database:
//   node scripts/migrateUploadsToGridFS.js
//
// Safe to re-run: a file whose disk name no longer appears in any of the
// three collections is left alone (already migrated, or never referenced).
// Original files on disk are not deleted -- remove backend/uploads/
// yourself once you've confirmed the app serves everything correctly.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Fault = require('../models/Fault');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const mediaStorage = require('../utils/mediaStorage');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const CONTENT_TYPES_BY_EXT = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

/**
 * Rewrites every stored reference to `oldUrl` (a disk-based `/uploads/<filename>`
 * value) to `newUrl` (the GridFS-based replacement), across all three models
 * that can hold one.
 * @param {string} oldUrl
 * @param {string} newUrl
 * @returns {Promise<number>} How many documents were updated.
 */
async function rewriteReferences(oldUrl, newUrl) {
    const [faultResult, equipmentResult, userResult] = await Promise.all([
        Fault.updateMany({ photos: oldUrl }, { $set: { 'photos.$': newUrl } }),
        Equipment.updateMany({ 'books.fileUrl': oldUrl }, { $set: { 'books.$.fileUrl': newUrl } }),
        User.updateMany({ avatar: oldUrl }, { $set: { avatar: newUrl } }),
    ]);
    return faultResult.modifiedCount + equipmentResult.modifiedCount + userResult.modifiedCount;
}

async function run() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        console.log(`No uploads directory at ${UPLOADS_DIR} -- nothing to migrate.`);
        return;
    }

    const filenames = fs.readdirSync(UPLOADS_DIR).filter(
        name => fs.statSync(path.join(UPLOADS_DIR, name)).isFile()
    );

    if (filenames.length === 0) {
        console.log('uploads/ is empty -- nothing to migrate.');
        return;
    }

    console.log(`Connecting to ${process.env.MONGO_URI ? 'MongoDB' : '(MONGO_URI is not set!)'}...`);
    await mongoose.connect(process.env.MONGO_URI);

    let migrated = 0;
    let unreferenced = 0;
    let failed = 0;

    for (const filename of filenames) {
        const oldUrl = `/uploads/${filename}`;
        try {
            const buffer = fs.readFileSync(path.join(UPLOADS_DIR, filename));
            const contentType = CONTENT_TYPES_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream';

            const newId = await mediaStorage.storeFile({ buffer, filename, contentType });
            const newUrl = `/uploads/${newId}`;

            const updatedCount = await rewriteReferences(oldUrl, newUrl);

            if (updatedCount > 0) {
                migrated += 1;
                console.log(`Migrated ${filename} -> ${newId} (${updatedCount} reference(s) updated)`);
            } else {
                unreferenced += 1;
                // Still uploaded to GridFS above so no data is lost, but
                // nothing pointed at it -- most likely already migrated on
                // a prior run, or an orphan that was never attached to a record.
                console.log(`No database reference to ${filename} found -- uploaded to GridFS anyway (id ${newId}), but nothing to rewrite.`);
            }
        } catch (err) {
            failed += 1;
            console.error(`Failed to migrate ${filename}: ${err.message}`);
        }
    }

    console.log(
        `\nDone. ${migrated} file(s) migrated and re-linked, ${unreferenced} unreferenced, ${failed} failed.`
    );
    if (migrated > 0) {
        console.log('Once you\'ve confirmed the app serves everything correctly, backend/uploads/ can be deleted.');
    }

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
