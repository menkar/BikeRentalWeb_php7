/**
 * BikeCard — Presentational component for a single bike listing.
 *
 * All conditional values are pre-computed before the template string to avoid
 * nested template literals (which caused a SyntaxError in Firefox/strict parsers).
 * This is also faster — no conditional branches inside hot render paths.
 *
 * Features:
 *  - Professional tooltip on disabled Rent button
 *  - Rented-card soft overlay + greyscale icon
 *  - Gradient icon area keyed to bike theme
 *  - Animated availability badge
 *  - Loading spinner during API call
 *  - Fully accessible (ARIA, keyboard, focus-visible)
 *
 * SOLID:
 *  - S: Renders one bike card only.
 *  - O: Theme object extends card appearance without modifying this class.
 *  - L: Interchangeable in any card-grid container.
 *  - I: Receives only the fields it needs to render.
 *  - D: Depends on bike data shape and theme interface, not any service.
 */
export class BikeCard {
    /**
     * @param {HTMLElement} container
     * @param {Object}      bike   Normalised bike (from BikeListContainer.normaliseBike)
     * @param {Object}      theme  { type, icon, iconBg, btnBg }
     * @param {Function}    onRent Called with (bike) on Rent click
     */
    constructor(container, bike, theme, onRent) {
        this.container = container;
        this.bike      = bike;
        this.theme     = theme;
        this.onRent    = onRent;
        this.element   = null;
        this._renting  = false;
    }

    mount() {
        this.element = document.createElement('article');
        this.element.className = this._cardClasses();
        var availability = this.bike.isAvailable ? 'available' : 'currently rented';
        this.element.setAttribute('aria-label', this._esc(this.bike.modelName) + ', ' + availability);
        this.element.innerHTML = this._template();
        this.container.appendChild(this.element);
        this._bindEvents();
        return this;
    }

