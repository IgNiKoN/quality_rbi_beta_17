/**
 * role-matrix-ui.js
 * Admin UI: «Роли и права» (§23 Блок 1) — Настройки → Платформа.
 * Чистый ES-модуль: без window.* — действия через data-role-matrix-action.
 * Ключи ролей не редактируются; меняются только флаги/label поверх DEFAULT.
 */

let _delegationBound = false;
let _selectedRole = null;
let _draft = null;
let _saving = false;

const BOOL_FIELDS = [
    {
        key: 'canCreate',
        label: 'Создание записей',
        hint: 'Разрешает создавать новые осмотры / проектные записи. Без флага интерфейс часто в режиме «только чтение».'
    },
    {
        key: 'canPush',
        label: 'Push в облако',
        hint: 'Разрешает отправлять локальные изменения в Supabase (sync push). Без флага данные остаются только на устройстве.'
    },
    {
        key: 'canDeleteOwn',
        label: 'Удаление своих',
        hint: 'Можно удалять только свои записи (автор = текущий инженер). Чужие — нельзя.'
    },
    {
        key: 'canDeleteAll',
        label: 'Удаление любых',
        hint: 'Можно удалять чужие записи тоже. Обычно только у админов / зам. руководителя.'
    },
    {
        key: 'canManageRoles',
        label: 'Управление ролями',
        hint: 'Доступ к этому экрану «Роли и права» и к операциям смены прав. Осторожно: снятие у своей роли может закрыть экран.'
    },
    {
        key: 'canManageObjects',
        label: 'Управление объектами',
        hint: 'Права на админ-операции со справочником объектов / привязками объектов к пользователям.'
    },
    {
        key: 'canEditKnowledgeBase',
        label: 'Редактирование БЗ',
        hint: 'Можно создавать и править материалы базы знаний (TWI, документы, узлы и т.п.).'
    },
    {
        key: 'canViewKnowledgeBase',
        label: 'Просмотр БЗ',
        hint: 'Можно открывать и читать базу знаний. Без флага раздел БЗ недоступен.'
    },
    {
        key: 'isAdmin',
        label: 'Админ',
        hint: 'Полный админ-доступ в клиенте: служебные блоки настроек, обход части ограничений редактирования, админ-UI.'
    },
    {
        key: 'isLeadership',
        label: 'Руководство',
        hint: 'Маркер руководящей роли (РП / директор / админ). Используется в UI и фильтрах «для руководства».'
    },
    {
        key: 'canManageSK',
        label: 'Управление СК',
        hint: 'Доступ к управлению модулем ПК СК (импорт/анализ Excel Стройконтроль), не путать со стройконтролем construction.'
    },
    {
        key: 'canManageHierarchy',
        label: 'Управление иерархией',
        hint: 'Права на иерархию объекта (корпус / этаж / локации / планы) и связанные админ-блоки справочников.'
    },
    {
        key: 'isEngineerOrAdmin',
        label: 'Инженер или админ',
        hint: 'Совмещённый флаг «инженер СК или админ» для экранов/кнопок, где нужен полевой или полный доступ.'
    },
    {
        key: 'canViewWeeklyPlan',
        label: 'Недельный план',
        hint: 'Показывает недельный план задач / план инженера. Без флага раздел скрыт.'
    }
];

const DATA_SCOPES = [
    {
        value: 'all',
        label: 'Все данные',
        hint: 'Видит все записи проекта без фильтра по автору / подрядчику / своим объектам.'
    },
    {
        value: 'ownProject',
        label: 'Свои проекты',
        hint: 'Только записи по объектам из assignedProjects. Если объектов нет — пусто.'
    },
    {
        value: 'ownContractor',
        label: 'Свой подрядчик',
        hint: 'Только записи своего подрядчика (кабинет подрядчика). Плюс фильтр по проекту, если объекты назначены.'
    },
    {
        value: 'ownProjectOrOwnRecords',
        label: 'Проекты или свои записи',
        hint: 'Записи своих объектов; если объектов нет — только свои записи без проекта. Типично для инженера.'
    },
    {
        value: 'none',
        label: 'Нет доступа',
        hint: 'Чужие данные не показываются (гость).'
    }
];

