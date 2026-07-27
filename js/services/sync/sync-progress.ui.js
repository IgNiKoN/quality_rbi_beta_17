/* Файл: js/services/sync/sync-progress.ui.js
 * Фиксированный прогресс-тост синхронизации (#mini-sync-toast).
 * Показывается только при 1-й полной / manual (решает sync-engine).
 */

(function () {
    'use strict';

    const STEPS = [
        'Подготовка',
        'Проверки',
        'Задачи',
        'Справочники',
        'СК / стройконтроль',
        'Отправка',
        'Завершение',
        'Готово'
    ];

    let active = false;
    let stepIndex = 0; // 0-based
    let pulled = 0;
    let pushed = 0;
    let statusOverride = null;
    let hideTimer = null;

    function ensureToast() {
        let root = document.getElementById('mini-sync-toast');
        if (root && root.querySelector('#mini-sync-toast-dl')) return root;

        if (root) root.remove();
        root = document.createElement('div');
        root.id = 'mini-sync-toast';
        root.className = 'fixed left-1/2 bottom-24 z-[9000] w-[280px] bg-slate-900/95 text-white rounded-2xl shadow-xl px-4 py-3 text-[11px] font-bold hidden border border-white/10 backdrop-blur-md -translate-x-1/2';
        root.innerHTML = `
            <div class="flex items-center gap-2 mb-1.5">
                <span id="mini-sync-toast-spin" class="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0"></span>
                <span id="mini-sync-toast-status" class="flex-1 truncate tracking-wide uppercase text-[10px] text-white/80">Синхронизация</span>
                <span id="mini-sync-toast-count" class="tabular-nums shrink-0 text-white">— / —</span>
            </div>
            <div id="mini-sync-toast-body">
                <div class="h-1.5 w-full rounded-full bg-white/15 overflow-hidden mb-2">
                    <div id="mini-sync-toast-bar" class="h-full bg-emerald-400 rounded-full transition-[width] duration-200" style="width:0%"></div>
                </div>
                <div class="flex justify-between gap-2 tabular-nums text-[10px] text-white/75 font-semibold">
                    <span>↓ <span id="mini-sync-toast-dl" class="text-white">0</span></span>
                    <span>↑ <span id="mini-sync-toast-up" class="text-white">0</span></span>
                </div>
            </div>
        `;
        document.body.appendChild(root);
        return root;
    }

    function paint(phase) {
        const root = ensureToast();
        const m = STEPS.length;
        const n = Math.min(m, Math.max(1, stepIndex + 1));
        const pct = Math.min(100, Math.round((n / m) * 100));
        const statusEl = root.querySelector('#mini-sync-toast-status');
        const countEl = root.querySelector('#mini-sync-toast-count');
        const barEl = root.querySelector('#mini-sync-toast-bar');
        const spinEl = root.querySelector('#mini-sync-toast-spin');
        const dlEl = root.querySelector('#mini-sync-toast-dl');
        const upEl = root.querySelector('#mini-sync-toast-up');

        if (dlEl) dlEl.textContent = String(pulled);
        if (upEl) upEl.textContent = String(pushed);

        if (phase === 'fail') {
            if (statusEl) statusEl.textContent = statusOverride || 'Ошибка sync';
            if (countEl) countEl.textContent = `${n} / ${m}`;
            if (barEl) barEl.style.width = pct + '%';
            if (spinEl) spinEl.classList.add('hidden');
            return;
        }
        if (phase === 'done') {
            if (statusEl) statusEl.textContent = statusOverride || 'Готово';
            if (countEl) countEl.textContent = `${m} / ${m}`;
            if (barEl) barEl.style.width = '100%';
            if (spinEl) spinEl.classList.add('hidden');
            return;
        }

        const label = STEPS[stepIndex] || 'Синхронизация';
        if (statusEl) statusEl.textContent = label;
        if (countEl) countEl.textContent = `${n} / ${m}`;
        if (barEl) barEl.style.width = pct + '%';
        if (spinEl) spinEl.classList.remove('hidden');
    }

    function clearHideTimer() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    const api = {
        STEPS: STEPS,

        isActive: function () {
            return active;
        },

        begin: function () {
            clearHideTimer();
            active = true;
            stepIndex = 0;
            pulled = 0;
            pushed = 0;
            statusOverride = null;
            const root = ensureToast();
            root.classList.remove('hidden');
            paint();
        },

        /** @param {number|string} step — 1-based index или ключ/подпись */
        setStep: function (step) {
            if (!active) return;
            if (typeof step === 'number') {
                stepIndex = Math.max(0, Math.min(STEPS.length - 1, step - 1));
            } else if (typeof step === 'string') {
                const idx = STEPS.findIndex((s) => s === step || s.toLowerCase() === String(step).toLowerCase());
                if (idx >= 0) stepIndex = idx;
            }
            paint();
        },

        addPulled: function (n) {
            if (!active) return;
            pulled += Math.max(0, Number(n) || 0);
            paint();
        },

        addPushed: function (n) {
            if (!active) return;
            pushed += Math.max(0, Number(n) || 0);
            paint();
        },

        setCounts: function (down, up) {
            if (!active) return;
            if (down != null) pulled = Math.max(0, Number(down) || 0);
            if (up != null) pushed = Math.max(0, Number(up) || 0);
            paint();
        },

        done: function (opts) {
            const root = document.getElementById('mini-sync-toast');
            if (!active && !root) return;
            if (opts && (opts.pulled != null || opts.pushed != null)) {
                if (opts.pulled != null) pulled = Math.max(0, Number(opts.pulled) || 0);
                if (opts.pushed != null) pushed = Math.max(0, Number(opts.pushed) || 0);
            }
            statusOverride = (opts && opts.summary) ? String(opts.summary) : 'Готово';
            stepIndex = STEPS.length - 1;
            active = false;
            if (root) root.classList.remove('hidden');
            paint('done');
            clearHideTimer();
            hideTimer = setTimeout(function () {
                api.hide();
            }, (opts && opts.hideAfterMs) || 2500);
        },

        fail: function (opts) {
            const root = document.getElementById('mini-sync-toast');
            if (!active && !root) return;
            statusOverride = (opts && opts.summary) ? String(opts.summary) : 'Ошибка sync';
            active = false;
            if (root) root.classList.remove('hidden');
            paint('fail');
            clearHideTimer();
            hideTimer = setTimeout(function () {
                api.hide();
            }, (opts && opts.hideAfterMs) || 3000);
        },

        hide: function () {
            clearHideTimer();
            active = false;
            statusOverride = null;
            const root = document.getElementById('mini-sync-toast');
            if (root) root.classList.add('hidden');
        }
    };

    window.rbiSyncProgress = api;
})();