    /** Switch the Rent button to loading state while the API call runs. */
    setRenting(loading) {
        this._renting = loading;
        var btn = this.element ? this.element.querySelector('.rent-btn') : null;
        if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            btn.innerHTML =
                '<span class="inline-block w-4 h-4 border-2 border-white/40'
                + ' border-t-white rounded-full animate-spin"></span>'
                + '<span>Renting\u2026</span>';
        } else {
            btn.innerHTML = '<span>Rent Now</span>';
        }
    }

    // ─── Template ─────────────────────────────────────────────────────────────

    _template() {
        var b         = this.bike;
        var available = b.isAvailable;

        // ── Pre-compute all conditional strings ──────────────────────────────
        // Avoids nested template literals which cause SyntaxErrors in some parsers.

        var overlay = available
            ? ''
            : '<div aria-hidden="true" class="absolute inset-0 rounded-2xl bg-slate-50/60 pointer-events-none z-10"></div>';

        // Badge: pulse dot is decorative; badge itself carries the accessible label.
        var badgeHtml = available
            ? '<span class="inline-flex items-center gap-1'
              + ' bg-emerald-50 text-emerald-700 border border-emerald-200'
              + ' text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm"'
              + ' aria-label="Status: Available">'
              + '<span aria-hidden="true" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>'
              + '<span aria-hidden="true">Available</span></span>'
            : '<span class="inline-flex items-center gap-1'
              + ' bg-slate-100 text-slate-500 border border-slate-200'
              + ' text-xs font-semibold px-2.5 py-1 rounded-full"'
              + ' aria-label="Status: Currently rented">'
              + '<span aria-hidden="true" class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>'
              + '<span aria-hidden="true">Rented</span></span>';

        var iconAreaClass = available
            ? 'relative flex items-center justify-center h-32 rounded-xl mb-4 overflow-hidden transition-all duration-300 ' + this._iconBgGradient()
            : 'relative flex items-center justify-center h-32 rounded-xl mb-4 overflow-hidden transition-all duration-300 bg-slate-100';

        // Icon is decorative — the <h3> already names the bike.
        var iconClass = available
            ? 'text-5xl transition-transform duration-300 group-hover:scale-110'
            : 'text-5xl transition-transform duration-300 grayscale opacity-60';

        // Shimmer is a visual decoration only
        var shimmer = available
            ? '<div aria-hidden="true" class="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none rounded-xl"></div>'
            : '';

        var titleClass = available
            ? 'font-bold text-slate-800 text-base leading-tight mb-0.5'
            : 'font-bold text-slate-500 text-base leading-tight mb-0.5';

        var priceClass = available
            ? 'text-2xl font-extrabold text-slate-800'
            : 'text-2xl font-extrabold text-slate-400';

        var priceLabel = 'Daily rate: $' + Number(b.dailyRate).toFixed(2);

        var btnClass = [
            'rent-btn flex items-center gap-1.5',
            'px-5 py-2.5 rounded-xl',
            'text-sm font-bold',
            'transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            available
                ? (this.theme.btnBg + ' text-white shadow-md hover:shadow-lg'
                   + ' hover:-translate-y-0.5 active:translate-y-0'
                   + ' active:shadow-sm cursor-pointer focus-visible:ring-pink-400')
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed',
        ].join(' ');

        var btnDisabledAttr = available ? '' : 'disabled aria-disabled="true"';
        var btnAriaLabel    = available
            ? 'Rent ' + this._esc(b.modelName)
            : 'Rent ' + this._esc(b.modelName) + ' — currently unavailable';

        // aria-describedby links the button to the tooltip so SRs read the
        // "currently rented" explanation when the disabled button receives focus.
        var btnDescribedBy = available ? '' : 'aria-describedby="tooltip-' + b.id + '"';

        var tooltipHtml = available ? '' : this._tooltipHtml(b);

        return (
            overlay
            + '<div class="absolute top-3 right-3 z-20">' + badgeHtml + '</div>'
            + '<div class="' + iconAreaClass + '">'
            + '  <span aria-hidden="true" class="' + iconClass + '">'
            + this.theme.icon
            + '  </span>'
            + shimmer
            + '</div>'
            + '<div class="flex-1 relative z-20">'
            + '  <h3 class="' + titleClass + '">' + this._esc(b.modelName) + '</h3>'
            + '  <p class="text-xs text-slate-400 mb-4 truncate">' + this._esc(b.brand || b.color || '\u2014') + '</p>'
            + '  <dl class="grid grid-cols-2 gap-x-3 gap-y-3 mb-5">' + this._specs() + '</dl>'
            + '</div>'
            + '<div class="relative z-20 flex items-center justify-between pt-4 border-t border-slate-100">'
            + '  <div class="flex flex-col leading-none">'
            + '    <span class="' + priceClass + '" aria-label="' + priceLabel + '">$' + Number(b.dailyRate).toFixed(2) + '</span>'
            + '    <span aria-hidden="true" class="text-xs text-slate-400 mt-0.5">per day</span>'
            + '  </div>'
            + '  <div class="rent-btn-wrapper relative">'
            + '    <button class="' + btnClass + '" ' + btnDisabledAttr + ' ' + btnDescribedBy + ' aria-label="' + btnAriaLabel + '">'
            + '      <span>Rent Now</span>'
            + '    </button>'
            + tooltipHtml
            + '  </div>'
            + '</div>'
        );
    }

    // ─── Tooltip (unavailable bikes only) ─────────────────────────────────────

    _tooltipHtml(b) {
        return (
            '<div class="rent-tooltip'
            + ' absolute bottom-full right-0 mb-2.5'
            + ' opacity-0 scale-95 pointer-events-none'
            + ' transition-all duration-200 ease-out'
            + ' z-50 min-w-[200px]"'
            + ' role="tooltip" id="tooltip-' + b.id + '">'
            + '  <div class="bg-slate-800 text-white rounded-xl px-4 py-3 shadow-2xl shadow-slate-900/40">'
            + '    <div class="flex items-start gap-2.5">'
            + '      <span class="text-amber-400 text-base mt-0.5 shrink-0">\u23F1</span>'
            + '      <div>'
            + '        <p class="font-semibold text-xs text-white leading-tight">Currently Rented</p>'
            + '        <p class="text-slate-300 text-xs mt-1 leading-snug">'
            + '          This bike is out with another rider.'
            + '          Check back soon or browse available bikes.'
            + '        </p>'
            + '      </div>'
            + '    </div>'
            + '  </div>'
            + '  <div class="absolute top-full right-6 w-0 h-0'
            + '              border-l-[6px] border-l-transparent'
            + '              border-r-[6px] border-r-transparent'
            + '              border-t-[7px] border-t-slate-800">'
            + '  </div>'
            + '</div>'
        );
    }

    // ─── Specs grid ───────────────────────────────────────────────────────────

    _specs() {
        var b         = this.bike;
        var available = b.isAvailable;
        var dtClass   = 'text-[10px] font-semibold uppercase tracking-widest '
                      + (available ? 'text-slate-400' : 'text-slate-300');
        var ddClass   = 'text-sm font-semibold '
                      + (available ? 'text-slate-700' : 'text-slate-400');

        var rows = [];
        if (b.frameSize)      rows.push(['Frame',      b.frameSize]);
        if (b.color)          rows.push(['Color',      b.color]);
        if (b.gearCount)      rows.push(['Gears',      b.gearCount]);
        if (b.suspensionType) rows.push(['Suspension', b.suspensionType]);
        if (b.terrain)        rows.push(['Terrain',    b.terrain]);
        if (b.frameMaterial)  rows.push(['Material',   b.frameMaterial]);
        if (b.weightKg)       rows.push(['Weight',     b.weightKg + '\u202fkg']);

        return rows.slice(0, 4).map(function(row) {
            return (
                '<div class="flex flex-col gap-0.5">'
                + '<dt class="' + dtClass + '">' + row[0] + '</dt>'
                + '<dd class="' + ddClass + '">' + row[1] + '</dd>'
                + '</div>'
            );
        }).join('');
    }

    // ─── Card container classes ───────────────────────────────────────────────

    _cardClasses() {
        var base = [
            'group relative flex flex-col',
            'bg-white rounded-2xl p-5',
            'border transition-all duration-250',
        ];
        if (this.bike.isAvailable) {
            base.push(
                'border-slate-150 shadow-sm',
                'hover:shadow-xl hover:shadow-slate-200/70',
                'hover:-translate-y-1 hover:border-slate-200'
            );
        } else {
            base.push('border-slate-100 shadow-sm opacity-80');
        }
        return base.join(' ');
    }

    _iconBgGradient() {
        var gradients = {
            beach:    'bg-gradient-to-br from-pink-50 to-rose-100',
            mountain: 'bg-gradient-to-br from-sky-50 to-cyan-100',
        };
        return gradients[this.theme.type] || 'bg-gradient-to-br from-slate-50 to-slate-100';
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    _bindEvents() {
        var self    = this;
        var btn     = this.element ? this.element.querySelector('.rent-btn') : null;
        var wrapper = this.element ? this.element.querySelector('.rent-btn-wrapper') : null;
        var tooltip = this.element ? this.element.querySelector('.rent-tooltip') : null;

        if (btn) {
            btn.addEventListener('click', function() {
                if (!self._renting && self.bike.isAvailable) {
                    self.onRent && self.onRent(self.bike);
                }
            });
        }

        if (wrapper && tooltip) {
            wrapper.addEventListener('mouseenter', function() { self._showTooltip(tooltip); });
            wrapper.addEventListener('mouseleave', function() { self._hideTooltip(tooltip); });
            wrapper.addEventListener('focusin',    function() { self._showTooltip(tooltip); });
            wrapper.addEventListener('focusout',   function() { self._hideTooltip(tooltip); });
        }
    }

    _showTooltip(tooltip) {
        tooltip.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        tooltip.classList.add('opacity-100', 'scale-100');
    }

    _hideTooltip(tooltip) {
        tooltip.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        tooltip.classList.remove('opacity-100', 'scale-100');
    }

    _esc(val) {
        return String(val == null ? '' : val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
