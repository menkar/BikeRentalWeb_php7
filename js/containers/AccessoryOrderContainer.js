/**
 * AccessoryOrderContainer — Smart component that manages the accessory upsell flow.
 *
 * Responsibilities:
 *  1. Fetch accessories filtered by bike type from the API.
 *  2. Own the quantity selection state.
 *  3. Compute live subtotal, bundle discount, and grand total.
 *  4. Submit the order via the API and handle success/error.
 *  5. Render AccessoryItem presentational components into a Modal.
 *
 * It renders nothing itself — it delegates all HTML to AccessoryItem and Modal.
 *
 * SOLID:
 *  - S: Manages one workflow (accessory order) only.
 *  - O: Bundle rules can be externalised as a config option.
 *  - D: Depends on ApiService interface, not fetch() directly.
 *
 * Events emitted via options.onOrderSuccess and options.onSkip callbacks.
 */
import { Modal }          from '../components/Modal.js';
import { AccessoryItem }  from '../components/AccessoryItem.js';
import { SuccessScreen }  from '../components/SuccessScreen.js';
import { toast }          from '../components/Toast.js';
import { api }            from '../services/ApiService.js';
import { formatCurrency } from '../utils/formatters.js';

/** IDs that together trigger the bundle discount */
const BUNDLE_ID_A    = 1;
const BUNDLE_ID_B    = 3;
const BUNDLE_RATE    = 0.10;

export class AccessoryOrderContainer {
    /**
     * @param {Object} options
     * @param {string}   options.bikeType       'beach' | 'mountain'
     * @param {Object}   options.bike            The just-rented bike object
     * @param {Function} [options.onOrderSuccess] Called with order result after success
     * @param {Function} [options.onSkip]         Called when user skips accessories
     */
    constructor(options) {
        this.bikeType       = options.bikeType;
        this.bike           = options.bike;
        this.onOrderSuccess = options.onOrderSuccess ?? (() => {});
        this.onSkip         = options.onSkip ?? (() => {});

        /** @type {Object[]} */
        this._accessories = [];
        /** @type {Map<number, number>} accessoryId → quantity */
        this._quantities  = new Map();
        /** @type {Map<number, AccessoryItem>} accessoryId → component */
        this._items       = new Map();
        /** @type {boolean} */
        this._submitting  = false;

        this._modal = new Modal({
            title: 'Add Accessories to Your Rental',
            size:  'lg',
        });
    }

    /** Load accessories and open the modal. */
    async open() {
        this._modal.open(this._loadingTemplate());

        try {
            this._accessories = await api.get(
                '/accessory-handler.php',
                { bikeType: this.bikeType }
            );
            this._quantities.clear();
            this._accessories.forEach(a => this._quantities.set(a.AccessoryID, 0));
            this._renderContent();
        } catch (err) {
            this._modal.setContent(
                '<div class="flex flex-col items-center py-10 text-center text-slate-500 gap-3">'
                + '<span class="text-4xl">\u26A0\uFE0F</span>'
                + '<p class="font-medium">Could not load accessories.</p>'
                + '<p class="text-sm">' + this._esc(err.message) + '</p>'
                + '</div>'
            );
        }
    }

    // ─── Private — rendering ─────────────────────────────────────────────────

    _renderContent() {
        const contentEl = this._modal.getContentEl();
        if (!contentEl) return;

        contentEl.innerHTML = this._shellTemplate();

        const listEl = contentEl.querySelector('.accessory-list');
        this._items.clear();

        this._accessories.forEach(accessory => {
            const qty  = this._quantities.get(accessory.AccessoryID) ?? 0;
            const item = new AccessoryItem(
                listEl,
                accessory,
                qty,
                (id, newQty) => this._onQuantityChange(id, newQty)
            );
            item.mount();
            this._items.set(accessory.AccessoryID, item);
        });

        this._updateSummary();
        this._bindFooterButtons(contentEl);
    }

