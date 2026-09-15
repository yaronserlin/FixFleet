// constants/pagination.js

/**
 * Default page number used by list endpoints when `page` is not supplied
 * or is not a valid positive integer.
 * @type {number}
 */
const DEFAULT_PAGE = 1;

/**
 * Default page size used by list endpoints when `limit` is not supplied
 * or is not a valid positive integer.
 * @type {number}
 */
const DEFAULT_LIMIT = 20;

/**
 * Upper bound on page size accepted from clients, regardless of the
 * requested `limit`.
 * @type {number}
 */
const MAX_LIMIT = 100;

module.exports = { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT };
