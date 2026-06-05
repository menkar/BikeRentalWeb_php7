/**
 * bikes.js — Shared bootstrapper for beach-cruisers.html and mountain-bikes.html.
 *
 * Configuration for each page is injected via window.PAGE_CONFIG (set inline
 * in each HTML file). This single file handles both bike types with zero
 * duplication — the config object is the only difference.
 *
 * Security: PAGE_CONFIG.bikeType is validated against a strict whitelist
 * before being forwarded to the container so a tampered config object
 * (e.g. from a browser extension or XSS payload) cannot trigger unexpected
 * API actions.
 *
 * Expected window.PAGE_CONFIG shape:
 * {
 *   bikeType: 'beach' | 'mountain',
 *   apiAction: 'beach' | 'mountain',
 *   theme: {
 *     icon:   string,    emoji icon
 *     iconBg: string,    Tailwind bg class
 *     btnBg:  string,    Tailwind bg class for rent button
 *   }
 * }
 */
import { BikeListContainer } from '../containers/BikeListContainer.js';

/** Allowed bike type values — anything outside this list is rejected. */
var ALLOWED_BIKE_TYPES = ['beach', 'mountain'];

document.addEventListener('DOMContentLoaded', function() {
    var cfg = window.PAGE_CONFIG;

    if (!cfg || typeof cfg !== 'object') {
        console.error('[bikes.js] window.PAGE_CONFIG is missing or not an object.');
        return;
    }

    // Whitelist validation — reject unknown bikeType values.
    if (ALLOWED_BIKE_TYPES.indexOf(cfg.bikeType) === -1) {
        console.error(
            '[bikes.js] Invalid PAGE_CONFIG.bikeType: "' + cfg.bikeType + '".'
            + ' Must be one of: ' + ALLOWED_BIKE_TYPES.join(', ')
        );
        return;
    }

    if (ALLOWED_BIKE_TYPES.indexOf(cfg.apiAction) === -1) {
        console.error(
            '[bikes.js] Invalid PAGE_CONFIG.apiAction: "' + cfg.apiAction + '".'
        );
        return;
    }

    if (!cfg.theme || typeof cfg.theme !== 'object') {
        console.error('[bikes.js] PAGE_CONFIG.theme is missing or not an object.');
        return;
    }

    new BikeListContainer({
        bikeType:       cfg.bikeType,
        apiAction:      cfg.apiAction,
        gridSelector:   '#bike-grid',
        filterSelector: '#filter-available',
        sortSelector:   '#sort-select',
        theme:          cfg.theme,
    }).mount();
});