const MODULE_OPTIONS = [
    {
        id: 'quality',
        label: 'Качество',
        hint: 'Модуль качества: осмотр, история, аналитика, задачи, БЗ и связанные вкладки.'
    },
    {
        id: 'construction',
        label: 'Стройконтроль',
        hint: 'Модуль стройконтроля: дефекты, приёмка, планы, кабинет подрядчика.'
    }
];

function _perm() {
    return (window.RBI && window.RBI.services && window.RBI.services.permissions) || null;
}

function _toast(msg) {
    const toastFn = window.showToast;
    if (typeof toastFn === 'function') toastFn(msg);
}

function _canManage() {
    const p = _perm();
    return !!(p && (p.isAdmin?.() || p.canManageRoles?.()));
}

function _escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _roles() {
    const p = _perm();
    if (!p || typeof p.getAllRoles !== 'function') return [];
    return p.getAllRoles() || [];
}

function _entry(roleKey) {
    const p = _perm();
    if (!p) return null;
    if (typeof p.getRoleEntry === 'function') return p.getRoleEntry(roleKey);
    return p.getPermissions(roleKey);
}

function _hasOverride(roleKey) {
    const p = _perm();
    if (!p || typeof p.getRoleOverrides !== 'function') return false;
    const o = p.getRoleOverrides() || {};
    return !!(o[roleKey] && Object.keys(o[roleKey]).length);
}

function _ensureDraft() {
    if (!_selectedRole) {
        const list = _roles();
        _selectedRole = list.length ? list[0].key : null;
    }
    if (!_selectedRole) {
        _draft = null;
        return;
    }
    const entry = _entry(_selectedRole);
    if (!entry) {
        _draft = null;
        return;
    }
    _draft = Object.assign({}, entry, {
        allowedModules: Array.isArray(entry.allowedModules) ? entry.allowedModules.slice() : ['quality', 'construction']
    });
}

function _readFormIntoDraft() {
    if (!_draft || !_selectedRole) return;
    const labelEl = document.getElementById('role-matrix-label');
    if (labelEl) _draft.label = labelEl.value;

    const scopeEl = document.getElementById('role-matrix-datascope');
    if (scopeEl) _draft.dataScope = scopeEl.value;

    BOOL_FIELDS.forEach((f) => {
        const el = document.getElementById('role-matrix-bool-' + f.key);
        if (el) _draft[f.key] = !!el.checked;
    });

    const mods = [];
    MODULE_OPTIONS.forEach((m) => {
        const el = document.getElementById('role-matrix-mod-' + m.id);
        if (el && el.checked) mods.push(m.id);
    });
    _draft.allowedModules = mods.length ? mods : ['quality', 'construction'];
}

function _roleListHtml() {
    return _roles().map((r) => {
        const active = r.key === _selectedRole;
        const badge = _hasOverride(r.key)
            ? '<span class="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 ml-1">изм.</span>'
            : '';
        return `<button type="button"
            data-role-matrix-action="select"
            data-role-key="${_escapeHtml(r.key)}"
            class="w-full text-left px-3 py-2 rounded-lg border text-[11px] font-bold transition-colors ${
                active
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-[var(--card-bg)] text-slate-700 dark:text-slate-200 border-[var(--card-border)] hover:border-indigo-300'
            }">
            <span>${_escapeHtml(r.label || r.key)}</span>${badge}
            <div class="text-[9px] font-mono opacity-70 mt-0.5">${_escapeHtml(r.key)}</div>
        </button>`;
    }).join('');
}

