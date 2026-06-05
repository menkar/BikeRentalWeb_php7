/**
 * BikeListContainer — Smart component that manages the bike catalog page.
 *
 * Responsibilities:
 *  1. Fetch the bike list from the API on mount.
 *  2. Own filter and sort state.
 *  3. Render BikeCard presentational components.
 *  4. Orchestrate the rent → accessory upsell flow.
 *  5. Handle errors and empty states gracefully.
 *
 * Page-specific config (bike type, field mapping, theme) is injected via
 * the constructor so this container works for BOTH beach and mountain pages
 * without a single conditional branch inside.
 *
 * SOLID:
 *  - S: Manages bike list state and rent workflow only.
 *  - O: New bike types supported via config injection — no code changes.
 *  - D: Depends on ApiService and component interfaces, not implementations.
 */
import { BikeCard }                   from '../components/BikeCard.js';
import { LoadingSpinner, EmptyState } from '../components/LoadingSpinner.js';
import { AccessoryOrderContainer }    from './AccessoryOrderContainer.js';
import { toast }                      from '../components/Toast.js';
import { api }                        from '../services/ApiService.js';

/**
 * Normalise both beach (snake_case) and mountain (PascalCase) API responses
 * into a single camelCase shape.
 *
 * Beach fields:  bike_id, model_name, color, frame_size, daily_rate, is_available
 * Mountain fields: BikeID, ModelName, Brand, GearCount, SuspensionType,
 *                  FrameMaterial, DailyRate, IsAvailable, Terrain, WeightKg
 *
 * @param {Object} raw    Raw API response item
 * @param {string} type   'beach' | 'mountain'
 * @returns {Object}      Normalised bike
 */
function normaliseBike(raw, type) {
    if (type === 'beach') {
        return {
            id:             raw.bike_id,
            modelName:      raw.model_name,
            color:          raw.color,
            frameSize:      raw.frame_size,
            dailyRate:      raw.daily_rate,
            isAvailable:    raw.is_available,
            brand:          null,
            gearCount:      null,
            suspensionType: null,
            frameMaterial:  null,
            terrain:        null,
            weightKg:       null,
        };
    }
    return {
        id:             raw.BikeID,
        modelName:      raw.ModelName,
        color:          null,
        frameSize:      null,
        dailyRate:      raw.DailyRate,
        isAvailable:    raw.IsAvailable,
        brand:          raw.Brand,
        gearCount:      raw.GearCount,
        suspensionType: raw.SuspensionType,
        frameMaterial:  raw.FrameMaterial,
        terrain:        raw.Terrain,
        weightKg:       raw.WeightKg,
    };
}

export class BikeListContainer {
    /**
     * @param {Object} config
     * @param {string}   config.bikeType       'beach' | 'mountain'
     * @param {string}   config.apiAction       'beach' | 'mountain'
     * @param {string}   config.gridSelector    CSS selector for the card grid
     * @param {string}   config.filterSelector  CSS selector for the available-only checkbox
     * @param {string}   config.sortSelector    CSS selector for the sort <select>
     * @param {Object}   config.theme           { icon, iconBg, btnBg, accent }
     */
    constructor(config) {
        this.config = config;

        /** @type {Object[]} all normalised bikes */
        this._bikes     = [];
        /** @type {BikeCard[]} mounted card components */
        this._cards     = [];
        /** @type {boolean} */
        this._loading   = false;
        /** @type {{ availableOnly: boolean, sort: string }} */
        this._filters   = { availableOnly: false, sort: 'default' };

        this._gridEl    = document.querySelector(config.gridSelector);
        this._filterEl  = document.querySelector(config.filterSelector);
        this._sortEl    = document.querySelector(config.sortSelector);
        this._statusEl  = document.getElementById('bike-count-status');

        this._spinner   = new LoadingSpinner(this._gridEl, 'skeleton', 6);
        this._empty     = new EmptyState(
            this._gridEl,
            config.theme.icon ?? '🚲',
            'No bikes match your filters.'
        );
    }

    /** Initialise: bind controls, load data. */
    async mount() {
        this._bindControls();
        await this._loadBikes();
        return this;
    }

