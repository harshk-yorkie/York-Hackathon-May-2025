// scripts/utils.js

/**
 * Debounce a function's execution.
 * @param {Function} fn
 * @param {number} delay
 * @returns Function
 */
function debounce(fn, delay = 350) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Validate city input string (at least 3 unique, non-empty, min 2 chars each)
 * @param {string} input
 * @returns string[] Array of cities or empty array
 */
function parseCities(input) {
  return [...new Set(
    input.split(",")
      .map(c => c.trim())
      .filter(c => c.length > 1)
  )].slice(0, 10); // Limit to max 10 for sanity
}

/**
 * Capitalize first letter of each word
 * @param {string} str
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

/**
 * Render an error to the user
 * @param {string} msg
 * @param {Element} el
 */
function showError(msg, el) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function hideError(el) {
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
}

/**
 * Simple sleep helper
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
