/**
 * location-directory-ui.js
 * UI справочника локаций/планов (Настройки) → service.locations.
 * Legacy ConstAdmin не используется.
 */

let _delegationBound = false;
let _selectedId = null;

function _svc() {
    return (window.RBI && window.RBI.services && window.RBI.services.locations) || null;
}

function _unitsSvc() {
    return (window.RBI && window.RBI.services && window.RBI.services.constructionUnits) || null;
}

function _perm() {
    return (window.RBI && window.RBI.services && window.RBI.services.permissions) || null;
}

function _toast(msg) {
    const toastFn = window['showToast'];
    if (typeof toastFn === 'function') toastFn(msg);
}

function _escape(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _canEdit() {
    const p = _perm();
    return !!(p && (p.isAdmin?.() || p.canManageHierarchy?.()));
}

function _childType(parentType) {
    if (!parentType) return 'object';
    if (parentType === 'object') return 'building';
    if (parentType === 'building') return 'section';
    if (parentType === 'section') return 'floor';
    if (parentType === 'floor') return 'apartment';
    return null;
}

function _defaultChildName(child) {
    if (child === 'apartment') return '1';
    if (child === 'section') return 'Секция 1';
    if (child === 'floor') return 'Этаж 1';
    if (child === 'building') return 'Корпус 1';
    return 'Новый';
}

/** Создать operational unit для нового apartment (1:1). */
async function _ensureUnitForApartment(apartmentNode) {
    const units = _unitsSvc();
    if (!units || !apartmentNode?.id) return;
    await units.init?.();
    const existing = typeof units.list === 'function' ? units.list({ locationId: apartmentNode.id }) : [];
    if (existing && existing.length) return existing[0];
    return units.create({
        locationId: apartmentNode.id,
        name: apartmentNode.displayName || 'КВ',
        type: 'КВ',
        sort_order: apartmentNode.sort_order != null ? Number(apartmentNode.sort_order) : 0,
        status: 'not_inspected'
    });
}

/** Синхронизировать имя unit при переименовании apartment. */
async function _syncUnitNameForApartment(apartmentId, name) {
    const units = _unitsSvc();
    if (!units || !apartmentId) return;
    await units.init?.();
    const linked = typeof units.list === 'function' ? units.list({ locationId: apartmentId }) : [];
    for (const u of linked || []) {
        if (u && u.name !== name) {
            await units.update(u.id, { name });
        }
    }
}

/** Linked operational unit для apartment (1:1). */
function _linkedUnitForApartment(apartmentId) {
    const units = _unitsSvc();
    if (!units || !apartmentId || typeof units.list !== 'function') return null;
    const linked = units.list({ locationId: apartmentId }) || [];
    return linked[0] || null;
}

function _treePlanMark(svc, n) {
    if (n.nodeType === 'floor') {
        const plan = svc.getPlanForFloor(n.id);
        return plan?.pdf_url ? '📄' : '⚠️';
    }
    if (n.nodeType === 'apartment') {
        const unit = _linkedUnitForApartment(n.id);
        return unit?.pdf_url ? '📄' : '⚠️';
    }
    if (n.nodeType === 'object' && typeof svc.resolveObjectLink === 'function') {
        const link = svc.resolveObjectLink({
            locationObjectId: n.id,
            canonical_key: n.canonical_key,
            displayName: n.displayName
        });
        return link && link.linked ? '🔗' : '⛓';
    }
    return '';
}

function _odLinkBlockHtml(svc, node, can) {
    if (!node || node.nodeType !== 'object' || typeof svc.resolveObjectLink !== 'function') return '';
    const link = svc.resolveObjectLink({
        locationObjectId: node.id,
        canonical_key: node.canonical_key,
        displayName: node.displayName
    });
    const odName = link.od
        ? (link.od.display_name || link.od.name || link.od.canonical_key || '')
        : '';
    const status = link.linked
        ? `<div class="text-[11px] text-teal-700 font-bold">🔗 Связан с ObjectDirectory: ${_escape(odName)}</div>
           <div class="text-[10px] text-slate-400">key: ${_escape(link.od?.canonical_key || node.canonical_key || '')}</div>`
        : link.od
            ? `<div class="text-[11px] text-amber-700 font-bold">Есть peer OD «${_escape(odName)}», canonical_key не совпадает</div>`
            : `<div class="text-[11px] text-slate-500 font-bold">Нет связи с ObjectDirectory</div>
               <div class="text-[10px] text-slate-400">key: ${_escape(node.canonical_key || '—')}</div>`;
    let actions = '';
    if (can) {
        if (!link.linked && link.od) {
            actions += `<button type="button" data-loc-dir-action="link-od" data-id="${_escape(node.id)}"
                data-od-key="${_escape(link.od.canonical_key || '')}"
                class="bg-teal-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Привязать</button>`;
        }
        if (!link.od) {
            actions += `<button type="button" data-loc-dir-action="create-od" data-id="${_escape(node.id)}"
                class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Создать в ObjectDirectory</button>`;
        }
        if (typeof svc.listUnlinkedObjects === 'function') {
            const un = svc.listUnlinkedObjects();
            const odOnly = (un && un.odOnly) || [];
            if (odOnly.length) {
                actions += `<button type="button" data-loc-dir-action="create-loc-from-od"
                    class="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase">+ object из OD…</button>`;
            }
        }
    }
    return `<div class="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2 space-y-2">
        <div class="text-[10px] font-black uppercase text-slate-500">Связь ObjectDirectory</div>
        ${status}
        ${actions ? `<div class="flex flex-wrap gap-2">${actions}</div>` : ''}
    </div>`;
}


function _migrateBannerHtml(svc) {
    const p = _perm();
    const isAdmin = !!(p && p.isAdmin?.());
    if (!isAdmin || typeof svc.listUnlinkedObjects !== 'function') return '';
    const un = svc.listUnlinkedObjects() || {};
    const odOnly = (un.odOnly || []).length;
    const locObjs = svc.listNodes({ nodeType: 'object', parentId: null }) || [];
    const noKey = locObjs.filter((n) => n && !String(n.canonical_key || '').trim()).length;
    return `<div class="border-b border-teal-200 dark:border-teal-800 p-2 space-y-2 bg-teal-50/50 dark:bg-teal-950/20">
        <div class="text-[10px] font-black uppercase text-teal-800 dark:text-teal-300">
            OD→locations: ${odOnly} без object / ${noKey} без key
        </div>
        <div class="flex flex-wrap gap-2">
            <button type="button" data-loc-dir-action="migrate-od-dry"
                class="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase">Dry-run миграции</button>
            <button type="button" data-loc-dir-action="migrate-od-apply"
                class="bg-teal-700 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Мигрировать OD→locations</button>
        </div>
        <div id="loc-dir-migrate-report" class="text-[10px] text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap"></div>
    </div>`;
}

function _formatMigrateReport(rep) {
    if (!rep) return '';
    const err = (rep.errors || []).slice(0, 5).map((e) => `  · ${e.key}: ${e.message}`).join('\n');
    return [
        `${rep.dryRun ? '[dry-run]' : '[apply]'} created=${rep.created} linked=${rep.linked} synonyms=${rep.updatedSynonyms} skipped=${rep.skipped} errors=${(rep.errors || []).length}`,
        err
    ].filter(Boolean).join('\n');
}

function _renderTreeHtml(svc) {
    const objects = svc.listNodes({ nodeType: 'object', parentId: null });
    if (!objects.length) {
        return '<div class="p-4 text-[11px] text-slate-400 font-bold uppercase tracking-widest text-center">Дерево пусто — создайте объект</div>';
    }
    let html = '<ul class="space-y-1 text-[12px]">';
    const walk = (nodes, depth) => {
        for (const n of nodes) {
            const sel = _selectedId === n.id ? 'bg-teal-100 dark:bg-teal-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800';
            const mark = _treePlanMark(svc, n);
            html += `<li>
                <button type="button" data-loc-dir-action="select" data-id="${_escape(n.id)}"
                    class="w-full text-left px-2 py-1 rounded-lg ${sel}" style="padding-left:${8 + depth * 12}px">
                    <span class="text-[9px] uppercase text-slate-400 mr-1">${_escape(n.nodeType)}</span>
                    ${mark} ${_escape(n.displayName)}
                </button>`;
            const kids = svc.getChildren(n.id);
            if (kids.length) {
                html += '<ul>';
                walk(kids, depth + 1);
                html += '</ul>';
            }
            html += '</li>';
        }
    };
    walk(objects, 0);
    html += '</ul>';
    return html;
}

function _editorHtml(svc) {
    const can = _canEdit();
    const node = _selectedId ? svc.getNode(_selectedId) : null;
    if (!node) {
        return `<div class="p-4 space-y-3">
            <p class="text-[11px] text-slate-500">Выберите узел слева или создайте корень.</p>
            ${can ? `<button type="button" data-loc-dir-action="create-root"
                class="bg-teal-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">+ Объект</button>` : ''}
            <a href="#/construction-v2" class="block text-[10px] font-black uppercase text-indigo-600 mt-2">Открыть СК (новый) →</a>
        </div>`;
    }
    const next = _childType(node.nodeType);
    const plan = node.nodeType === 'floor' ? svc.getPlanForFloor(node.id) : null;
    const aptUnit = node.nodeType === 'apartment' ? _linkedUnitForApartment(node.id) : null;
    const aptPdfUrl = aptUnit?.pdf_url && String(aptUnit.pdf_url).startsWith('http') ? String(aptUnit.pdf_url) : '';
    return `<div class="p-4 space-y-3">
        <div class="text-[10px] font-black uppercase text-teal-700">${_escape(node.nodeType)}</div>
        <input id="loc-dir-name" type="text" value="${_escape(node.displayName)}"
            class="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[12px] bg-transparent" ${can ? '' : 'disabled'} />
        ${can ? `<div class="flex flex-wrap gap-2">
            <button type="button" data-loc-dir-action="save" data-id="${_escape(node.id)}"
                class="bg-slate-800 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Сохранить</button>
            ${next ? `<button type="button" data-loc-dir-action="add-child" data-id="${_escape(node.id)}" data-child="${next}"
                class="bg-teal-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">+ ${_escape(next)}</button>` : ''}
            <button type="button" data-loc-dir-action="delete" data-id="${_escape(node.id)}"
                class="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase">Удалить</button>
        </div>` : ''}
        ${node.nodeType === 'floor' ? `
            <div class="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                <div class="text-[10px] font-black uppercase text-slate-500 mb-2">PDF-план</div>
                ${plan?.pdf_url
                    ? `<div class="text-[11px] mb-2">📄 ${_escape(plan.pdf_name || 'plan.pdf')}
                        <a href="${_escape(plan.pdf_url)}" target="_blank" class="text-indigo-600 ml-2">открыть</a></div>`
                    : '<div class="text-[11px] text-amber-600 mb-2">План не загружен</div>'}
                ${can ? `<input id="loc-dir-pdf" type="file" accept="application/pdf" class="text-[11px] w-full" />
                <button type="button" data-loc-dir-action="upload-pdf" data-id="${_escape(node.id)}"
                    class="mt-2 bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Загрузить PDF</button>` : ''}
            </div>` : ''}
        ${node.nodeType === 'apartment' ? `
            <div class="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                <div class="text-[10px] font-black uppercase text-slate-500 mb-2">PDF-план квартиры</div>
                ${aptPdfUrl
                    ? `<div class="text-[11px] mb-2">📄 ${_escape(aptUnit.pdf_name || 'plan.pdf')}
                        <a href="${_escape(aptPdfUrl)}" target="_blank" class="text-indigo-600 ml-2">открыть</a></div>`
                    : '<div class="text-[11px] text-amber-600 mb-2">План не загружен</div>'}
                ${can ? `<input id="loc-dir-unit-pdf" type="file" accept="application/pdf" class="text-[11px] w-full" />
                <div class="flex flex-wrap gap-2 mt-2">
                    <button type="button" data-loc-dir-action="upload-unit-pdf" data-id="${_escape(node.id)}"
                        class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Загрузить PDF</button>
                    ${aptPdfUrl ? `<button type="button" data-loc-dir-action="clear-unit-pdf" data-id="${_escape(node.id)}"
                        class="bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase">Снять план</button>` : ''}
                </div>` : ''}
            </div>` : ''}
        ${_odLinkBlockHtml(svc, node, can)}
        <button type="button" data-loc-dir-action="create-root"
            class="text-[10px] font-black uppercase text-teal-700 underline">+ ещё объект</button>
        <a href="#/construction-v2" class="block text-[10px] font-black uppercase text-indigo-600">Открыть СК (новый) →</a>
    </div>`;
}

function _bindDelegation() {
    if (_delegationBound) return;
    _delegationBound = true;
    document.addEventListener('click', async (ev) => {
        const t = ev.target;
        const el = t && t.closest ? t.closest('[data-loc-dir-action]') : null;
        if (!el) return;
        const action = el.getAttribute('data-loc-dir-action');
        const svc = _svc();
        if (!svc || !action) return;
        try {
            await svc.init();
            if (action === 'select') {
                _selectedId = el.getAttribute('data-id');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'create-root') {
                const name = prompt('Название объекта', '__SMOKE_TEST__ Object');
                if (!name) return;
                const clean = typeof svc.cleanObjectName === 'function'
                    ? svc.cleanObjectName(name)
                    : String(name || '').toLowerCase().trim();
                const n = await svc.createNode({
                    nodeType: 'object',
                    displayName: name,
                    parentId: null,
                    canonical_key: clean
                });
                _selectedId = n.id;
                if (typeof svc.createOdFromLocation === 'function') {
                    try { await svc.createOdFromLocation(n.id); } catch (_e) { /* shadow OD optional */ }
                }
                _toast('Объект создан');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'add-child') {
                const parentId = el.getAttribute('data-id');
                const child = el.getAttribute('data-child');
                const name = prompt(`Название (${child})`, _defaultChildName(child));
                if (!name) return;
                const n = await svc.createNode({ nodeType: child, displayName: name, parentId });
                if (child === 'apartment') {
                    await _ensureUnitForApartment(n);
                }
                _selectedId = n.id;
                _toast('Создано');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'save') {
                const id = el.getAttribute('data-id');
                const inp = document.getElementById('loc-dir-name');
                const displayName = inp ? inp.value : '';
                await svc.updateNode(id, { displayName });
                const node = svc.getNode(id);
                if (node && node.nodeType === 'apartment') {
                    await _syncUnitNameForApartment(id, String(displayName || node.displayName || '').trim());
                }
                _toast('Сохранено');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'delete') {
                const id = el.getAttribute('data-id');
                if (!confirm('Удалить узел и всех потомков?')) return;
                // softDeleteNode(apartment) → softDelete linked unit (см. locations.service)
                await svc.softDeleteNode(id);
                _selectedId = null;
                _toast('Удалено');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'link-od') {
                const id = el.getAttribute('data-id');
                const odKey = el.getAttribute('data-od-key') || '';
                if (typeof svc.linkLocationToOd !== 'function') {
                    _toast('Мост OD недоступен');
                    return;
                }
                await svc.linkLocationToOd(id, odKey || undefined);
                _toast('Привязано к ObjectDirectory');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'create-od') {
                const id = el.getAttribute('data-id');
                if (typeof svc.createOdFromLocation !== 'function') {
                    _toast('Мост OD недоступен');
                    return;
                }
                await svc.createOdFromLocation(id);
                _toast('Создано в ObjectDirectory');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'create-loc-from-od') {
                if (typeof svc.listUnlinkedObjects !== 'function' || typeof svc.createLocationFromOd !== 'function') {
                    _toast('Мост OD недоступен');
                    return;
                }
                const un = svc.listUnlinkedObjects();
                const odOnly = (un && un.odOnly) || [];
                if (!odOnly.length) {
                    _toast('Нет несвязанных объектов OD');
                    return;
                }
                const labels = odOnly.map((o, i) => `${i + 1}. ${o.display_name || o.name || o.canonical_key}`).join('\n');
                const pick = prompt(`Номер ObjectDirectory для создания object:\n${labels}`, '1');
                if (!pick) return;
                const idx = Number(pick) - 1;
                const chosen = odOnly[idx];
                if (!chosen || !chosen.canonical_key) {
                    _toast('Неверный номер');
                    return;
                }
                const r = await svc.createLocationFromOd(chosen.canonical_key);
                _selectedId = r.locationObject ? r.locationObject.id : _selectedId;
                _toast('Объект создан из OD');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'migrate-od-dry' || action === 'migrate-od-apply') {
                if (!_perm()?.isAdmin?.()) {
                    _toast('Только администратор');
                    return;
                }
                if (typeof svc.migrateOdCatalogToLocations !== 'function') {
                    _toast('migrateOdCatalogToLocations недоступен');
                    return;
                }
                const dryRun = action === 'migrate-od-dry';
                if (!dryRun && !confirm('Мигрировать ObjectDirectory → locations.object? Операция идемпотентна.')) return;
                const rep = await svc.migrateOdCatalogToLocations({ dryRun });
                const box = document.getElementById('loc-dir-migrate-report');
                if (box) box.textContent = _formatMigrateReport(rep);
                _toast(dryRun
                    ? `Dry-run: +${rep.created} create / ${rep.updatedSynonyms} syn`
                    : `Миграция: +${rep.created} create / ${rep.linked} link / ${rep.updatedSynonyms} syn`);
                if (!dryRun) await mountLocationDirectoryUI();
                return;
            }
            if (action === 'upload-pdf') {
                const id = el.getAttribute('data-id');
                const fileInput = document.getElementById('loc-dir-pdf');
                const file = fileInput && fileInput.files && fileInput.files[0];
                if (!file) {
                    _toast('Выберите PDF');
                    return;
                }
                await svc.uploadFloorPdf(id, file);
                _toast('План загружен');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'upload-unit-pdf') {
                const apartmentId = el.getAttribute('data-id');
                const fileInput = document.getElementById('loc-dir-unit-pdf');
                const file = fileInput && fileInput.files && fileInput.files[0];
                if (!file) {
                    _toast('Выберите PDF');
                    return;
                }
                const units = _unitsSvc();
                if (!units?.uploadUnitPdf) throw new Error('service.constructionUnits недоступен');
                await units.init?.();
                let unit = _linkedUnitForApartment(apartmentId);
                if (!unit) {
                    const node = svc.getNode(apartmentId);
                    unit = await _ensureUnitForApartment(node || { id: apartmentId });
                }
                if (!unit?.id) throw new Error('Нет linked unit для квартиры');
                await units.uploadUnitPdf(unit.id, file);
                _toast('План квартиры загружен');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'clear-unit-pdf') {
                const apartmentId = el.getAttribute('data-id');
                if (!confirm('Снять план квартиры?')) return;
                const units = _unitsSvc();
                if (!units?.clearUnitPlan) throw new Error('service.constructionUnits недоступен');
                await units.init?.();
                const unit = _linkedUnitForApartment(apartmentId);
                if (!unit?.id) throw new Error('Нет linked unit для квартиры');
                await units.clearUnitPlan(unit.id);
                _toast('План снят');
                await mountLocationDirectoryUI();
            }
        } catch (e) {
            console.error('[LocationDirectoryUI]', e);
            _toast(e.message || 'Ошибка');
        }
    }, true);
}

export async function mountLocationDirectoryUI() {
    _bindDelegation();
    const root = document.getElementById('location-directory-root');
    const section = document.getElementById('location-directory-section');
    if (!root) return;
    const svc = _svc();
    const canView = _canEdit() || !!(_perm() && _perm().isAdmin?.());
    if (section) {
        // Показываем admin / hierarchy managers
        const p = _perm();
        const show = !!(p && (p.isAdmin?.() || p.canManageHierarchy?.()));
        section.classList.toggle('hidden', !show);
        if (!show) return;
    }
    if (!svc) {
        root.innerHTML = '<div class="p-4 text-red-500 text-[11px]">service.locations не загружен</div>';
        return;
    }
    await svc.init();
    const units = _unitsSvc();
    if (units?.init) await units.init();
    root.innerHTML = `<div class="flex flex-col min-h-[280px]">
        ${_migrateBannerHtml(svc)}
        <div class="flex flex-col md:flex-row flex-1">
        <div class="md:w-1/2 border-b md:border-b-0 md:border-r border-teal-200 dark:border-teal-800 p-2 overflow-y-auto max-h-[50vh]" id="loc-dir-tree">
            ${_renderTreeHtml(svc)}
        </div>
        <div class="md:w-1/2" id="loc-dir-editor">${_editorHtml(svc)}</div>
        </div>
    </div>`;
}

export const LocationDirectoryUI = { mount: mountLocationDirectoryUI };
