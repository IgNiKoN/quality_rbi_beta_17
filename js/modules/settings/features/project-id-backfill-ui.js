/**
 * project-id-backfill-ui.js
 * Admin UI: backfill projectId + merge написаний объектов (Настройки → Миграция данных).
 * Зеркало contractor-id-backfill-ui.js.
 */

let _delegationBound = false;
let _running = false;

function _svc() {
    return (window.RBI && window.RBI.services && window.RBI.services.objects) || window.ObjectDirectory || null;
}

function _perm() {
    return (window.RBI && window.RBI.services && window.RBI.services.permissions) || null;
}

function _toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
}

function _isAdmin() {
    const p = _perm();
    return !!(p && p.isAdmin?.());
}

function _cloudReady() {
    return !!(window.supabaseClient && window.syncConfig && window.syncConfig.enabled);
}

function _escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _formatCounters(c) {
    const x = c || {};
    return `обновлено ${x.updated || 0} · уже было ${x.already || 0} · без матча ${x.unmatched || 0} · пропущено ${x.skipped || 0} · ошибок ${x.errors || 0}`;
}

function _renderProgressHtml(progress) {
    if (!progress) {
        return '<div class="text-[10px] text-[var(--text-muted)]">Ещё не запускалось.</div>';
    }
    const totals = progress.totals || {};
    const tables = progress.tables || {};
    const phase = progress.phase || '';
    const tableKeys = Object.keys(tables);
    const rows = tableKeys.map((key) => {
        return `<div class="flex justify-between gap-2 text-[10px] py-0.5 border-b border-[var(--card-border)]/60 last:border-0">
            <span class="font-mono text-slate-600 dark:text-slate-300">${_escapeHtml(key)}</span>
            <span class="text-right text-[var(--text-muted)]">${_escapeHtml(_formatCounters(tables[key]))}</span>
        </div>`;
    }).join('');

    const phaseLabel = phase === 'done'
        ? 'Готово'
        : (phase ? `В процессе: ${phase}${progress.table ? ' / ' + progress.table : ''}` : '');

    return `
        <div class="space-y-2">
            <div class="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">${_escapeHtml(phaseLabel)}</div>
            <div class="text-[11px] font-bold text-slate-800 dark:text-white">Итого: ${_escapeHtml(_formatCounters(totals))}</div>
            <div class="rounded-lg border border-[var(--card-border)] bg-[var(--hover-bg)] p-2">${rows || '<div class="text-[10px] text-[var(--text-muted)]">Нет данных</div>'}</div>
            ${progress.cloudAvailable === false ? '<div class="text-[10px] text-amber-600">Облако недоступно — обработаны только локальные записи.</div>' : ''}
        </div>
    `;
}

function _setStatus(html) {
    const el = document.getElementById('project-id-backfill-status');
    if (el) el.innerHTML = html;
}

function _setBusy(busy) {
    _running = !!busy;
    const btn = document.getElementById('project-id-backfill-run');
    if (btn) {
        btn.disabled = !!busy;
        btn.textContent = busy ? 'Выполняется…' : 'Заполнить projectId в истории';
        btn.classList.toggle('opacity-60', !!busy);
        btn.classList.toggle('cursor-not-allowed', !!busy);
    }
}

async function _onRun() {
    if (_running) return;
    if (!_isAdmin()) {
        _toast('⚠️ Только для администратора');
        return;
    }
    if (!_cloudReady()) {
        _toast('⚠️ Нужен онлайн и подключение к облаку');
        return;
    }

    const svc = _svc();
    if (!svc || typeof svc.backfillProjectIdsOnLegacyRecords !== 'function') {
        _toast('❌ Сервис объектов не загружен');
        return;
    }

    _setBusy(true);
    _setStatus('<div class="text-[10px] text-indigo-600 animate-pulse">Запуск backfill projectId…</div>');
    try {
        const report = await svc.backfillProjectIdsOnLegacyRecords({
            onProgress: (p) => _setStatus(_renderProgressHtml(p))
        });
        _setStatus(_renderProgressHtml(Object.assign({ phase: 'done' }, report || {})));
        _toast('✅ Backfill projectId завершён');
    } catch (e) {
        console.error('[project-id-backfill]', e);
        _toast('❌ Ошибка backfill projectId');
        _setStatus(`<div class="text-[10px] text-red-600">${_escapeHtml(e && e.message ? e.message : String(e))}</div>`);
    } finally {
        _setBusy(false);
    }
}

