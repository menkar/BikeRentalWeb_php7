/**
 * ApiService — HTTP abstraction layer.
 *
 * All network calls pass through this service, keeping fetch() details
 * out of components and containers. Single place to add headers, auth
 * tokens, logging, or retry logic in the future.
 *
 * Security / Reliability hardening:
 *  - Every request is wrapped with AbortController and a configurable
 *    timeout (default 15 s). Hanging requests are automatically cancelled
 *    and surfaced as a descriptive Error — the UI never freezes silently.
 *  - Callers may pass their own AbortSignal (e.g. for component unmount)
 *    via options.signal; the internal timeout signal is merged so whichever
 *    fires first wins.
 *  - URL parameters are set via URLSearchParams.set() (never string concat)
 *    to prevent query-string injection.
 *  - Non-JSON responses are caught and re-thrown with a clear message.
 *
 * SOLID:
 *  - S: Handles only HTTP communication.
 *  - O: Extended via subclassing or options injection — not modification.
 *  - D: Containers depend on this interface, not raw fetch.
 */
export class ApiService {
    /**
     * @param {string} basePath        Prefix prepended to all paths (e.g. '/handlers')
     * @param {number} [timeoutMs]     Per-request timeout in milliseconds (default 15 000)
     */
    constructor(basePath = '', timeoutMs = 15000) {
        this.basePath  = basePath;
        this.timeoutMs = timeoutMs;
    }

    /**
     * HTTP GET request.
     * @param {string}  path           Path relative to basePath
     * @param {Object}  [params={}]    Query-string parameters (values encoded safely)
     * @param {Object}  [options={}]   Extra options: { signal: AbortSignal }
     * @returns {Promise<any>}
     */
    async get(path, params = {}, options = {}) {
        var url      = this._buildUrl(path, params);
        var combined = this._combineSignal(options.signal);

        var response = await fetch(url, {
            method:  'GET',
            headers: { 'Accept': 'application/json' },
            signal:  combined.signal,
        });

        var data = await this._handleResponse(response);
        combined.clear();
        return data;
    }

    /**
     * HTTP POST request with a JSON body.
     * @param {string}  path
     * @param {*}       body
     * @param {Object}  [options={}]   Extra options: { signal: AbortSignal }
     * @returns {Promise<any>}
     */
    async post(path, body, options = {}) {
        var url      = this._buildUrl(path);
        var combined = this._combineSignal(options.signal);

        var response = await fetch(url, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept':       'application/json',
            },
            body:   JSON.stringify(body),
            signal: combined.signal,
        });

        var data = await this._handleResponse(response);
        combined.clear();
        return data;
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    /**
     * Build a full URL with safely-encoded query parameters.
     * Uses URL + URLSearchParams — never string concatenation — to prevent
     * query-string injection.
     * @private
     */
    _buildUrl(path, params) {
        var url = new URL(
            this.basePath + path,
            window.location.origin
        );
        if (params) {
            Object.keys(params).forEach(function(k) {
                var v = params[k];
                if (v !== undefined && v !== null && v !== '') {
                    url.searchParams.set(k, String(v));
                }
            });
        }
        return url.toString();
    }

    /**
     * Parse the response JSON and surface any server-side error messages.
     * @private
     */
    async _handleResponse(response) {
        var data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Server returned a non-JSON response (HTTP ' + response.status + ').');
        }

        if (!response.ok) {
            var msg = (data && data.Message) ? data.Message : ('HTTP error ' + response.status);
            throw new Error(msg);
        }

        return data;
    }

    /**
     * Create a combined AbortController that fires on the earlier of:
     *   (a) the given external signal, or
     *   (b) the internal timeout.
     *
     * Returns { signal, clear } where `clear()` cancels the timeout timer
     * when the request completes normally (avoids dangling timers).
     *
     * @private
     * @param {AbortSignal|undefined} externalSignal
     * @returns {{ signal: AbortSignal, clear: Function }}
     */
    _combineSignal(externalSignal) {
        var controller = new AbortController();
        var timeoutId  = setTimeout(function() {
            controller.abort(new Error('Request timed out after ' + this.timeoutMs + ' ms.'));
        }.bind(this), this.timeoutMs);

        // If caller provided a signal, abort our controller when it fires.
        if (externalSignal) {
            if (externalSignal.aborted) {
                controller.abort(externalSignal.reason);
            } else {
                externalSignal.addEventListener('abort', function() {
                    controller.abort(externalSignal.reason);
                }, { once: true });
            }
        }

        return {
            signal: controller.signal,
            clear:  function() { clearTimeout(timeoutId); },
        };
    }
}

/** Singleton instance pointing at the PHP handlers folder */
export const api = new ApiService('/handlers');
