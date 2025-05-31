// scripts/utils.js

/**
 * Sleep utility for delays
 * @param {number} ms
 */
export function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

/**
 * Run given async fn with up to 3 retries on error.
 * @param {Function} fn
 * @returns {Promise<any>}
 */
export async function withRetry(fn) {
    let lastError;
    for (let i = 0; i < 3; ++i) {
        try { return await fn(); }
        catch (e) { lastError = e; await sleep(500); }
    }
    throw lastError;
}

/**
 * Format city name input
 * @param {string} name
 * @returns {string}
 */
export function properCase(name) {
    return name.split(/\s+/).map(v => v.charAt(0).toUpperCase()+v.slice(1).toLowerCase()).join(' ');
}

/**
 * Min/max/average helpers for sparkline
 */
export function findMinMax(arr) {
    let min = Math.min(...arr), max = Math.max(...arr);
    return { min, max };
}

/**
 * Clamp value between given bounds
 */
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
