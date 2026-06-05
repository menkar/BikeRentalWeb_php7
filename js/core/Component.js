/**
 * Component — Base class for all UI components.
 *
 * Provides a consistent lifecycle (mount → render → bindEvents → destroy),
 * lightweight state management with automatic re-render on state change,
 * and a safe HTML templating helper.
 *
 * SOLID principles applied:
 *  - S: Each subclass handles rendering for one UI concern.
 *  - O: New components extend this base without modifying it.
 *  - L: All subclasses honour the mount/destroy contract.
 *  - D: Subclasses depend on this abstraction, not DOM APIs directly.
 */
export class Component {
    /**
     * @param {string|HTMLElement} target  CSS selector or existing DOM element
     */
    constructor(target) {
        this.element = typeof target === 'string'
            ? document.querySelector(target)
            : target;

        /** @type {Object} */
        this._state = {};
        this._mounted = false;
        this._eventCleanups = [];
    }

    // ─── State ───────────────────────────────────────────────────────────────

    /** Immutable state snapshot */
    get state() {
        return { ...this._state };
    }

    /**
     * Merge partial state and trigger a re-render if mounted.
     * @param {Object} partial
     */
    setState(partial) {
        const prev = this._state;
        this._state = { ...this._state, ...partial };
        if (this._mounted) {
            this.onStateChange(this._state, prev);
        }
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    /** Attach to DOM, render, and bind events. */
    mount() {
        if (!this.element) {
            console.warn(`[Component] mount() called but element not found.`);
            return this;
        }
        this._mounted = true;
        this.render();
        this.bindEvents();
        return this;
    }

    /** Called when state changes while mounted. Defaults to full re-render. */
    onStateChange(newState, prevState) {
        this.render();
        this.bindEvents();
    }

    /** Override to write HTML into this.element.innerHTML */
    render() {}

    /** Override to attach DOM event listeners. Use this._track() for cleanup. */
    bindEvents() {}

    /**
     * Track a DOM event listener for automatic cleanup on destroy().
     * @param {HTMLElement} el
     * @param {string} event
     * @param {Function} handler
     * @param {Object} [options]
     */
    _track(el, event, handler, options) {
        el?.addEventListener(event, handler, options);
        this._eventCleanups.push(() => el?.removeEventListener(event, handler, options));
    }

    /** Remove element from DOM and clean up event listeners. */
    destroy() {
        this._eventCleanups.forEach(fn => fn());
        this._eventCleanups = [];
        this._mounted = false;
        this.element?.remove();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Escape a string for safe insertion into HTML.
     * @param {*} val
     * @returns {string}
     */
    escape(val) {
        return String(val ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Query a child element within this component's root.
     * @param {string} selector
     * @returns {HTMLElement|null}
     */
    $(selector) {
        return this.element?.querySelector(selector) ?? null;
    }

    /**
     * Query all matching child elements within this component's root.
     * @param {string} selector
     * @returns {NodeList}
     */
    $$(selector) {
        return this.element?.querySelectorAll(selector) ?? [];
    }
}
