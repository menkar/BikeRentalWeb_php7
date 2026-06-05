/**
 * formatters.js — Pure utility functions for display formatting.
 *
 * No side effects, no DOM access, no imports. Safe to use in any layer.
 * SOLID: Single Responsibility — transforms data into display-ready strings.
 */

/**
 * Format a number as a USD currency string.
 * @param {number} value
 * @param {string} [currency='USD']
 * @returns {string}  e.g. "$12.50"
 */
export function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Capitalise the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export function capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Return a relative time label (e.g. "Just now", "2 min ago").
 * Simple implementation — not using Intl.RelativeTimeFormat to avoid locale issues.
 * @param {Date|number} date
 * @returns {string}
 */
export function relativeTime(date) {
    const diff = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60)  return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} day(s) ago`;
}

/**
 * Clamp a number between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

/**
 * Build a CSS class string from an object map of { className: boolean }.
 * Truthy values are included; falsy are excluded.
 * @param {Object} classMap
 * @returns {string}
 */
export function cx(classMap) {
    return Object.entries(classMap)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k)
        .join(' ');
}