    /** Reload the bike list (e.g. after a rent). */
    async refresh() {
        await this._loadBikes();
    }

    // ─── Private — data ───────────────────────────────────────────────────────

    async _loadBikes() {
        if (this._loading) return;
        this._loading = true;
        this._clearCards();
        if (this._gridEl) this._gridEl.setAttribute('aria-busy', 'true');
        this._spinner.show();

        try {
            const raw = await api.get(
                '/bike-handler.php',
                { action: this.config.apiAction }
            );
            this._bikes = raw.map(b => normaliseBike(b, this.config.bikeType));
            this._renderBikes();
        } catch (err) {
            this._spinner.hide();
            toast.show('Failed to load bikes: ' + err.message, 'error');
        } finally {
            this._loading = false;
        }
    }

    // ─── Private — rendering ─────────────────────────────────────────────────

    _renderBikes() {
        this._spinner.hide();
        this._empty.hide();
        this._clearCards();

        const visible = this._applyFilters(this._bikes);
        const total   = this._bikes.length;

        // Update ARIA busy state now that content is ready
        if (this._gridEl) this._gridEl.setAttribute('aria-busy', 'false');

        // Announce result count to screen readers via the dedicated status region.
        // Clear first so identical counts (e.g. after a no-op filter toggle) still re-announce.
        if (this._statusEl) {
            this._statusEl.textContent = '';
            const msg = this._filters.availableOnly
                ? 'Showing ' + visible.length + ' available bike' + (visible.length !== 1 ? 's' : '')
                    + ' out of ' + total + ' total.'
                : 'Showing ' + visible.length + ' bike' + (visible.length !== 1 ? 's' : '') + '.';
            setTimeout(() => { if (this._statusEl) this._statusEl.textContent = msg; }, 50);
        }

        if (!visible.length) {
            this._empty.show();
            return;
        }

        visible.forEach(bike => {
            const card = new BikeCard(
                this._gridEl,
                bike,
                this.config.theme,
                (b) => this._onRent(b)
            );
            card.mount();
            this._cards.push(card);
        });
    }

    _clearCards() {
        this._cards.forEach(c => c.element?.remove());
        this._cards = [];
    }

    _applyFilters(bikes) {
        let list = [...bikes];
        if (this._filters.availableOnly) {
            list = list.filter(b => b.isAvailable);
        }
        switch (this._filters.sort) {
            case 'price-asc':  list.sort((a, b) => a.dailyRate - b.dailyRate); break;
            case 'price-desc': list.sort((a, b) => b.dailyRate - a.dailyRate); break;
            case 'name-asc':   list.sort((a, b) => a.modelName.localeCompare(b.modelName)); break;
        }
        return list;
    }

    // ─── Private — rent flow ─────────────────────────────────────────────────

    async _onRent(bike) {
        const card = this._cards.find(c => c.bike.id === bike.id);
        card?.setRenting(true);

        try {
            const result = await api.post('/bike-handler.php?action=rent', {
                bikeType: this.config.bikeType,
                bikeId:   bike.id,
            });

            if (!result.Success) {
                toast.show(result.Message ?? 'Could not rent bike.', 'error');
                card?.setRenting(false);
                return;
            }

            // Optimistically mark unavailable
            bike.isAvailable = false;
            card?.setRenting(false);

            // Open accessory upsell
            const order = new AccessoryOrderContainer({
                bikeType:       this.config.bikeType,
                bike,
                onOrderSuccess: (res) => {
                    toast.show('Order placed! Enjoy your ride. 🎉', 'success');
                    this.refresh();
                },
                onSkip: () => {
                    toast.show('Bike rented. Accessories skipped — you can always come back!', 'info');
                    this.refresh();
                },
            });

            await order.open();

        } catch (err) {
            toast.show(err.message ?? 'Network error. Please try again.', 'error');
            card?.setRenting(false);
        }
    }

    // ─── Private — controls ───────────────────────────────────────────────────

    _bindControls() {
        this._filterEl?.addEventListener('change', (e) => {
            this._filters.availableOnly = e.target.checked;
            this._renderBikes();
        });

        this._sortEl?.addEventListener('change', (e) => {
            this._filters.sort = e.target.value;
            this._renderBikes();
        });
    }
}
