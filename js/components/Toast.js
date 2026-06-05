/**
 * Toast — Presentational notification component.
 *
 * Renders a stack of non-blocking toast messages anchored to the bottom-right.
 * Toasts auto-dismiss after a configurable duration.
 *
 * Accessibility (WCAG 2.1 AA):
 *  - Errors use an assertive ARIA live region (announced immediately).
 *  - All other types use a polite ARIA live region (announced at next opportunity).
 *  - Each visual toast has an accessible close button.
 *  - Animations are suppressed when prefers-reduced-motion is active.
 *
 * SOLID: Presentational — receives intent via method call, emits no events.
 */
export class Toast {
    /**
     * @param {number} [duration=4000]  Auto-dismiss delay in ms
     */
    constructor(duration = 4000) {
        this.duration          = duration;
        this._prefersReduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this._container        = this._createVisualContainer();
        this._politeRegion     = this._createLiveRegion('polite',     'sr-polite');
        this._assertiveRegion  = this._createLiveRegion('assertive',  'sr-assertive');
    }

    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'success'|'error'|'info'|'warning'} [type='info']
     */
    show(message, type = 'info') {
        // ── Screen-reader announcement ──────────────────────────────────────
        // Clear first so identical consecutive messages are re-announced.
        const region = (type === 'error') ? this._assertiveRegion : this._politeRegion;
        region.textContent = '';
        // Small delay ensures the DOM mutation is detected as a new event.
        setTimeout(() => { region.textContent = message; }, 50);

        // ── Visual toast ────────────────────────────────────────────────────
        const toast = document.createElement('div');
        toast.className = this._toastClasses(type);
        // Visual toast is aria-hidden — the live region already announces it.
        toast.setAttribute('aria-hidden', 'true');
        toast.innerHTML = '<span class="flex items-start gap-3">'
            + '<span class="text-lg shrink-0">' + this._icon(type) + '</span>'
            + '<span class="text-sm font-medium leading-snug">' + this._escape(message) + '</span>'
            + '</span>'
            + '<button class="toast-close ml-3 shrink-0 text-current opacity-60 hover:opacity-100'
            + ' transition-opacity text-lg leading-none focus:outline-none'
            + ' focus-visible:ring-2 focus-visible:ring-white/50 rounded"'
            + ' aria-label="Dismiss this notification">\xd7</button>';

        const close = toast.querySelector('.toast-close');
        close?.addEventListener('click', () => this._dismiss(toast));

        this._container.appendChild(toast);

        // Trigger entrance animation (skip if reduced-motion)
        if (this._prefersReduced) {
            toast.classList.add('translate-y-0', 'opacity-100');
            toast.classList.remove('translate-y-4', 'opacity-0');
        } else {
            requestAnimationFrame(() => {
                toast.classList.add('translate-y-0', 'opacity-100');
                toast.classList.remove('translate-y-4', 'opacity-0');
            });
        }

        const timer = setTimeout(() => this._dismiss(toast), this.duration);
        toast._dismissTimer = timer;
    }

    /**
     * Dismiss all currently visible toasts.
     */
    clear() {
        Array.from(this._container.children).forEach(t => this._dismiss(t));
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    /** Persistent visual container anchored to bottom-right. */
    _createVisualContainer() {
        const existing = document.getElementById('toast-container');
        if (existing) return existing;

        const el = document.createElement('div');
        el.id = 'toast-container';
        el.className = [
            'fixed bottom-6 right-6 z-50',
            'flex flex-col gap-3 items-end',
            'pointer-events-none',
        ].join(' ');
        document.body.appendChild(el);
        return el;
    }

    /**
     * Create a persistent, visually-hidden ARIA live region.
     * Screen readers monitor these regions and announce new content.
     * @param {'polite'|'assertive'} politeness
     * @param {string} id
     */
    _createLiveRegion(politeness, id) {
        const existing = document.getElementById(id);
        if (existing) return existing;

        const el = document.createElement('div');
        el.id            = id;
        el.setAttribute('role',       politeness === 'assertive' ? 'alert' : 'status');
        el.setAttribute('aria-live',  politeness);
        el.setAttribute('aria-atomic', 'true');
        // sr-only: visually hidden, still in the accessibility tree.
        el.className = 'sr-only';
        document.body.appendChild(el);
        return el;
    }

    _dismiss(toast) {
        clearTimeout(toast._dismissTimer);
        if (this._prefersReduced) {
            toast.remove();
            return;
        }
        toast.classList.add('opacity-0', 'translate-y-2', 'scale-95');
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }

    _toastClasses(type) {
        const base = [
            'pointer-events-auto flex items-center justify-between',
            'min-w-[280px] max-w-sm px-4 py-3 rounded-xl shadow-xl',
            'transition-all duration-300 ease-out',
            'translate-y-4 opacity-0',             // initial pre-animation state
        ].join(' ');

        const variants = {
            success: 'bg-emerald-600 text-white',
            error:   'bg-red-600 text-white',
            warning: 'bg-amber-500 text-white',
            info:    'bg-sky-600 text-white',
        };

        return base + ' ' + (variants[type] ?? variants.info);
    }

    _icon(type) {
        return { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] ?? 'ℹ';
    }

    _escape(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

/** Singleton toast instance shared across the page */
export const toast = new Toast();
