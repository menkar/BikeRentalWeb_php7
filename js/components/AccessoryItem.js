/**
 * AccessoryItem — Presentational component for a single accessory row.
 *
 * Renders one accessory with:
 *  - Category icon badge
 *  - Name, description, price, stock status
 *  - +/- quantity stepper with live stock-limit enforcement
 *  - Inline "Max stock reached" message when quantity hits the ceiling
 *  - Row highlight when quantity > 0
 *  - Bundle tip indicator (IDs 1 and 3)
 *
 * The stock-limit message is shown/hidden via updateQuantity() so it works
 * both on mount (if somehow pre-populated) and after every user interaction.
 *
 * SOLID:
 *  - S: Renders and controls one accessory row only.
 *  - O: Message copy and threshold are derived from accessory data — no hardcoding.
 *  - L: Interchangeable in any accessory list container.
 *  - I: Receives exactly the data it needs.
 *  - D: No dependency on containers, stores, or network calls.
 */

/** Accessory IDs that form the bundle deal — highlighted with a badge */
const BUNDLE_IDS = new Set([1, 3]);

/** Maps lowercase category names to display emoji */
const CATEGORY_ICONS = {
    hydration:  '💧',
    safety:     '🔒',
    lighting:   '💡',
    protection: '🪖',
    storage:    '🎒',
    lock:       '🔒',
    helmet:     '🪖',
};

export class AccessoryItem {
    /**
     * @param {HTMLElement} container
     * @param {Object}      accessory  { AccessoryID, Name, Category, Description, UnitPrice, StockCount }
     * @param {number}      quantity   Initial selected quantity
     * @param {Function}    onChange   (accessoryId: number, newQty: number) => void
     */
    constructor(container, accessory, quantity, onChange) {
        this.container = container;
        this.accessory = accessory;
        this.quantity  = quantity;
        this.onChange  = onChange;
        this.element   = null;
    }

    mount() {
        this.element = document.createElement('div');
        this.element.className = this._rowClasses(false);
        this.element.dataset.id = String(this.accessory.AccessoryID);
        this._render();
        this.container.appendChild(this.element);
        this._bindEvents();
        return this;
    }

    /**
     * Update the quantity display, button states, row highlight, and
     * stock-limit message — without a full re-render.
     * @param {number} qty
     */
    updateQuantity(qty) {
        this.quantity = qty;

        var a       = this.accessory;
        var name    = a.Name || 'item';
        var qtyEl   = this.element ? this.element.querySelector('.qty-display')    : null;
        var decBtn  = this.element ? this.element.querySelector('.qty-dec')         : null;
        var incBtn  = this.element ? this.element.querySelector('.qty-inc')         : null;
        var msgEl   = this.element ? this.element.querySelector('.stock-limit-msg') : null;
        var row     = this.element;

        // Quantity number + accessible label
        if (qtyEl) {
            qtyEl.textContent = String(qty);
            qtyEl.setAttribute('aria-label', 'Quantity: ' + qty + ' of ' + name);
        }

        // Stepper button states + descriptive labels
        if (decBtn) {
            decBtn.disabled = qty <= 0;
            decBtn.setAttribute('aria-label', 'Decrease quantity of ' + name + ' (currently ' + qty + ')');
        }
        if (incBtn) {
            incBtn.disabled = qty >= a.StockCount;
            incBtn.setAttribute('aria-label', 'Increase quantity of ' + name + ' (currently ' + qty + ')');
        }

        // Row highlight
        if (row) {
            var selected = qty > 0;
            if (selected) {
                row.classList.add('bg-sky-50', 'border-sky-200');
                row.classList.remove('bg-white', 'border-slate-100');
            } else {
                row.classList.remove('bg-sky-50', 'border-sky-200');
                row.classList.add('bg-white', 'border-slate-100');
            }
        }

        // Stock-limit message — visible only when qty equals the stock ceiling.
        // The message has aria-live="polite" so it is announced when revealed.
        if (msgEl) {
            var atMax = qty >= a.StockCount && a.StockCount > 0;
            if (atMax) {
                msgEl.classList.remove('hidden');
            } else {
                msgEl.classList.add('hidden');
            }
        }
    }

    // ─── Private — render ─────────────────────────────────────────────────────

