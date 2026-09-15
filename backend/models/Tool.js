// models/Tool.js
/**
 * Backward-compatible alias for models/Equipment.js. Historically the
 * "Equipment" concept was named "Tool" throughout the API and routes
 * (`/api/tools`, `routes/toolRoutes.js`, `controllers/toolController.js`);
 * this re-export lets code/tests written against either name resolve to
 * the same Mongoose model and `tools` collection.
 * @module models/Tool
 */
module.exports = require('./Equipment');
