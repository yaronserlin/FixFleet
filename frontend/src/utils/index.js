import { FAULT_STATUS } from '../constants/faultStatus';

/**
 * Sorts an array of tools by their local serial number, then by name as a tiebreaker.
 * Returns a new sorted array without mutating the original.
 *
 * @param {Array<{ localSerialNumber?: string, name: string }>} arr - Array of tool objects.
 * @returns {Array<{ localSerialNumber?: string, name: string }>} New array sorted by serial then name.
 */
export function sortToolsByLocalSerial(arr) {
    // Clone the array to avoid mutating the original data
    return [...arr].sort((a, b) =>
        // Compare localSerialNumber alphabetically, defaulting to empty string
        (a.localSerialNumber || '').localeCompare(b.localSerialNumber || '') ||
        // If serials are equal or missing, compare by name
        a.name.localeCompare(b.name)
    );
}

/**
 * Sorts an array of fault records, placing open faults before closed ones,
 * then ordering by creation date (oldest first).
 * Returns a new sorted array without mutating the original.
 *
 * @param {Array<{ status: string, createdAt: string , }>} arr - Array of fault objects.
 * @returns {Array<{ status: string, createdAt: string }>} New array sorted by status and date.
 */
export function sortFaultsByOpenAndCreateDate(arr) {
    // Clone the array to prevent side effects on the original array
    return [...arr].sort((a, b) => {
        // If one fault is open and the other isn't, put the open one first
        if (a.status !== b.status) {
            return a.status === FAULT_STATUS.OPEN ? -1 : 1;
        }
        // When statuses match, compare creation timestamps
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
}

/**
 * Executes an asynchronous function with retry logic and exponential backoff.
 * Useful for transient network or API errors.
 *
 * @template T
 * @param {() => Promise<T>} fn - The async function to execute.
 * @param {number} [retries=3] - Number of retry attempts before failing.
 * @param {number} [delay=500] - Initial delay in milliseconds before the first retry.
 * @param {number} [factor=5] - Multiplicative factor to increase delay after each attempt.
 * @returns {Promise<T>} Resolves with the function's result or rejects after all retries fail.
 * @throws {Error} The last encountered error if all retries are exhausted.
 */
export async function retry(fn, retries = 3, delay = 500, factor = 5) {
    try {
        // Attempt to execute the provided function
        return await fn();
    } catch (err) {
        // Do not retry client auth or missing resource errors
        const status = err?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
            throw err;
        }

        // If there are retries left, wait and retry
        if (retries > 0) {
            // Delay using a Promise-based timeout
            await new Promise(res => setTimeout(res, delay));
            // Retry with one fewer attempt and increased delay
            return retry(fn, retries - 1, delay * factor, factor);
        }
        // No retries left; propagate the error
        throw err;
    }
}

export * from './formatUtils';

