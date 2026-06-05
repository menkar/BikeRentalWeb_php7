/**
 * home.js — Bootstrapper for index.html
 *
 * Wires up the reset easter egg with a confirmation dialog
 * and toast feedback. No business logic lives here.
 *
 * Security: `showConfirm` previously inserted `title` and `message` directly
 * into an innerHTML template literal. Even though these strings are currently
 * hardcoded in this file, using `_esc()` future-proofs the function against
 * any caller that might pass user-controlled text, preventing XSS.
 */
import { toast } from '../components/Toast.js';
import { api }   from '../services/ApiService.js';

function init() {
    var resetTrigger = document.getElementById('easterEggBike');
    if (!resetTrigger) return;

    resetTrigger.addEventListener('click', function() {
        showConfirm(
            'Reset all data?',
            'This will restore every bike and refill all accessory stock to defaults.',
            async function() {
                toast.show('Resetting all data\u2026', 'info');
                try {
                    var result = await api.post('/bike-handler.php?action=reset', {});
                    if (result.Success) {
                        toast.show('All data reset! Every bike is back. \uD83D\uDD04', 'success');
                    } else {
                        toast.show(result.Message || 'Reset failed.', 'error');
                    }
                } catch (err) {
                    toast.show('Reset failed: ' + err.message, 'error');
                }
            }
        );
    });
}

/**
 * Inline micro confirm-dialog (avoids a full Modal dependency on the home page).
 *
 * All user-visible strings are escaped through _esc() before being set as
 * text content or via createElement to prevent XSS injection.
 *
 * @param {string}   title
 * @param {string}   message
 * @param {Function} onConfirm
 */
function showConfirm(title, message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = [
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm',
    ].join(' ');

    // Build the dialog DOM with createElement + textContent for all
    // user-facing strings — zero innerHTML for dynamic values.
    var panel = document.createElement('div');
    panel.className = 'bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all duration-200';

    var iconWrap = document.createElement('div');
    iconWrap.className = 'w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4';
    iconWrap.setAttribute('aria-hidden', 'true');
    iconWrap.textContent = '\u26A0\uFE0F';

    var heading = document.createElement('h3');
    heading.className = 'font-bold text-slate-800 text-lg mb-2';
    heading.textContent = title;    // textContent — safe, no XSS surface

    var body = document.createElement('p');
    body.className = 'text-slate-500 text-sm mb-6';
    body.textContent = message;     // textContent — safe, no XSS surface

    var btnRow = document.createElement('div');
    btnRow.className = 'flex gap-3';

    var cancelBtn = document.createElement('button');
    cancelBtn.id        = 'confirmCancel';
    cancelBtn.className = 'flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors';
    cancelBtn.textContent = 'Cancel';

    var okBtn = document.createElement('button');
    okBtn.id        = 'confirmOk';
    okBtn.className = 'flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors';
    okBtn.textContent = 'Yes, Reset';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    panel.appendChild(iconWrap);
    panel.appendChild(heading);
    panel.appendChild(body);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);

    document.body.appendChild(overlay);

    cancelBtn.addEventListener('click', function() { overlay.remove(); });
    okBtn.addEventListener('click', function() {
        overlay.remove();
        onConfirm();
    });
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

document.addEventListener('DOMContentLoaded', init);
