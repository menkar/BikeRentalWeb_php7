/**
 * Store — Reactive state container.
 *
 * A lightweight centralised state store following the Flux/Redux pattern.
 * Subscribers are notified synchronously on every setState call, making
 * the data flow predictable and easy to trace.
 *
 * SOLID: Single Responsibility — owns one slice of application state.
 *
 * @template T
 */
export class Store {
    /**
     * @param {T} initialState
     */
    constructor(initialState = {}) {
        /** @type {T} */
        this._state = Object.freeze({ ...initialState });
        /** @type {Set<Function>} */
        this._subscribers = new Set();
    }

    /** Returns an immutable snapshot of current state. */
    getState() {
        return this._state;
    }

    /**
     * Merge a partial update into state and notify all subscribers.
     * @param {Partial<T>} partial
     */
    setState(partial) {
        const prev = this._state;
        this._state = Object.freeze({ ...this._state, ...partial });
        this._notify(this._state, prev);
    }

    /**
     * Replace the entire state (e.g. on reset).
     * @param {T} state
     */
    reset(state) {
        const prev = this._state;
        this._state = Object.freeze({ ...state });
        this._notify(this._state, prev);
    }

    /**
     * Subscribe to state changes. Returns an unsubscribe function.
     * @param {function(T, T): void} fn
     * @returns {function(): void} unsubscribe
     */
    subscribe(fn) {
        this._subscribers.add(fn);
        return () => this._subscribers.delete(fn);
    }

    /** @private */
    _notify(next, prev) {
        this._subscribers.forEach(fn => {
            try { fn(next, prev); } catch (e) {
                console.error('[Store] Subscriber error:', e);
            }
        });
    }
}
