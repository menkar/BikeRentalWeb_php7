/**
 * EventBus — Publisher/Subscriber event system.
 *
 * Decouples components by allowing them to communicate through named events
 * without holding direct references to each other. Follows the Open/Closed
 * principle: new event types can be added without modifying existing listeners.
 *
 * SOLID: Single Responsibility — manages only event routing.
 */
export class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event. Returns an unsubscribe function.
     * @param {string} event
     * @param {Function} callback
     * @returns {Function} unsubscribe
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe a specific callback from an event.
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        this._listeners.get(event)?.delete(callback);
    }

    /**
     * Publish an event with optional payload.
     * @param {string} event
     * @param {*} [data]
     */
    emit(event, data) {
        this._listeners.get(event)?.forEach(cb => {
            try {
                cb(data);
            } catch (err) {
                console.error(`[EventBus] Error in listener for "${event}":`, err);
            }
        });
    }

    /**
     * Subscribe to an event and auto-unsubscribe after first fire.
     * @param {string} event
     * @param {Function} callback
     */
    once(event, callback) {
        const unsub = this.on(event, (data) => {
            callback(data);
            unsub();
        });
    }

    /**
     * Remove all listeners for a specific event (or all events if none specified).
     * @param {string} [event]
     */
    clear(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}

/** Singleton application-wide event bus */
export const bus = new EventBus();