    _shellTemplate() {
        return `
            <!-- Bike context banner -->
            <div class="flex items-center gap-3 mb-5 p-4
                        bg-gradient-to-r from-slate-50 to-slate-100
                        rounded-xl border border-slate-200">
                <div class="w-10 h-10 rounded-xl bg-white border border-slate-200
                            flex items-center justify-center text-xl shadow-sm shrink-0">
                    🚲
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs text-slate-400 uppercase tracking-widest font-medium">
                        Just Rented
                    </p>
                    <p class="font-bold text-slate-800 text-sm truncate">
                        ${this._esc(this.bike?.modelName ?? '')}
                    </p>
                </div>
                <span class="inline-flex items-center gap-1 px-2.5 py-1
                             bg-emerald-100 text-emerald-700 rounded-full
                             text-xs font-semibold border border-emerald-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Confirmed
                </span>
            </div>

            <!-- Bundle deal hint -->
            <div class="bundle-hint flex items-start gap-3 mb-5 p-3.5
                        bg-amber-50 border border-amber-200 rounded-xl">
                <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center
                            justify-center text-base shrink-0">🎁</div>
                <div>
                    <p class="text-xs font-bold text-amber-800 mb-0.5">Bundle Deal Available</p>
                    <p class="text-xs text-amber-700 leading-snug">
                        Add a <strong>Water Bottle</strong> + <strong>Bike Light</strong>
                        together and get <strong>10% off</strong> your entire accessory total.
                    </p>
                </div>
            </div>

            <!-- Accessory list -->
            <div class="accessory-list flex flex-col gap-2"></div>

            <!-- Order summary (hidden until items selected) -->
            <div class="order-summary hidden mt-5 rounded-xl overflow-hidden border border-slate-200">
                <div class="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Order Summary
                    </p>
                </div>
                <div class="px-4 py-3 space-y-2 bg-white">
                    <div class="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span class="summary-subtotal font-semibold">$0.00</span>
                    </div>
                    <div class="bundle-row hidden flex justify-between text-sm">
                        <span class="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <span class="text-base">🎉</span>
                            Bundle discount (10%)
                        </span>
                        <span class="summary-discount font-bold text-emerald-600">−$0.00</span>
                    </div>
                </div>
                <div class="flex justify-between items-center
                            px-4 py-3 bg-slate-800 text-white">
                    <span class="font-semibold text-sm">Total</span>
                    <span class="summary-total text-lg font-extrabold">$0.00</span>
                </div>
            </div>

            <!-- Footer actions -->
            <div class="flex gap-3 mt-5 pt-4 border-t border-slate-100">
                <button class="skip-btn
                               flex-1 py-3 px-4 rounded-xl
                               border-2 border-slate-200
                               text-slate-600 font-bold text-sm
                               hover:border-slate-300 hover:bg-slate-50
                               transition-all duration-150
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                    Skip for Now
                </button>
                <button class="confirm-btn
                               flex-1 py-3 px-4 rounded-xl
                               bg-gradient-to-r from-sky-500 to-cyan-500
                               text-white font-bold text-sm
                               shadow-md shadow-sky-200
                               hover:from-sky-400 hover:to-cyan-400
                               hover:shadow-lg hover:-translate-y-0.5
                               active:translate-y-0
                               transition-all duration-150
                               disabled:opacity-50 disabled:cursor-not-allowed
                               disabled:shadow-none disabled:translate-y-0
                               flex items-center justify-center gap-2
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        disabled>
                    Confirm Order
                </button>
            </div>
        `;
    }

    _loadingTemplate() {
        var skeletonRow =
            '<div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 animate-pulse">'
            + '<div class="w-11 h-11 bg-slate-200 rounded-xl shrink-0"></div>'
            + '<div class="flex-1 space-y-2">'
            + '  <div class="h-3.5 bg-slate-200 rounded-lg w-3/4"></div>'
            + '  <div class="h-3 bg-slate-200 rounded-lg w-1/2"></div>'
            + '</div>'
            + '<div class="flex items-center gap-2 shrink-0">'
            + '  <div class="w-8 h-8 bg-slate-200 rounded-lg"></div>'
            + '  <div class="w-7 h-4 bg-slate-200 rounded"></div>'
            + '  <div class="w-8 h-8 bg-slate-200 rounded-lg"></div>'
            + '</div>'
            + '</div>';

        return (
            '<div class="flex flex-col gap-3 py-2">'
            + skeletonRow + skeletonRow + skeletonRow + skeletonRow
            + '</div>'
        );
    }

    // ─── Private — logic ─────────────────────────────────────────────────────

    _onQuantityChange(id, qty) {
        this._quantities.set(id, qty);
        this._updateSummary();
    }

