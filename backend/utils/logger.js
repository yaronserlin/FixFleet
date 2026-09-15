// utils/logger.js

/**
 * Severity weights: lower number = higher priority. A message logs only
 * if its level's weight is <= the configured `currentLevel`'s weight.
 * @type {{ error: 0, warn: 1, info: 2, http: 3, debug: 4 }}
 */
const LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

/** ANSI color codes used to tag each log level in terminal output. @type {Record<string, string>} */
const COLORS = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[32m',  // Green
    http: '\x1b[35m',  // Magenta
    debug: '\x1b[36m', // Cyan
    reset: '\x1b[0m',
};

/**
 * The active log level: `LOG_LEVEL` env var if set, otherwise `warn` in
 * production or `debug` everywhere else.
 * @type {string}
 */
const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');

/**
 * Decides whether a message at the given level should be emitted. Always
 * false under `NODE_ENV=test` unless the `TEST_LOGS` env var is set
 * (keeps test output quiet by default, while still allowing logs to be
 * turned on for debugging a specific test run).
 *
 * @param {'error'|'warn'|'info'|'http'|'debug'} level - The level of the message being considered.
 * @returns {boolean} True if the message should be logged.
 */
function shouldLog(level) {
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_LOGS) {
        return false;
    }
    const currentWeight = LEVELS[currentLevel] ?? LEVELS.info;
    const levelWeight = LEVELS[level] ?? LEVELS.info;
    return levelWeight <= currentWeight;
}

/**
 * Formats a single log line: ISO timestamp, colored `[LEVEL]` tag, the
 * message, and any metadata. An `Error` `meta` is rendered as its stack
 * (falling back to its message); any other object is JSON-stringified;
 * primitives are stringified directly.
 *
 * @param {'error'|'warn'|'info'|'http'|'debug'} level - Log level, used for the tag color/label.
 * @param {string} message - The primary log message.
 * @param {*} [meta=''] - Optional additional context (an Error, a plain object, or a primitive).
 * @returns {string} The formatted log line.
 */
function formatMessage(level, message, meta = '') {
    const timestamp = new Date().toISOString();
    const color = COLORS[level] || COLORS.reset;
    const tag = `${color}[${level.toUpperCase()}]${COLORS.reset}`;
    const metaStr = meta ? (meta instanceof Error ? meta.stack || meta.message : (typeof meta === 'object' ? ` ${JSON.stringify(meta)}` : ` ${meta}`)) : '';
    return `${timestamp} ${tag} ${message}${metaStr}`;
}

/**
 * Leveled console logger used throughout the app instead of raw
 * `console.*` calls, so verbosity can be controlled via `LOG_LEVEL` and
 * test runs stay quiet by default (see {@link shouldLog}).
 *
 * @type {{
 *   error: (msg: string, meta?: *) => void,
 *   warn: (msg: string, meta?: *) => void,
 *   info: (msg: string, meta?: *) => void,
 *   http: (msg: string, meta?: *) => void,
 *   debug: (msg: string, meta?: *) => void,
 * }}
 */
const logger = {
    /**
     * Logs at `error` level (always shown unless `NODE_ENV=production` sets a higher cutoff, or tests suppress it).
     * @param {string} msg - Log message.
     * @param {*} [meta] - Optional Error, object, or primitive context.
     * @returns {void}
     */
    error: (msg, meta) => {
        if (shouldLog('error')) {
            console.error(formatMessage('error', msg, meta));
        }
    },
    /**
     * Logs at `warn` level.
     * @param {string} msg - Log message.
     * @param {*} [meta] - Optional Error, object, or primitive context.
     * @returns {void}
     */
    warn: (msg, meta) => {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', msg, meta));
        }
    },
    /**
     * Logs at `info` level.
     * @param {string} msg - Log message.
     * @param {*} [meta] - Optional Error, object, or primitive context.
     * @returns {void}
     */
    info: (msg, meta) => {
        if (shouldLog('info')) {
            console.log(formatMessage('info', msg, meta));
        }
    },
    /**
     * Logs at `http` level; used by app.js's request logger middleware.
     * @param {string} msg - Log message.
     * @param {*} [meta] - Optional Error, object, or primitive context.
     * @returns {void}
     */
    http: (msg, meta) => {
        if (shouldLog('http')) {
            console.log(formatMessage('http', msg, meta));
        }
    },
    /**
     * Logs at `debug` level (most verbose).
     * @param {string} msg - Log message.
     * @param {*} [meta] - Optional Error, object, or primitive context.
     * @returns {void}
     */
    debug: (msg, meta) => {
        if (shouldLog('debug')) {
            console.log(formatMessage('debug', msg, meta));
        }
    },
};

module.exports = logger;