async function _onMerge() {
    if (!_isAdmin()) {
        _toast('⚠️ Только для администратора');
        return;
    }
    const rawEl = document.getElementById('project-merge-raw');
    const targetEl = document.getElementById('project-merge-target');
    const raw = rawEl ? String(rawEl.value || '').trim() : '';
    const target = targetEl ? String(targetEl.value || '').trim() : '';
    if (!raw || !target) {
        _toast('Укажите написание и целевой объект');
        return;
    }
    const svc = _svc();
    if (!svc || typeof svc.mergeRawNameIntoObject !== 'function') {
        _toast('❌ Сервис объектов не загружен');
        return;
    }
    try {
        const res = await svc.mergeRawNameIntoObject(raw, target);
        if (!res || !res.ok) {
            _toast('❌ Не удалось слить: ' + (res && res.error ? res.error : 'ошибка'));
            return;
        }
        _toast(`✅ Слито в объект. Профилей обновлено: ${res.remappedProfiles || 0}`);
        if (rawEl) rawEl.value = '';
    } catch (e) {
        console.error('[project-merge]', e);
        _toast('❌ Ошибка слияния');
    }
}

function _objectOptionsHtml() {
    const list = (window.ObjectDirectory && Array.isArray(window.ObjectDirectory.objects))
        ? window.ObjectDirectory.objects.filter(o => o && !o._deleted && !o.is_deleted)
        : [];
    return list.map(o =>
        `<option value="${_escapeHtml(o.id || o.canonical_key)}">${_escapeHtml(o.display_name || o.canonical_key)}</option>`
    ).join('');
}

function _bindDelegation() {
    if (_delegationBound) return;
    _delegationBound = true;
    document.addEventListener('click', (e) => {
        const t = e.target && e.target.closest
            ? e.target.closest('[data-project-backfill-action]')
            : null;
        if (!t) return;
        const act = t.getAttribute('data-project-backfill-action');
        if (act === 'run') _onRun();
        if (act === 'merge') _onMerge();
    });
}

export function mountProjectIdBackfillUI() {
    const root = document.getElementById('project-id-backfill-root');
    if (!root) return;
    if (!_isAdmin()) {
        root.innerHTML = '';
        return;
    }
    _bindDelegation();
    root.innerHTML = `
        <div class="space-y-3 p-4">
            <div class="text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">Объекты · projectId</div>
            <p class="text-[10px] text-[var(--text-muted)] leading-snug">
                Проставляет <code class="font-mono">projectId</code> (UUID узла объекта) в истории проверок / ПК СК / стройконтроле —
                по аналогии с contractorId. Сначала выполните SQL
                <code class="font-mono">sql/011_add_project_id_to_legacy_tables.sql</code> в Supabase.
            </p>
            <button id="project-id-backfill-run"
                type="button"
                class="w-full sm:w-auto px-3 py-2 rounded-lg text-[10px] font-black uppercase bg-indigo-600 text-white shadow-sm active:scale-95"
                data-project-backfill-action="run">
                Заполнить projectId в истории
            </button>
            <div id="project-id-backfill-status" class="min-h-[2rem]">
                <div class="text-[10px] text-[var(--text-muted)]">Ещё не запускалось.</div>
            </div>
            <div class="border-t border-[var(--card-border)] pt-3 space-y-2">
                <div class="text-[10px] font-black text-slate-600 uppercase">Слить написание в канон</div>
                <p class="text-[10px] text-[var(--text-muted)] leading-snug">
                    Например «лиговский 240» → объект «Лиговский 240»: synonym + remap привязок инженеров на UUID.
                </p>
                <input id="project-merge-raw" type="text" class="input-base !text-[11px] w-full" placeholder="Написание-дубль (как у инженера)">
                <select id="project-merge-target" class="input-base !text-[11px] w-full">
                    <option value="">— Целевой объект справочника —</option>
                    ${_objectOptionsHtml()}
                </select>
                <button type="button"
                    class="px-3 py-2 rounded-lg text-[10px] font-black uppercase bg-emerald-600 text-white shadow-sm active:scale-95"
                    data-project-backfill-action="merge">
                    Слить написание
                </button>
            </div>
        </div>
    `;
}

export const ProjectIdBackfillUI = { mount: mountProjectIdBackfillUI };