    _updateSummary() {
        const contentEl = this._modal.getContentEl();
        if (!contentEl) return;

        const { subtotal, discount, total, bundleApplied, hasItems } = this._calculate();

        const summaryEl    = contentEl.querySelector('.order-summary');
        const bundleRow    = contentEl.querySelector('.bundle-row');
        const subtotalEl   = contentEl.querySelector('.summary-subtotal');
        const discountEl   = contentEl.querySelector('.summary-discount');
        const totalEl      = contentEl.querySelector('.summary-total');
        const confirmBtn   = contentEl.querySelector('.confirm-btn');

        if (hasItems) {
            summaryEl?.classList.remove('hidden');
        } else {
            summaryEl?.classList.add('hidden');
        }

        if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
        if (discountEl) discountEl.textContent = '\u2212' + formatCurrency(discount);
        if (totalEl)    totalEl.textContent    = formatCurrency(total);

        bundleApplied
            ? bundleRow?.classList.remove('hidden')
            : bundleRow?.classList.add('hidden');

        if (confirmBtn) confirmBtn.disabled = !hasItems;
    }

    _calculate() {
        let subtotal = 0;
        let hasItems = false;

        for (const acc of this._accessories) {
            const qty = this._quantities.get(acc.AccessoryID) ?? 0;
            if (qty > 0) {
                subtotal += acc.UnitPrice * qty;
                hasItems = true;
            }
        }

        const bundleApplied = hasItems
            && (this._quantities.get(BUNDLE_ID_A) ?? 0) > 0
            && (this._quantities.get(BUNDLE_ID_B) ?? 0) > 0;

        const discount = bundleApplied ? Math.round(subtotal * BUNDLE_RATE * 100) / 100 : 0;
        const total    = Math.round((subtotal - discount) * 100) / 100;

        return { subtotal, discount, total, bundleApplied, hasItems };
    }

    _bindFooterButtons(contentEl) {
        contentEl.querySelector('.skip-btn')?.addEventListener('click', () => {
            this._modal.close();
            this.onSkip();
        });

        contentEl.querySelector('.confirm-btn')?.addEventListener('click', async () => {
            if (this._submitting) return;
            await this._submitOrder(contentEl);
        });
    }

    async _submitOrder(contentEl) {
        this._submitting = true;
        const confirmBtn = contentEl.querySelector('.confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML =
                '<span class="w-4 h-4 border-2 border-white/40 border-t-white'
                + ' rounded-full animate-spin"></span>'
                + '<span>Placing order\u2026</span>';
        }

        const payload = [];
        for (const [id, qty] of this._quantities) {
            if (qty > 0) payload.push({ AccessoryID: id, Quantity: qty });
        }

        try {
            const result = await api.post('/accessory-handler.php', payload);

            if (result.Success) {
                this._showSuccess(result);
            } else {
                toast.show(result.Message ?? 'Order failed.', 'error');
                this._resetConfirmBtn(confirmBtn);
            }
        } catch (err) {
            toast.show(err.message ?? 'Network error placing order.', 'error');
            this._resetConfirmBtn(confirmBtn);
        } finally {
            this._submitting = false;
        }
    }

    _showSuccess(result) {
        var contentEl = this._modal.getContentEl();
        if (!contentEl) return;

        // Build ordered line-items from selected accessories so SuccessScreen
        // can render the full receipt (name, qty, unit price, line total).
        var lineItems = [];
        var self      = this;
        this._accessories.forEach(function(acc) {
            var qty = self._quantities.get(acc.AccessoryID) || 0;
            if (qty > 0) {
                lineItems.push({
                    name:      acc.Name,
                    category:  acc.Category || '',
                    qty:       qty,
                    unitPrice: acc.UnitPrice,
                    lineTotal: Math.round(acc.UnitPrice * qty * 100) / 100,
                });
            }
        });

        var screen = new SuccessScreen({
            result,
            bike:    this.bike,
            items:   lineItems,
            onClose: function() {
                self._modal.close();
                self.onOrderSuccess(result);
            },
        });

        screen.mount(contentEl);
    }

    _resetConfirmBtn(btn) {
        if (!btn) return;
        btn.disabled = false;
        btn.innerHTML = 'Confirm Order';
    }

    _esc(val) {
        return String(val ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
