/**
 * LoadingSpinner — Presentational skeleton / spinner component.
 *
 * Accessibility (WCAG 2.1 AA):
 *  - The loading wrapper uses role="status" + aria-label so screen readers
 *    announce "Loading bikes…" when it appears.
 *  - Individual skeleton placeholder cards are aria-hidden (purely decorative).
 *  - The visible "Loading…" text is kept in the DOM only for sighted users;
 *    the aria-label on the wrapper covers screen readers.
 *
 * SOLID: Single Responsibility — only renders loading states.
 */
export class LoadingSpinner {
    /**
     * @param {HTMLElement} container
     * @param {'skeleton'|'spinner'} [type='skeleton']
     * @param {number}               [count=6]  Number of skeleton cards
     * @param {string}               [label='Loading…']  SR announcement text
     */
    constructor(container, type = 'skeleton', count = 6, label = 'Loading bikes, please wait.') {
        this.container = container;
        this.type      = type;
        this.count     = count;
        this.label     = label;
        this.element   = null;
    }

    show() {
        this.hide(); // idempotent
        this.element = document.createElement('div');

        if (this.type === 'skeleton') {
            // Wrapper announces "Loading…" to screen readers; individual cards are hidden.
            this.element.setAttribute('role', 'status');
            this.element.setAttribute('aria-label', this.label);
            this.element.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5';

            // Visually-hidden text for browsers that also read role=status textContent.
            const srText = document.createElement('span');
            srText.className     = 'sr-only';
            srText.textContent   = this.label;
            this.element.appendChild(srText);

            // Skeleton cards are presentational — hide from the accessibility tree.
            const skeletonHtml = Array.from({ length: this.count })
                .map(() => this._skeletonCard()).join('');
            const skeletonWrapper = document.createElement('div');
            skeletonWrapper.setAttribute('aria-hidden', 'true');
            skeletonWrapper.className = 'contents';
            skeletonWrapper.innerHTML = skeletonHtml;
            this.element.appendChild(skeletonWrapper);
        } else {
            this.element.setAttribute('role', 'status');
            this.element.setAttribute('aria-label', this.label);
            this.element.className = 'flex items-center justify-center py-20';
            this.element.innerHTML =
                '<div class="flex flex-col items-center gap-3 text-slate-400" aria-hidden="true">'
                + '<span class="w-10 h-10 border-4 border-slate-200 border-t-sky-500'
                + ' rounded-full animate-spin"></span>'
                + '<span class="text-sm">Loading\u2026</span>'
                + '</div>'
                + '<span class="sr-only">' + this.label + '</span>';
        }

        this.container.appendChild(this.element);
        return this;
    }

    hide() {
        this.element?.remove();
        this.element = null;
        return this;
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _skeletonCard() {
        return '<div class="bg-white rounded-2xl p-5 border border-slate-100 overflow-hidden">'
            + '<div class="relative animate-pulse space-y-4">'
            + '<div class="h-32 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 rounded-xl"></div>'
            + '<div class="space-y-2">'
            + '<div class="h-4 bg-slate-100 rounded-lg w-3/4"></div>'
            + '<div class="h-3 bg-slate-100 rounded-lg w-1/3"></div>'
            + '</div>'
            + '<div class="grid grid-cols-2 gap-3">'
            + '<div class="space-y-1"><div class="h-2.5 bg-slate-100 rounded w-2/3"></div>'
            + '<div class="h-3.5 bg-slate-100 rounded w-full"></div></div>'
            + '<div class="space-y-1"><div class="h-2.5 bg-slate-100 rounded w-2/3"></div>'
            + '<div class="h-3.5 bg-slate-100 rounded w-full"></div></div>'
            + '<div class="space-y-1"><div class="h-2.5 bg-slate-100 rounded w-2/3"></div>'
            + '<div class="h-3.5 bg-slate-100 rounded w-full"></div></div>'
            + '<div class="space-y-1"><div class="h-2.5 bg-slate-100 rounded w-2/3"></div>'
            + '<div class="h-3.5 bg-slate-100 rounded w-full"></div></div>'
            + '</div>'
            + '<div class="flex justify-between items-center pt-4 border-t border-slate-100">'
            + '<div class="h-7 bg-slate-100 rounded-lg w-20"></div>'
            + '<div class="h-9 bg-slate-100 rounded-xl w-28"></div>'
            + '</div>'
            + '</div>'
            + '</div>';
    }
}

/**
 * EmptyState — Shows a friendly message when a list has no items.
 * Accessibility: uses role="status" so screen readers announce the empty state.
 * Presentational: receives icon + message; emits no events.
 */
export class EmptyState {
    constructor(container, icon = '🚲', message = 'No items found.') {
        this.container = container;
        this.icon      = icon;
        this.message   = message;
        this.element   = null;
    }

    show() {
        this.hide();
        this.element = document.createElement('div');
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', this.message + ' Try clearing filters to see all bikes.');
        this.element.className = 'col-span-full flex flex-col items-center justify-center py-20 text-center';
        this.element.innerHTML =
            '<div aria-hidden="true"'
            + ' class="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center'
            + ' text-5xl mb-5 shadow-inner">'
            + this.icon
            + '</div>'
            + '<p class="text-slate-700 text-lg font-bold mb-1">' + this.message + '</p>'
            + '<p class="text-slate-400 text-sm">Try clearing filters to see all bikes.</p>';
        this.container.appendChild(this.element);
        return this;
    }

    hide() {
        this.element?.remove();
        this.element = null;
        return this;
    }
}
