/**
 * SuccessScreen — Presentational animated order-confirmation component.
 *
 * Displays after a successful accessory order with:
 *  - Confetti burst (28 CSS-animated particles, no library)
 *  - SVG checkmark with stroke-draw animation
 *  - Full order summary:
 *      • Rented bike name
 *      • Every selected accessory: name, qty × unit price, line total
 *      • Bundle discount row (only when applicable)
 *      • Total charged
 *  - Single "Done" button — user controls when to close
 *
 * No auto-close. No countdown. The user dismisses when ready.
 *
 * CSS keyframes are injected once into <head> (idempotent via unique id).
 * Zero external dependencies. No nested template literals.
 *
 * SOLID:
 *  - S: Renders one success state only — no business logic.
 *  - O: Content driven entirely by options — no internal domain conditionals.
 *  - L: Drop-in replacement for any modal body content.
 *  - I: Receives only the data it needs to display.
 *  - D: Depends on a plain HTMLElement container, not any specific modal or store.
 */

import { formatCurrency } from '../utils/formatters.js';

var STYLE_ID = 'pedalpal-success-styles';

/** Category → emoji mapping kept locally to avoid coupling to AccessoryItem */
var CATEGORY_ICONS = {
    hydration:  '💧',
    safety:     '🔒',
    lighting:   '💡',
    protection: '🪖',
    storage:    '🎒',
    lock:       '🔒',
    helmet:     '🪖',
};

function categoryIcon(category) {
    return CATEGORY_ICONS[(category || '').toLowerCase()] || '📦';
}

export class SuccessScreen {
    /**
     * @param {Object}   options
     * @param {Object}   options.result  API order result
     *                                    { TotalPrice, DiscountAmount, BundleDiscountApplied }
     * @param {Object}   options.bike    Rented bike { modelName }
     * @param {Array}    options.items   Selected accessories
     *                                    [{ name, category, qty, unitPrice, lineTotal }]
     * @param {Function} options.onClose Called when user clicks Done
     */
    constructor(options) {
        this.result   = options.result  || {};
        this.bike     = options.bike    || {};
        this.items    = Array.isArray(options.items) ? options.items : [];
        this.onClose  = options.onClose || function() {};

        this._container = null;
        this._prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this._injectStyles();
    }

    /**
     * Render the success screen into `container`, replacing its content.
     * Moves keyboard focus to the heading so screen readers immediately
     * announce "Order Confirmed!" when the success screen appears.
     * @param {HTMLElement} container
     */
    mount(container) {
        this._container = container;
        this._prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        container.innerHTML = this._buildHtml();
        this._bindClose();

        // Move focus to the heading so screen readers announce the confirmation.
        // The h3 has tabindex="-1" making it programmatically focusable.
        var heading = container.querySelector('.ss-heading-h3');
        if (heading) {
            // Small delay ensures the modal's own focus logic has settled.
            setTimeout(function() { heading.focus(); }, 80);
        }
    }

    destroy() {
        if (this._container) this._container.innerHTML = '';
    }

    // ─── HTML ─────────────────────────────────────────────────────────────────

