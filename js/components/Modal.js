/**
 * Modal — Accessible presentational modal component.
 *
 * Provides an overlay + dialog wrapper with:
 *  - Focus trapping (keyboard accessibility)
 *  - ARIA roles and labels
 *  - Close on Escape key and backdrop click
 *  - Smooth CSS transitions
 *
 * Content is injected via the render() method of subclasses
 * or by setting innerHTML on the content area.
 *
 * SOLID: Presentational — renders a shell; content is injected by the caller.
 */
export class Modal {
    /**
     * @param {Object} [options]
     * @param {string} [options.title]         Modal heading text
     * @param {string} [options.size='md']     'sm' | 'md' | 'lg' | 'xl' | 'full'
     * @param {boolean} [options.closeable=true]
     */
    constructor(options = {}) {
        this.title     = options.title ?? '';
        this.size      = options.size  ?? 'md';
        this.closeable = options.closeable !== false;
        this._open     = false;
        this._element  = null;
        this._previousFocus = null;

        this._onKeyDown = this._handleKeyDown.bind(this);
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Open the modal and render the given HTML content.
     * @param {string} contentHtml
     */
    open(contentHtml = '') {
        if (this._open) this.close();

        this._previousFocus = document.activeElement;
        this._element = this._buildElement(contentHtml);
        document.body.appendChild(this._element);
        document.body.classList.add('overflow-hidden');

        // Animate in
        requestAnimationFrame(() => {
            this._element.querySelector('.modal-overlay')
                ?.classList.add('opacity-100');
            this._element.querySelector('.modal-panel')
                ?.classList.add('opacity-100', 'scale-100');
        });

        document.addEventListener('keydown', this._onKeyDown);
        this._open = true;
        this._focusFirst();
    }

    /** Close and remove the modal from the DOM. */
    close() {
        if (!this._open || !this._element) return;

        const overlay = this._element.querySelector('.modal-overlay');
        const panel   = this._element.querySelector('.modal-panel');

        overlay?.classList.remove('opacity-100');
        panel?.classList.remove('opacity-100', 'scale-100');

        setTimeout(() => {
            this._element?.remove();
            this._element = null;
        }, 250);

        document.body.classList.remove('overflow-hidden');
        document.removeEventListener('keydown', this._onKeyDown);
        this._open = false;
        this._previousFocus?.focus();
    }

    /** Update the modal's body content without reopening. */
    setContent(html) {
        const body = this._element?.querySelector('.modal-body');
        if (body) body.innerHTML = html;
    }

    /** Returns the modal's content area element. */
    getContentEl() {
        return this._element?.querySelector('.modal-body') ?? null;
    }

    /** Whether the modal is currently open. */
    get isOpen() { return this._open; }

    // ─── Private ─────────────────────────────────────────────────────────────

    _buildElement(contentHtml) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('role', 'dialog');
        wrapper.setAttribute('aria-modal', 'true');
        wrapper.setAttribute('aria-labelledby', 'modal-title');
        wrapper.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';

        wrapper.innerHTML = `
            <div class="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm
                        opacity-0 transition-opacity duration-250"></div>
            <div class="modal-panel relative w-full ${this._panelSize()}
                        bg-white rounded-2xl shadow-2xl
                        opacity-0 scale-95
                        transition-all duration-250 ease-out
                        flex flex-col max-h-[90vh] overflow-hidden">

                <!-- Header -->
                <div class="modal-header flex items-center justify-between
                            px-6 py-4 border-b border-slate-100 shrink-0">
                    <h2 id="modal-title"
                        class="text-lg font-semibold text-slate-800 leading-tight">
                        ${this._escape(this.title)}
                    </h2>
                    ${this.closeable ? `
                    <button class="modal-close-btn
                                   w-8 h-8 flex items-center justify-center
                                   rounded-lg text-slate-400 hover:text-slate-600
                                   hover:bg-slate-100 transition-colors text-xl leading-none"
                            aria-label="Close modal">×</button>
                    ` : ''}
                </div>

                <!-- Body (scrollable) -->
                <div class="modal-body flex-1 overflow-y-auto px-6 py-4">
                    ${contentHtml}
                </div>
            </div>
        `;

        // Backdrop click closes
        wrapper.querySelector('.modal-overlay')
            ?.addEventListener('click', () => this.closeable && this.close());

        // Close button
        wrapper.querySelector('.modal-close-btn')
            ?.addEventListener('click', () => this.close());

        return wrapper;
    }

    _panelSize() {
        return {
            sm:   'max-w-sm',
            md:   'max-w-lg',
            lg:   'max-w-2xl',
            xl:   'max-w-4xl',
            full: 'max-w-screen-lg',
        }[this.size] ?? 'max-w-lg';
    }

    _handleKeyDown(e) {
        if (e.key === 'Escape' && this.closeable) { this.close(); return; }
        if (e.key === 'Tab') this._trapFocus(e);
    }

    _trapFocus(e) {
        const focusable = Array.from(
            this._element?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) ?? []
        ).filter(el => !el.disabled);

        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    }

    _focusFirst() {
        setTimeout(() => {
            const firstFocusable = this._element?.querySelector(
                'button:not(.modal-close-btn), input, [tabindex="0"]'
            );
            (firstFocusable ?? this._element?.querySelector('.modal-close-btn'))?.focus();
        }, 50);
    }

    _escape(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
