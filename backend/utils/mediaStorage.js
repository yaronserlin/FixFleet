// utils/mediaStorage.js
const mongoose = require('mongoose');
const { Readable } = require('stream');

/**
 * Uploaded-file storage backed by MongoDB GridFS, replacing what used to be
 * `backend/uploads/` on local disk. Disk storage doesn't survive a redeploy
 * on most hosts (the filesystem is ephemeral), which was silently deleting
 * every fault photo, equipment manual, and avatar on each release -- GridFS
 * lives in the same database as everything else, so it's backed up and
 * persisted the same way.
 *
 * Bucket name 'uploads' keeps the Mongo collections (`uploads.files`,
 * `uploads.chunks`) recognizable, and matches the `/uploads/:id` route in
 * app.js that serves them. Files are keyed by their GridFS ObjectId, not a
 * generated filename -- the id itself is what gets stored in
 * `Fault.photos`, `Equipment.books[].fileUrl`, and `User.avatar` (as
 * `/uploads/<id>`).
 */

let bucket = null;

/**
 * Lazily creates the GridFSBucket on the active mongoose connection. Lazy
 * because the connection isn't open yet when this module first loads
 * (config/db.js connects after requiring the app).
 * @returns {import('mongodb').GridFSBucket}
 */
function getBucket() {
    if (!bucket) {
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    }
    return bucket;
}

/**
 * Stores a buffer in GridFS.
 * @param {{ buffer: Buffer, filename: string, contentType?: string }} params
 * @returns {Promise<string>} The new file's id, as a string.
 */
function storeFile({ buffer, filename, contentType }) {
    return new Promise((resolve, reject) => {
        const uploadStream = getBucket().openUploadStream(filename, { contentType });
        Readable.from(buffer)
            .pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => resolve(uploadStream.id.toString()));
    });
}

/**
 * Looks up a file's metadata without reading its content -- used to set
 * response headers (`Content-Type`, `Content-Length`) before streaming it,
 * and to check existence.
 * @param {string} id - GridFS file id.
 * @returns {Promise<Object|null>} The GridFS file document, or null if `id` is malformed or not found.
 */
async function getFileInfo(id) {
    if (!mongoose.isValidObjectId(id)) {
        return null;
    }
    const files = await getBucket().find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
    return files[0] || null;
}

/**
 * Opens a readable stream of a file's content. Callers should confirm the
 * file exists first with {@link getFileInfo} -- a stream for a missing id
 * emits an 'error' event rather than throwing synchronously.
 * @param {string} id - GridFS file id.
 * @returns {import('stream').Readable}
 */
function openDownloadStream(id) {
    return getBucket().openDownloadStream(new mongoose.Types.ObjectId(id));
}

/**
 * Deletes a file. Idempotent: an already-missing or malformed id is a
 * no-op rather than a rejection, since callers use this for best-effort
 * cleanup (e.g. removing the old avatar when a new one is uploaded).
 * @param {string} id - GridFS file id.
 * @returns {Promise<void>}
 */
async function deleteFile(id) {
    if (!mongoose.isValidObjectId(id)) {
        return;
    }
    try {
        await getBucket().delete(new mongoose.Types.ObjectId(id));
    } catch {
        // Already gone -- nothing left to clean up.
    }
}

/**
 * Extracts the GridFS id from a stored `/uploads/<id>` reference, for
 * cleanup call sites that only have the reference string (e.g. the old
 * value being replaced). Returns null for anything that isn't one of this
 * app's own upload references (an externally-hosted photo URL, `null`/
 * unset, etc.), since those have nothing in GridFS to delete.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function idFromUrl(url) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
        return null;
    }
    const id = url.slice('/uploads/'.length);
    return mongoose.isValidObjectId(id) ? id : null;
}

module.exports = { storeFile, getFileInfo, openDownloadStream, deleteFile, idFromUrl };