    _buildHtml() {
        var r      = this.result;
        var bundle = r.BundleDiscountApplied;
        var total  = formatCurrency(r.TotalPrice     || 0);
        var disc   = formatCurrency(r.DiscountAmount || 0);

        // Animation delays — stagger each row: bike(0) + N items + discount + total
        var BASE_DELAY    = 0.20;
        var ROW_INCREMENT = 0.06;

        var bikeDelay     = BASE_DELAY;
        var itemsHtml     = this._itemsHtml(BASE_DELAY + ROW_INCREMENT, ROW_INCREMENT);
        var itemCount     = this.items.length;
        var discDelay     = (BASE_DELAY + (itemCount + 1) * ROW_INCREMENT).toFixed(2);
        var totalDelay    = (BASE_DELAY + (itemCount + 2) * ROW_INCREMENT).toFixed(2);
        var btnDelay      = (BASE_DELAY + (itemCount + 3) * ROW_INCREMENT + 0.1).toFixed(2);

        var bikeRow =
            '<div class="ss-row flex items-center justify-between px-4 py-2.5 bg-white"'
            + ' style="animation:ss-slide-up 0.35s ease-out ' + bikeDelay + 's both;">'
            + '  <div class="flex items-center gap-2 min-w-0">'
            + '    <span class="text-base shrink-0">🚲</span>'
            + '    <span class="text-sm text-slate-500 font-medium">Rented Bike</span>'
            + '  </div>'
            + '  <span class="font-semibold text-slate-700 text-sm max-w-[140px] truncate">'
            + this._esc(this.bike.modelName || '\u2014')
            + '  </span>'
            + '</div>';

        var discountRow = bundle
            ? '<div class="ss-row flex items-center justify-between px-4 py-2.5 bg-white"'
              + '     style="animation:ss-slide-up 0.35s ease-out ' + discDelay + 's both;">'
              + '  <div class="flex items-center gap-2">'
              + '    <span class="text-base">🎁</span>'
              + '    <span class="text-sm text-emerald-700 font-medium">Bundle discount (10%)</span>'
              + '  </div>'
              + '  <span class="font-bold text-emerald-600">\u2212' + disc + '</span>'
              + '</div>'
            : '';

        var totalRow =
            '<div class="ss-row flex items-center justify-between px-4 py-3 bg-slate-800 text-white"'
            + '     style="animation:ss-slide-up 0.35s ease-out ' + totalDelay + 's both;">'
            + '  <span class="text-sm font-bold">Total Charged</span>'
            + '  <span class="text-lg font-extrabold">' + total + '</span>'
            + '</div>';

        // ── Confetti (skip entirely when reduced-motion is preferred) ──────────
        var confettiBlock = this._prefersReduced
            ? ''
            : '<div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">'
              + this._confettiHtml()
              + '</div>';

        return (
            // Root wrapper
            '<div class="ss-root relative flex flex-col items-center text-center px-3 py-6 overflow-hidden">'

            + confettiBlock

            // ── Check icon ────────────────────────────────────────────────────
            + '<div class="relative z-10 mb-5">'
            + '  <div class="ss-icon-ring w-20 h-20 rounded-full'
            + '              bg-gradient-to-br from-emerald-400 to-teal-500'
            + '              shadow-xl shadow-emerald-300/50'
            + '              flex items-center justify-center">'
            + '    <svg class="w-10 h-10" viewBox="0 0 52 52" fill="none" aria-hidden="true">'
            + '      <circle class="ss-check-circle" cx="26" cy="26" r="23"'
            + '              stroke="rgba(255,255,255,0.25)" stroke-width="1.5" fill="none"'
            + '              stroke-dasharray="145" stroke-dashoffset="145"/>'
            + '      <polyline class="ss-check-mark" points="14,27 22,35 38,17"'
            + '                stroke="white" stroke-width="4.5"'
            + '                stroke-linecap="round" stroke-linejoin="round"'
            + '                fill="none" stroke-dasharray="50" stroke-dashoffset="50"/>'
            + '    </svg>'
            + '  </div>'
            + '</div>'

            // ── Heading (tabindex="-1" so focus can be moved here programmatically) ──
            + '<div class="relative z-10 mb-5 ss-heading">'
            + '  <h3 class="ss-heading-h3 text-xl font-extrabold text-slate-800 mb-1"'
            + '      tabindex="-1"'
            + '      style="outline:none">Order Confirmed!</h3>'
            + '  <p class="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">'
            + '    Your gear is ready. Enjoy the ride.'
            + '  </p>'
            + '</div>'

            // ── Order summary card ────────────────────────────────────────────
            + '<div class="relative z-10 w-full rounded-2xl border border-slate-200'
            + '            overflow-hidden shadow-sm mb-6"'
            + '     role="region" aria-label="Order summary">'

            // Card header
            + '  <div class="bg-slate-50 px-4 py-2.5 border-b border-slate-200">'
            + '    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Summary</p>'
            + '  </div>'

            // Rows
            + '  <div class="divide-y divide-slate-100">'
            + bikeRow
            + itemsHtml
            + discountRow
            + totalRow
            + '  </div>'
            + '</div>'

            // ── Done button ───────────────────────────────────────────────────
            + '<button class="ss-done-btn relative z-10'
            + '               w-full py-3 rounded-xl'
            + '               bg-gradient-to-r from-emerald-500 to-teal-500'
            + '               hover:from-emerald-400 hover:to-teal-400'
            + '               text-white font-bold text-sm'
            + '               shadow-md shadow-emerald-200'
            + '               hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
            + '               transition-all duration-150'
            + '               focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"'
            + '        style="animation:ss-slide-up 0.35s ease-out ' + btnDelay + 's both;">'
            + '  Done &mdash; Continue Browsing'
            + '</button>'

            + '</div>'
        );
    }

    // ─── Accessory line-item rows ──────────────────────────────────────────────