function _formHtml() {
    if (!_draft || !_selectedRole) {
        return '<div class="text-[11px] text-[var(--text-muted)] p-3">Нет ролей в матрице.</div>';
    }
    const d = _draft;
    const boolRows = BOOL_FIELDS.map((f) => `
        <label class="flex items-start justify-between gap-3 py-2.5 border-b border-[var(--card-border)]/50 last:border-0">
            <span class="min-w-0">
                <span class="block text-[11px] font-bold text-slate-700 dark:text-slate-200">${_escapeHtml(f.label)}</span>
                <span class="block text-[10px] leading-snug text-[var(--text-muted)] mt-0.5">${_escapeHtml(f.hint || '')}</span>
            </span>
            <input type="checkbox" id="role-matrix-bool-${_escapeHtml(f.key)}"
                class="w-4 h-4 mt-0.5 shrink-0 accent-indigo-600" ${d[f.key] ? 'checked' : ''}
                title="${_escapeHtml(f.hint || f.label)}">
        </label>
    `).join('');

    const scopeOpts = DATA_SCOPES.map((s) =>
        `<option value="${_escapeHtml(s.value)}" ${d.dataScope === s.value ? 'selected' : ''}>${_escapeHtml(s.label)}</option>`
    ).join('');
    const scopeHint = (DATA_SCOPES.find((s) => s.value === d.dataScope) || DATA_SCOPES[0] || {}).hint || '';

    const modRows = MODULE_OPTIONS.map((m) => {
        const on = Array.isArray(d.allowedModules) && d.allowedModules.indexOf(m.id) >= 0;
        return `<label class="flex items-start gap-2 text-[11px]">
            <input type="checkbox" id="role-matrix-mod-${_escapeHtml(m.id)}"
                class="w-4 h-4 mt-0.5 shrink-0 accent-indigo-600" ${on ? 'checked' : ''}
                title="${_escapeHtml(m.hint || m.label)}">
            <span class="min-w-0">
                <span class="font-bold text-slate-700 dark:text-slate-200">${_escapeHtml(m.label)}</span>
                <span class="font-mono text-[9px] text-[var(--text-muted)] ml-1">(${_escapeHtml(m.id)})</span>
                <span class="block text-[10px] leading-snug text-[var(--text-muted)] mt-0.5">${_escapeHtml(m.hint || '')}</span>
            </span>
        </label>`;
    }).join('');

    return `
        <div class="space-y-3">
            <div class="text-[10px] text-[var(--text-muted)]">
                Ключ роли: <span class="font-mono font-bold text-slate-700 dark:text-slate-200">${_escapeHtml(_selectedRole)}</span>
                (не редактируется — это техническое имя в профиле пользователя)
            </div>
            <div>
                <label class="block text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Подпись</label>
                <input id="role-matrix-label" type="text" value="${_escapeHtml(d.label || '')}"
                    class="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[12px] text-slate-800 dark:text-white">
                <div class="text-[10px] text-[var(--text-muted)] mt-1">Человекочитаемое имя в списках (ключ роли при этом не меняется).</div>
            </div>
            <div>
                <label class="block text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Область данных</label>
                <select id="role-matrix-datascope"
                    class="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[12px] text-slate-800 dark:text-white">
                    ${scopeOpts}
                </select>
                <div id="role-matrix-datascope-hint" class="text-[10px] leading-snug text-[var(--text-muted)] mt-1">${_escapeHtml(scopeHint)}</div>
            </div>
            <div>
                <div class="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Модули</div>
                <div class="space-y-2">${modRows}</div>
            </div>
            <div>
                <div class="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Флаги прав</div>
                <div class="rounded-lg border border-[var(--card-border)] bg-[var(--hover-bg)] px-3">${boolRows}</div>
            </div>
            <div class="flex flex-col gap-2 pt-1">
                <button type="button" data-role-matrix-action="save"
                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-colors ${_saving ? 'opacity-60 cursor-not-allowed' : ''}"
                    ${_saving ? 'disabled' : ''}>
                    ${_saving ? 'Сохранение…' : 'Сохранить роль'}
                </button>
                <button type="button" data-role-matrix-action="reset"
                    class="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 ${_saving ? 'opacity-60 cursor-not-allowed' : ''}"
                    ${_saving ? 'disabled' : ''}>
                    Сбросить роль к умолчанию
                </button>
            </div>
        </div>
    `;
}

function _rootHtml() {
    return `
        <div class="p-4 space-y-3">
            <div class="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Изменения пока сохраняются в настройках профиля админа (не общая матрица компании).
                Ключи ролей (<span class="font-mono">guest</span>…<span class="font-mono">manager</span>) не меняются.
                Чтобы права реально действовали у инженеров/подрядчиков — нужен отдельный блок: общая матрица + раздача при sync; жёсткий RLS в базе — ещё позже.
            </div>
            <div class="grid grid-cols-1 md:grid-cols-[11rem_1fr] gap-3">
                <div id="role-matrix-list" class="flex flex-col gap-1.5">${_roleListHtml()}</div>
                <div id="role-matrix-form">${_formHtml()}</div>
            </div>
        </div>
    `;
}

