// controllers/toolController.js
/**
 * Backward-compatible alias for controllers/equipmentController.js. Kept
 * so any code (and the "Tool" naming used in routes/toolRoutes.js and
 * routes/adminRoutes.js) can require either module name and get the same
 * handlers.
 * @module controllers/toolController
 */
module.exports = require('./equipmentController');