    /**
     * Renders one row per selected accessory with icon, name, qty × unit, and line total.
     * @param {number} startDelay  Animation delay for first item (seconds)
     * @param {number} increment   Extra delay per subsequent item (seconds)
     * @returns {string} HTML string
     */
    _itemsHtml(startDelay, increment) {
        if (!this.items || this.items.length === 0) return '';

        return this.items.map(function(item, idx) {
            var delay     = (startDelay + idx * increment).toFixed(2);
            var icon      = categoryIcon(item.category);
            var qtyLabel  = item.qty + '\u00a0\u00d7\u00a0' + formatCurrency(item.unitPrice);
            var lineTotal = formatCurrency(item.lineTotal);

            return (
                '<div class="ss-row flex items-center justify-between px-4 py-2.5 bg-white"'
                + '     style="animation:ss-slide-up 0.35s ease-out ' + delay + 's both;">'
                + '  <div class="flex items-center gap-2 min-w-0 flex-1">'
                + '    <span class="text-base shrink-0">' + icon + '</span>'
                + '    <div class="flex flex-col min-w-0">'
                + '      <span class="text-sm text-slate-700 font-medium leading-tight truncate">'
                + this._esc(item.name)
                + '      </span>'
                + '      <span class="text-xs text-slate-400 mt-0.5">' + qtyLabel + '</span>'
                + '    </div>'
                + '  </div>'
                + '  <span class="font-semibold text-slate-700 text-sm ml-3 shrink-0">'
                + lineTotal
                + '  </span>'
                + '</div>'
            );
        }.bind(this)).join('');
    }

    // ─── Confetti ─────────────────────────────────────────────────────────────

    _confettiHtml() {
        var colors = ['#f43f5e','#f97316','#eab308','#22c55e','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];
        var html   = '';
        var total  = 28;

        for (var i = 0; i < total; i++) {
            var color  = colors[i % colors.length];
            var size   = 6 + (i % 4) * 2;
            var radius = i % 3 === 0 ? '50%' : (i % 3 === 1 ? '3px' : '1px');
            var angle  = (i / total) * 360;
            var dist   = 80 + (i % 3) * 40;
            var rad    = angle * Math.PI / 180;
            var tx     = Math.round(Math.cos(rad) * dist);
            var ty     = Math.round(Math.sin(rad) * dist);
            var delay  = (i * 0.04).toFixed(2);
            var dur    = (0.7 + (i % 5) * 0.12).toFixed(2);

            html +=
                '<div style="'
                + 'position:absolute;top:28%;left:50%;'
                + 'width:' + size + 'px;height:' + size + 'px;'
                + 'background:' + color + ';border-radius:' + radius + ';'
                + 'animation:ss-confetti ' + dur + 's ease-out ' + delay + 's both;'
                + '--tx:' + tx + 'px;--ty:' + ty + 'px;'
                + '"></div>';
        }
        return html;
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    _bindClose() {
        var self = this;
        var btn  = this._container
            ? this._container.querySelector('.ss-done-btn')
            : null;
        if (btn) {
            btn.addEventListener('click', function() {
                self.onClose();
            });
        }
    }

    // ─── Styles ───────────────────────────────────────────────────────────────

    _injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style       = document.createElement('style');
        style.id        = STYLE_ID;
        style.textContent = [
            '@keyframes ss-confetti{',
            '  0%  {transform:translate(-50%,-50%) translate(0,0) rotate(0deg) scale(1);opacity:1}',
            '  60% {opacity:1}',
            '  100%{transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) rotate(540deg) scale(0);opacity:0}',
            '}',
            '@keyframes ss-circle-draw{from{stroke-dashoffset:145}to{stroke-dashoffset:0}}',
            '@keyframes ss-mark-draw  {from{stroke-dashoffset:50} to{stroke-dashoffset:0}}',
            '@keyframes ss-pop-in{',
            '  0%  {transform:scale(0.4);opacity:0}',
            '  65% {transform:scale(1.12);opacity:1}',
            '  100%{transform:scale(1);opacity:1}',
            '}',
            '@keyframes ss-slide-up{',
            '  from{transform:translateY(12px);opacity:0}',
            '  to  {transform:translateY(0);opacity:1}',
            '}',
            '.ss-icon-ring   {animation:ss-pop-in       0.5s cubic-bezier(.34,1.56,.64,1) 0.05s both}',
            '.ss-check-circle{animation:ss-circle-draw  0.45s ease-out 0.1s both}',
            '.ss-check-mark  {animation:ss-mark-draw    0.3s  ease-out 0.5s both}',
            '.ss-heading     {animation:ss-slide-up     0.4s  ease-out 0.15s both}',
            '.ss-heading-h3  {outline:none}',
            /* Honour OS-level reduced-motion preference: skip all animations */
            '@media (prefers-reduced-motion:reduce){',
            '  .ss-icon-ring,.ss-check-circle,.ss-check-mark,.ss-heading,.ss-row,.ss-done-btn{',
            '    animation:none !important;opacity:1 !important;transform:none !important',
            '  }',
            '}',
        ].join('\n');

        document.head.appendChild(style);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    _esc(val) {
        return String(val == null ? '' : val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