function _rerender() {
    const root = document.getElementById('settings-role-matrix-root');
    if (!root) return;
    _ensureDraft();
    root.innerHTML = _rootHtml();
}

async function _onSelect(roleKey) {
    if (!roleKey || roleKey === _selectedRole) return;
    _selectedRole = roleKey;
    _draft = null;
    _ensureDraft();
    _rerender();
}

async function _onSave() {
    if (_saving) return;
    if (!_canManage()) {
        _toast('⚠️ Только для администратора');
        return;
    }
    const p = _perm();
    if (!p || typeof p.setRoleOverrides !== 'function') {
        _toast('❌ Сервис прав недоступен');
        return;
    }
    _readFormIntoDraft();
    if (!_draft || !_selectedRole) return;

    _saving = true;
    _rerender();
    try {
        const result = await p.setRoleOverrides(_selectedRole, _draft);
        if (result && result.error) {
            _toast(result.error === 'forbidden' ? '⛔ Нет прав' : '❌ Ошибка сохранения');
        } else {
            _toast('✅ Права роли сохранены');
            _draft = null;
            _ensureDraft();
        }
    } catch (e) {
        console.error('[role-matrix-ui] save', e);
        _toast('❌ Ошибка сохранения');
    } finally {
        _saving = false;
        _rerender();
    }
}

async function _onReset() {
    if (_saving) return;
    if (!_canManage()) {
        _toast('⚠️ Только для администратора');
        return;
    }
    if (!_selectedRole) return;
    if (!confirm('Сбросить права роли «' + _selectedRole + '» к значениям по умолчанию из кода?')) return;

    const p = _perm();
    if (!p || typeof p.clearRoleOverrides !== 'function') {
        _toast('❌ Сервис прав недоступен');
        return;
    }

    _saving = true;
    _rerender();
    try {
        const result = await p.clearRoleOverrides(_selectedRole);
        if (result && result.error) {
            _toast(result.error === 'forbidden' ? '⛔ Нет прав' : '❌ Ошибка сброса');
        } else {
            _toast('✅ Роль сброшена к умолчанию');
            _draft = null;
            _ensureDraft();
        }
    } catch (e) {
        console.error('[role-matrix-ui] reset', e);
        _toast('❌ Ошибка сброса');
    } finally {
        _saving = false;
        _rerender();
    }
}

function bindRoleMatrixDelegation() {
    if (_delegationBound) return;
    _delegationBound = true;
    document.addEventListener('click', (e) => {
        const el = e.target && e.target.closest
            ? e.target.closest('[data-role-matrix-action]')
            : null;
        if (!el) return;
        const action = el.dataset.roleMatrixAction;
        if (action === 'select') _onSelect(el.dataset.roleKey);
        else if (action === 'save') _onSave();
        else if (action === 'reset') _onReset();
    }, true);
    document.addEventListener('change', (e) => {
        const t = e.target;
        if (!t || t.id !== 'role-matrix-datascope') return;
        const hintEl = document.getElementById('role-matrix-datascope-hint');
        if (!hintEl) return;
        const found = DATA_SCOPES.find((s) => s.value === t.value);
        hintEl.textContent = found && found.hint ? found.hint : '';
    }, true);
}

/**
 * Монтирует/обновляет UI в #settings-role-matrix-root.
 * Секция видна только admin / canManageRoles.
 */
export async function mountRoleMatrixUI() {
    bindRoleMatrixDelegation();
    const root = document.getElementById('settings-role-matrix-root');
    if (!root) return;

    const section = document.getElementById('settings-role-matrix-section');
    if (!_canManage()) {
        if (section) section.classList.add('hidden');
        root.innerHTML = '';
        _selectedRole = null;
        _draft = null;
        return;
    }
    if (section) section.classList.remove('hidden');
    _ensureDraft();
    root.innerHTML = _rootHtml();
}

export const RoleMatrixUI = {
    mount: mountRoleMatrixUI
};