    _render() {
        var a        = this.accessory;
        var inStock  = a.StockCount > 0;
        var isBundle = BUNDLE_IDS.has(a.AccessoryID);
        var catKey   = (a.Category || '').toLowerCase();
        var catIcon  = CATEGORY_ICONS[catKey] || '📦';
        var nameId   = 'acc-name-' + a.AccessoryID;
        var name     = a.Name || 'item';

        // Icon badge (decorative — category text follows below)
        var iconBg = inStock
            ? 'bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100'
            : 'bg-slate-100 grayscale opacity-60';

        // Bundle badge (only on bundle items)
        var bundleBadge = isBundle
            ? '<span class="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700'
              + ' text-[10px] font-bold uppercase tracking-wide border border-amber-200 shrink-0"'
              + ' aria-label="Part of bundle deal">'
              + 'Bundle</span>'
            : '';

        // Stock label
        var stockLabelClass = inStock ? 'text-emerald-600' : 'text-rose-500';
        var stockText       = inStock ? (a.StockCount + ' left') : 'Out of stock';

        // Stock limit inline message (hidden by default; aria-live so it's announced on reveal)
        var stockLimitMsg =
            '<div class="stock-limit-msg hidden flex items-center gap-1.5 mt-2'
            + ' px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200"'
            + ' role="status" aria-live="polite" aria-atomic="true">'
            + '  <span aria-hidden="true" class="text-amber-500 text-xs shrink-0">\u26A0\uFE0F</span>'
            + '  <span class="text-amber-700 text-xs font-medium leading-tight">'
            + '    Max quantity reached &mdash; only ' + a.StockCount
            + (a.StockCount === 1 ? ' unit' : ' units') + ' available'
            + '  </span>'
            + '</div>';

        // Stepper disabled states
        var decDisabled = this.quantity <= 0 ? 'disabled' : '';
        var incDisabled = (!inStock || this.quantity >= a.StockCount) ? 'disabled' : '';
        var decLabel    = 'Decrease quantity of ' + name + ' (currently ' + this.quantity + ')';
        var incLabel    = 'Increase quantity of ' + name + ' (currently ' + this.quantity + ')';
        var qtyLabel    = 'Quantity: ' + this.quantity + ' of ' + name;

        this.element.innerHTML =
            // ── Category icon (decorative) ─────────────────────────────────
            '<div aria-hidden="true"'
            + ' class="w-11 h-11 rounded-xl flex items-center justify-center'
            + ' shrink-0 self-start mt-0.5 text-xl ' + iconBg + '">'
            + catIcon
            + '</div>'

            // ── Info block ────────────────────────────────────────────────
            + '<div class="flex-1 min-w-0">'
            + '  <div class="flex items-center gap-2 flex-wrap">'
            + '    <p id="' + nameId + '" class="font-semibold text-slate-800 text-sm leading-snug">'
            + this._esc(a.Name)
            + '</p>'
            + bundleBadge
            + '  </div>'
            + '  <p class="text-xs text-slate-400 leading-snug mt-0.5">' + this._esc(a.Description) + '</p>'
            + '  <div class="flex items-center gap-2 mt-1.5">'
            + '    <span class="text-sm font-bold text-slate-700">$' + Number(a.UnitPrice).toFixed(2) + '</span>'
            + '    <span class="text-[11px] font-semibold ' + stockLabelClass + '">' + stockText + '</span>'
            + '  </div>'
            + stockLimitMsg
            + '</div>'

            // ── Qty stepper group ──────────────────────────────────────────
            // role="group" + aria-labelledby links the stepper to the item name
            + '<div role="group"'
            + '     aria-labelledby="' + nameId + '"'
            + '     class="flex items-center gap-1.5 shrink-0 self-start mt-1">'
            + '  <button class="qty-dec w-8 h-8 flex items-center justify-center'
            + '                 rounded-lg border border-slate-200 text-slate-600'
            + '                 text-lg leading-none font-bold select-none'
            + '                 transition-all duration-150'
            + '                 hover:enabled:bg-slate-100 hover:enabled:border-slate-300'
            + '                 disabled:opacity-30 disabled:cursor-not-allowed'
            + '                 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"'
            + '          aria-label="' + decLabel + '" ' + decDisabled + '>\u2212</button>'
            + '  <span class="qty-display w-7 text-center font-bold text-slate-800'
            + '               text-sm tabular-nums select-none"'
            + '        aria-live="polite" aria-atomic="true"'
            + '        aria-label="' + qtyLabel + '">' + this.quantity + '</span>'
            + '  <button class="qty-inc w-8 h-8 flex items-center justify-center'
            + '                 rounded-lg border border-slate-200 text-slate-600'
            + '                 text-lg leading-none font-bold select-none'
            + '                 transition-all duration-150'
            + '                 hover:enabled:bg-slate-100 hover:enabled:border-slate-300'
            + '                 disabled:opacity-30 disabled:cursor-not-allowed'
            + '                 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"'
            + '          aria-label="' + incLabel + '" ' + incDisabled + '>+</button>'
            + '</div>';
    }

    _rowClasses(selected) {
        var base = [
            'accessory-item flex items-start gap-3',
            'px-3 py-3 rounded-xl border',
            'transition-all duration-200',
        ];
        if (selected) {
            base.push('bg-sky-50 border-sky-200');
        } else {
            base.push('bg-white border-slate-100');
        }
        return base.join(' ');
    }

    // ─── Private — events ─────────────────────────────────────────────────────

    _bindEvents() {
        var self = this;
        var dec  = this.element ? this.element.querySelector('.qty-dec') : null;
        var inc  = this.element ? this.element.querySelector('.qty-inc') : null;

        if (dec) {
            dec.addEventListener('click', function() {
                var next = Math.max(0, self.quantity - 1);
                if (next !== self.quantity) {
                    self.updateQuantity(next);
                    self.onChange && self.onChange(self.accessory.AccessoryID, next);
                }
            });
        }

        if (inc) {
            inc.addEventListener('click', function() {
                var max  = self.accessory.StockCount;
                var next = Math.min(max, self.quantity + 1);
                if (next !== self.quantity) {
                    self.updateQuantity(next);
                    self.onChange && self.onChange(self.accessory.AccessoryID, next);
                }
            });
        }
    }

    // ─── Private — helpers ────────────────────────────────────────────────────

    _esc(val) {
        return String(val == null ? '' : val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
