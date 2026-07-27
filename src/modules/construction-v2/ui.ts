/**
 * Рабочий UI construction-v2: дерево локаций + план (дефекты/зоны) + реестр + канбан приёмки.
 */

import type { AcceptanceZoneV2, ConstructionAcceptanceV2 } from '../../services/construction-acceptance/types';
import type { FloorPlan, LocationNode } from '../../services/locations/types';
import type { ConstructionDefectV2 } from '../../services/construction-defects/types';
import { openCreateAcceptanceForm, openAcceptanceDetails } from './acceptance-form';
import { focusAcceptanceOnPlan, renderAcceptanceKanban } from './acceptance-kanban';
import { PlanViewer } from './plan-viewer';
import { openCreateDefectForm, openViewDefectForm } from './defect-form';
import { renderTransferBoard, teardownTransferUi } from './transfer-board';
import { renderDefectsRegistry } from './defects-registry';
import {
  type PinCategory,
  filterDefectsByPins,
  paintPinFilterHosts,
  pinFiltersState,
  setCategoryFilter,
  toggleStatusFilter
} from './pin-filters';

type LocSvc = {
  init: () => Promise<boolean>;
  listNodes: (opts?: { nodeType?: string; parentId?: string | null }) => LocationNode[];
  getChildren: (parentId: string | null) => LocationNode[];
  getNode: (id: string) => LocationNode | null;
  getPlanForFloor: (id: string) => FloorPlan | null;
  getPath: (id: string) => LocationNode[];
};

type DefectsSvc = {
  init: () => Promise<boolean>;
  listForFloor: (locationId: string) => ConstructionDefectV2[];
  get: (id: string) => ConstructionDefectV2 | null;
  create: (input: Record<string, unknown>) => Promise<ConstructionDefectV2>;
  update: (id: string, patch: Record<string, unknown>) => Promise<ConstructionDefectV2>;
  changeStatus: (
    id: string,
    newStatus: string,
    opts?: { comment?: string | null; photos?: string[] | null; photo?: string | null }
  ) => Promise<ConstructionDefectV2>;
  softDelete: (id: string) => Promise<ConstructionDefectV2>;
};

type AccSvc = {
  init: () => Promise<boolean>;
  listForFloor: (locationId: string) => ConstructionAcceptanceV2[];
  get: (id: string) => ConstructionAcceptanceV2 | null;
  create: (input: {
    locationId: string;
    zone: AcceptanceZoneV2;
    template_key?: string | null;
    work_type?: string | null;
    volume?: string | null;
    requested_date?: string | null;
    requested_time?: string | null;
    contractorId?: string | null;
  }) => Promise<ConstructionAcceptanceV2>;
  changeStatus: (id: string, status: string) => Promise<ConstructionAcceptanceV2>;
  softDelete: (id: string) => Promise<ConstructionAcceptanceV2>;
};

export type ConstructionV2Subview = 'plan' | 'defects' | 'acceptance' | 'transfer';

function _loc(): LocSvc | null {
  return (window.RBI?.services?.locations as LocSvc) || null;
}

function _defects(): DefectsSvc | null {
  return (window.RBI?.services?.constructionDefects as DefectsSvc) || null;
}

function _acc(): AccSvc | null {
  return (window.RBI?.services?.constructionAcceptance as AccSvc) || null;
}

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let _selectedFloorId: string | null = null;
let _bound = false;
let _viewer: PlanViewer | null = null;
let _addMode = false;
let _zoneMode = false;
let _mountedPdfUrl: string | null = null;
let _subview: ConstructionV2Subview = 'plan';
let _pendingFocusAccId: string | null = null;
let _pendingHighlightDefectId: string | null = null;
let _fsOpen = false;
let _fsPlaceholder: Comment | null = null;
let _fsEscHandler: ((e: KeyboardEvent) => void) | null = null;

function _root(): HTMLElement | null {
  return document.getElementById('construction-v2-root');
}

function _renderTree(svc: LocSvc): string {
  const objects = svc.listNodes({ nodeType: 'object', parentId: null });
  if (!objects.length) {
    return `<div class="p-6 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
      Нет объектов. Создайте иерархию в Настройках → «Объекты и планы».
    </div>`;
  }
  let html = '<ul class="space-y-1 text-[12px]">';
  for (const obj of objects) {
    html += `<li class="font-black text-slate-700 dark:text-slate-200">${_escape(obj.displayName)}`;
    const buildings = svc.getChildren(obj.id);
    html += '<ul class="ml-3 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">';
    for (const b of buildings) {
      html += `<li><span class="font-bold text-slate-600 dark:text-slate-300">${_escape(b.displayName)}</span>`;
      const sections = svc.getChildren(b.id);
      html += '<ul class="ml-2 mt-0.5 space-y-0.5">';
      for (const sec of sections) {
        html += `<li class="text-slate-500">${_escape(sec.displayName)}`;
        const floors = svc.getChildren(sec.id);
        html += '<ul class="ml-2">';
        for (const fl of floors) {
          const plan = svc.getPlanForFloor(fl.id);
          const active =
            _selectedFloorId === fl.id
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800';
          const mark = plan?.pdf_url ? '📄' : '⚠️';
          html += `<li>
            <button type="button" data-c2-floor="${_escape(fl.id)}"
              class="w-full text-left px-2 py-1 rounded-lg ${active} transition-colors">
              ${mark} ${_escape(fl.displayName)}
            </button>
          </li>`;
        }
        html += '</ul></li>';
      }
      html += '</ul></li>';
    }
    html += '</ul></li>';
  }
  html += '</ul>';
  return html;
}

function _zoomToolbarHtml(prefix: string): string {
  // Только для fullscreen / apartment (inline chrome без zoom)
  return `<div class="flex gap-1 shrink-0 items-center rounded-xl bg-black/20 p-0.5">
    <button type="button" data-c2-zoom-out="${prefix}"
      class="w-8 h-8 rounded-lg text-[16px] font-black text-white/90 hover:bg-white/10" title="Уменьшить">−</button>
    <button type="button" data-c2-zoom-in="${prefix}"
      class="w-8 h-8 rounded-lg text-[16px] font-black text-white/90 hover:bg-white/10" title="Увеличить">+</button>
    <button type="button" data-c2-zoom-fit="${prefix}"
      class="px-2.5 h-8 rounded-lg text-[9px] font-black uppercase text-white/90 hover:bg-white/10" title="По размеру">Fit</button>
  </div>`;
}

function _fullscreenIconBtn(): string {
  return `<button type="button" data-c2-fullscreen
    class="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center
           text-slate-600 dark:text-slate-200 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
    title="На весь экран" aria-label="На весь экран">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
    </svg>
  </button>`;
}

function _renderPlanChrome(svc: LocSvc): string {
  if (!_selectedFloorId) {
    return `<div class="flex items-center justify-center h-full min-h-[240px] text-slate-400 text-[12px] font-medium px-4 text-center">
      Выберите этаж слева
    </div>`;
  }
  const floor = svc.getNode(_selectedFloorId);
  const plan = svc.getPlanForFloor(_selectedFloorId);
  const path = svc
    .getPath(_selectedFloorId)
    .map((n) => n.displayName)
    .join(' / ');
  if (!plan?.pdf_url) {
    return `<div class="p-6">
      <div class="text-[11px] font-bold text-slate-500 mb-2">${_escape(path)}</div>
      <div class="text-amber-600 font-bold text-[13px]">Нет PDF-плана на этом этаже</div>
      <p class="text-[11px] text-slate-500 mt-2">Загрузите план в Настройках → «Объекты и планы».</p>
    </div>`;
  }
  const addCls = _addMode
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-transparent text-indigo-600 border-indigo-200 dark:border-indigo-800';
  const zoneCls = _zoneMode
    ? 'bg-emerald-600 text-white border-emerald-600'
    : 'bg-transparent text-emerald-700 border-emerald-200 dark:border-emerald-800';
  return `<div class="flex flex-col h-full min-h-[320px]" id="c2-plan-chrome">
    <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
      <div class="text-[12px] font-semibold text-slate-700 dark:text-slate-200 min-w-0 truncate">
        ${_escape(path || floor?.displayName || '')}
      </div>
      <div class="flex gap-1.5 shrink-0 items-center">
        <button type="button" data-c2-zone-mode
          class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${zoneCls}">
          ${_zoneMode ? '2 клика…' : 'Зона'}
        </button>
        <button type="button" data-c2-add-mode
          class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${addCls}">
          ${_addMode ? 'Кликни…' : '+ Замечание'}
        </button>
        ${_fullscreenIconBtn()}
      </div>
    </div>
    <div class="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700" data-c2-pin-filters-host="plan"></div>
    <div class="flex-1 relative bg-slate-100 dark:bg-slate-900 min-h-[280px]" id="c2-plan-host"></div>
    <div class="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 flex justify-end">
      <span id="c2-overlay-count"></span>
    </div>
  </div>`;
}

function _openViewDefect(id: string): void {
  const dSvc = _defects();
  const d = dSvc?.get(id);
  if (!d || !dSvc) return;
  openViewDefectForm(
    d,
    async (defectId) => {
      await dSvc.softDelete(defectId);
      window.showToast?.('Замечание удалено');
      await _afterDefectMutation();
    },
    async (defectId, patch) => {
      await dSvc.update(defectId, patch);
      window.showToast?.('Замечание обновлено');
      await _afterDefectMutation();
    },
    async (defectId, input) => {
      await dSvc.changeStatus(defectId, input.status, {
        comment: input.comment,
        photos: input.photos
      });
      window.showToast?.('✅ Статус обновлён');
      await _afterDefectMutation();
    }
  );
}

async function _afterDefectMutation(): Promise<void> {
  if (_subview === 'defects') {
    await renderConstructionV2();
    return;
  }
  await _refreshOverlaysOnly();
}

async function _mountViewerIfNeeded(svc: LocSvc): Promise<void> {
  const host = document.getElementById('c2-plan-host');
  if (!host || !_selectedFloorId) {
    _viewer?.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }
  const plan = svc.getPlanForFloor(_selectedFloorId);
  if (!plan?.pdf_url) {
    _viewer?.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }

  const needReload = !_viewer || _mountedPdfUrl !== plan.pdf_url;
  if (needReload) {
    _viewer?.destroy();
    _viewer = new PlanViewer(host, {
      onPlanClick: (x, y) => {
        if (!_selectedFloorId) return;
        const dSvc = _defects();
        if (!dSvc) {
          window.showToast?.('service.constructionDefects не загружен');
          return;
        }
        _viewer?.drawTempPin(x, y);
        openCreateDefectForm(
          { locationId: _selectedFloorId, x, y },
          async (input) => {
            await dSvc.create({
              locationId: input.locationId,
              x: input.x,
              y: input.y,
              description: input.description,
              category: input.category,
              contractorId: input.contractorId,
              deadline: input.deadline,
              template_key: input.template_key,
              item_id: input.item_id,
              item_name: input.item_name,
              norm_text: input.norm_text,
              photos: input.photos,
              status: 'issued'
            });
            _addMode = false;
            _viewer?.setAddMode(false);
            _viewer?.clearTempPin();
            window.showToast?.('Замечание сохранено');
            await _refreshOverlaysOnly();
            _syncModeButtons();
          },
          () => _viewer?.clearTempPin()
        );
      },
      onMarkerClick: (id) => {
        _openViewDefect(id);
      },
      onZoneDrawn: (zone) => {
        if (!_selectedFloorId) return;
        const aSvc = _acc();
        if (!aSvc) {
          window.showToast?.('service.constructionAcceptance не загружен');
          return;
        }
        openCreateAcceptanceForm(
          { locationId: _selectedFloorId, zone },
          async (input) => {
            await aSvc.create(input);
            _zoneMode = false;
            _viewer?.setZoneMode(false);
            window.showToast?.('✅ Заявка отправлена');
            await _refreshOverlaysOnly();
            _syncModeButtons();
          },
          () => {
            _viewer?.clearTempZone();
          }
        );
      },
      onZoneClick: (id) => {
        const aSvc = _acc();
        const item = aSvc?.get(id);
        if (!item || !aSvc) return;
        openAcceptanceDetails(item, {
          onFocusPlan: (rid) => {
            _viewer?.setFocusZone(rid);
          },
          onChangeStatus: async (rid, status) => {
            await aSvc.changeStatus(rid, status);
            window.showToast?.('✅ Статус обновлён');
            await _refreshOverlaysOnly();
          },
          onSoftDelete: async (rid) => {
            await aSvc.softDelete(rid);
            window.showToast?.('Заявка отозвана');
            await _refreshOverlaysOnly();
          }
        });
      }
    });
    try {
      await _viewer.load(plan.pdf_url);
      _mountedPdfUrl = plan.pdf_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      host.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">Ошибка плана: ${_escape(msg)}</div>`;
      _viewer = null;
      _mountedPdfUrl = null;
      return;
    }
  }

  if (_viewer) {
    _viewer.setAddMode(_addMode);
    _viewer.setZoneMode(_zoneMode);
  }
  await _refreshOverlaysOnly();

  if (_pendingFocusAccId && _viewer) {
    _viewer.setFocusZone(_pendingFocusAccId);
    _pendingFocusAccId = null;
  }
  if (_pendingHighlightDefectId && _viewer) {
    _viewer.highlightMarker(_pendingHighlightDefectId);
    _pendingHighlightDefectId = null;
  }
}

function _syncModeButtons() {
  const inFs = !!document.getElementById('c2-plan-fs');
  document.querySelectorAll('[data-c2-add-mode]').forEach((el) => {
    const btn = el as HTMLElement;
    btn.textContent = _addMode ? 'Кликни…' : '+ Замечание';
    if (inFs && btn.closest('#c2-plan-fs')) {
      btn.className = _addMode
        ? 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-indigo-600 text-white border-indigo-600'
        : 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-white/10 text-white border-white/30';
    } else {
      btn.className = _addMode
        ? 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-indigo-600 text-white border-indigo-600'
        : 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-transparent text-indigo-600 border-indigo-200 dark:border-indigo-800';
    }
  });
  document.querySelectorAll('[data-c2-zone-mode]').forEach((el) => {
    const btn = el as HTMLElement;
    btn.textContent = _zoneMode ? '2 клика…' : 'Зона';
    if (inFs && btn.closest('#c2-plan-fs')) {
      btn.className = _zoneMode
        ? 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-emerald-600 text-white border-emerald-600'
        : 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-white/10 text-white border-white/30';
    } else {
      btn.className = _zoneMode
        ? 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-emerald-600 text-white border-emerald-600'
        : 'px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-transparent text-emerald-700 border-emerald-200 dark:border-emerald-800';
    }
  });
}

async function _refreshOverlaysOnly(): Promise<void> {
  const dSvc = _defects();
  const aSvc = _acc();
  if (!_viewer || !_selectedFloorId) return;
  if (dSvc) await dSvc.init();
  if (aSvc) await aSvc.init();
  const allDefects = dSvc ? dSvc.listForFloor(_selectedFloorId) : [];
  const filtered = filterDefectsByPins(allDefects, pinFiltersState);
  const zones = aSvc ? aSvc.listForFloor(_selectedFloorId) : [];
  paintPinFilterHosts(allDefects, pinFiltersState, { compact: true });
  _viewer.setMarkers(filtered);
  _viewer.setZones(zones);
  const label = `Показано ${filtered.length} из ${allDefects.length} · Зон: ${zones.length}`;
  const countEl = document.getElementById('c2-overlay-count');
  if (countEl) countEl.textContent = label;
  const fsCount = document.getElementById('c2-fs-overlay-count');
  if (fsCount) fsCount.textContent = label;
}

async function _onPinFiltersChanged(): Promise<void> {
  if (_subview === 'defects') {
    await renderConstructionV2();
    return;
  }
  await _refreshOverlaysOnly();
}

function _closePlanFullscreen(): void {
  if (!_fsOpen) return;
  const overlay = document.getElementById('c2-plan-fs');
  const host = document.getElementById('c2-plan-host');
  if (host && _fsPlaceholder?.parentNode) {
    _fsPlaceholder.parentNode.insertBefore(host, _fsPlaceholder);
    _fsPlaceholder.remove();
  }
  _fsPlaceholder = null;
  overlay?.remove();
  if (_fsEscHandler) {
    document.removeEventListener('keydown', _fsEscHandler);
    _fsEscHandler = null;
  }
  _fsOpen = false;
}

function _openPlanFullscreen(): void {
  if (_fsOpen) return;
  const host = document.getElementById('c2-plan-host');
  if (!host || !_viewer) {
    window.showToast?.('Сначала откройте план этажа');
    return;
  }
  const parent = host.parentNode;
  if (!parent) return;

  _fsPlaceholder = document.createComment('c2-plan-host-slot');
  parent.insertBefore(_fsPlaceholder, host);

  const overlay = document.createElement('div');
  overlay.id = 'c2-plan-fs';
  overlay.className = 'fixed inset-0 z-[92] flex flex-col bg-slate-900';
  const addCls = _addMode
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-white/10 text-white border-white/30';
  const zoneCls = _zoneMode
    ? 'bg-emerald-600 text-white border-emerald-600'
    : 'bg-white/10 text-white border-white/30';
  overlay.innerHTML = `
    <div class="shrink-0 flex flex-col gap-1.5 px-3 py-2.5 border-b border-white/10 bg-slate-950/90">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-[11px] font-bold tracking-wide text-indigo-300">План · весь экран</div>
        <div class="flex items-center gap-2 flex-wrap">
          <span id="c2-fs-overlay-count" class="text-[10px] font-medium text-slate-400 hidden sm:inline"></span>
          ${_zoomToolbarHtml('fs')}
          <button type="button" data-c2-zone-mode
            class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${zoneCls}">
            ${_zoneMode ? '2 клика…' : 'Зона'}
          </button>
          <button type="button" data-c2-add-mode
            class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${addCls}">
            ${_addMode ? 'Кликни…' : '+ Замечание'}
          </button>
          <button type="button" data-c2-fs-close
            class="px-3 py-1.5 rounded-xl border text-[10px] font-bold bg-white text-slate-800 border-white">Закрыть</button>
        </div>
      </div>
      <div data-c2-pin-filters-host="fs"></div>
    </div>
    <div id="c2-plan-fs-host" class="relative flex-1 min-h-0 overflow-hidden"></div>`;

  const fsHost = overlay.querySelector('#c2-plan-fs-host') as HTMLElement;
  host.classList.add('h-full', 'min-h-0');
  fsHost.appendChild(host);
  document.body.appendChild(overlay);
  _fsOpen = true;

  overlay.querySelector('[data-c2-fs-close]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    _closePlanFullscreen();
  });

  _fsEscHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      _closePlanFullscreen();
    }
  };
  document.addEventListener('keydown', _fsEscHandler);

  void _refreshOverlaysOnly();
}

export function setConstructionV2Subview(view: ConstructionV2Subview): void {
  if (view !== 'plan') _closePlanFullscreen();
  _subview = view;
}

export function getConstructionV2Subview(): ConstructionV2Subview {
  return _subview;
}

/** Вызов из index при focus-событии / hash acceptance. */
export function requestFocusAcceptance(id: string, locationId: string): void {
  _subview = 'plan';
  _selectedFloorId = locationId;
  _pendingFocusAccId = id;
  if ((location.hash || '').replace(/^#/, '') !== '/construction-v2') {
    location.hash = '#/construction-v2';
  }
  renderConstructionV2().catch(() => {});
}

/** Из реестра: план + подсветка маркера. */
export function focusDefectOnPlan(id: string, locationId: string): void {
  _closePlanFullscreen();
  _subview = 'plan';
  _selectedFloorId = locationId;
  _pendingHighlightDefectId = id;
  if ((location.hash || '').replace(/^#/, '') !== '/construction-v2') {
    location.hash = '#/construction-v2';
  } else {
    renderConstructionV2().catch(() => {});
  }
}

export async function renderConstructionV2(): Promise<void> {
  const root = _root();
  if (!root) return;

  if (_subview === 'acceptance') {
    _closePlanFullscreen();
    teardownTransferUi();
    _viewer?.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    await renderAcceptanceKanban(root);
    return;
  }

  if (_subview === 'transfer') {
    _closePlanFullscreen();
    _viewer?.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    await renderTransferBoard(root);
    return;
  }

  teardownTransferUi();
  const svc = _loc();
  if (!svc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">service.locations не загружен</div>`;
    return;
  }
  const dSvc = _defects();
  const aSvc = _acc();
  await svc.init();
  if (dSvc) await dSvc.init();
  if (aSvc) await aSvc.init();

  const prevFloor = _selectedFloorId;
  _closePlanFullscreen();
  _viewer?.destroy();
  _viewer = null;
  _mountedPdfUrl = null;

  if (_subview === 'defects') {
    root.innerHTML = `
      <div class="flex flex-col md:flex-row gap-3 h-full min-h-[420px]">
        <aside class="md:w-72 shrink-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 overflow-y-auto max-h-[70vh]">
          <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Иерархия (v2)</div>
          <div id="c2-tree">${_renderTree(svc)}</div>
          ${
            !dSvc
              ? `<div class="mt-3 text-[10px] text-amber-600 font-bold">constructionDefects не загружен</div>`
              : ''
          }
        </aside>
        <main class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative" id="c2-defects-host"></main>
      </div>`;
    _bindOnce();
    if (prevFloor) _selectedFloorId = prevFloor;

    const host = document.getElementById('c2-defects-host');
    if (!host) return;
    const floor = _selectedFloorId ? svc.getNode(_selectedFloorId) : null;
    const path = _selectedFloorId
      ? svc
          .getPath(_selectedFloorId)
          .map((n) => n.displayName)
          .join(' / ')
      : '';
    const list = _selectedFloorId && dSvc ? dSvc.listForFloor(_selectedFloorId) : [];
    renderDefectsRegistry(host, {
      floorId: _selectedFloorId,
      floorLabel: path || floor?.displayName || '',
      defects: list,
      filters: pinFiltersState,
      cb: {
        onOpenDefect: (id) => _openViewDefect(id),
        onShowOnPlan: (id, locationId) => focusDefectOnPlan(id, locationId)
      }
    });
    return;
  }

  // plan subview
  root.innerHTML = `
    <div class="flex flex-col md:flex-row gap-3 h-full min-h-[420px]">
      <aside class="md:w-72 shrink-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 overflow-y-auto max-h-[70vh]">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Иерархия (v2)</div>
        <div id="c2-tree">${_renderTree(svc)}</div>
        ${
          !dSvc
            ? `<div class="mt-3 text-[10px] text-amber-600 font-bold">constructionDefects не загружен</div>`
            : ''
        }
        ${
          !aSvc
            ? `<div class="mt-1 text-[10px] text-amber-600 font-bold">constructionAcceptance не загружен</div>`
            : ''
        }
      </aside>
      <main class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative" id="c2-plan">
        ${_renderPlanChrome(svc)}
      </main>
    </div>`;

  _bindOnce();
  if (prevFloor) _selectedFloorId = prevFloor;
  await _mountViewerIfNeeded(svc);
}

function _bindOnce() {
  if (_bound) return;
  _bound = true;
  document.addEventListener(
    'click',
    (ev) => {
      const t = ev.target as HTMLElement | null;
      const floorBtn = t?.closest?.('[data-c2-floor]') as HTMLElement | null;
      if (floorBtn) {
        const id = floorBtn.getAttribute('data-c2-floor');
        if (!id) return;
        _selectedFloorId = id;
        _addMode = false;
        _zoneMode = false;
        renderConstructionV2().catch((e) => console.warn('[construction-v2] render', e));
        return;
      }
      const addBtn = t?.closest?.('[data-c2-add-mode]') as HTMLElement | null;
      if (addBtn) {
        _addMode = !_addMode;
        if (_addMode) _zoneMode = false;
        _viewer?.setAddMode(_addMode);
        _viewer?.setZoneMode(_zoneMode);
        _syncModeButtons();
        return;
      }
      const zoneBtn = t?.closest?.('[data-c2-zone-mode]') as HTMLElement | null;
      if (zoneBtn) {
        _zoneMode = !_zoneMode;
        if (_zoneMode) _addMode = false;
        _viewer?.setZoneMode(_zoneMode);
        _viewer?.setAddMode(_addMode);
        _syncModeButtons();
        return;
      }
      const fsBtn = t?.closest?.('[data-c2-fullscreen]') as HTMLElement | null;
      if (fsBtn) {
        ev.preventDefault();
        _openPlanFullscreen();
        return;
      }
      const zIn = t?.closest?.('[data-c2-zoom-in]') as HTMLElement | null;
      if (zIn) {
        ev.preventDefault();
        _viewer?.zoomIn();
        return;
      }
      const zOut = t?.closest?.('[data-c2-zoom-out]') as HTMLElement | null;
      if (zOut) {
        ev.preventDefault();
        _viewer?.zoomOut();
        return;
      }
      const zFit = t?.closest?.('[data-c2-zoom-fit]') as HTMLElement | null;
      if (zFit) {
        ev.preventDefault();
        _viewer?.fit();
        return;
      }
      const statusChip = t?.closest?.('[data-c2-pin-status]') as HTMLElement | null;
      if (statusChip) {
        // План квартиры слушает сам (свой host) — не двойной toggle
        if (t?.closest?.('#c2-apartment-plan')) return;
        ev.preventDefault();
        const key = statusChip.getAttribute('data-c2-pin-status');
        if (!key) return;
        toggleStatusFilter(pinFiltersState, key);
        void _onPinFiltersChanged();
        return;
      }
      const catBtn = t?.closest?.('[data-c2-pin-category]') as HTMLElement | null;
      if (catBtn) {
        if (t?.closest?.('#c2-apartment-plan')) return;
        ev.preventDefault();
        const key = catBtn.getAttribute('data-c2-pin-category') as PinCategory | null;
        if (!key) return;
        setCategoryFilter(pinFiltersState, key);
        void _onPinFiltersChanged();
      }
    },
    true
  );
}

export function mountConstructionV2Shell(): void {
  const content =
    window.RBI?.services?.shell?.getContentRoot?.() ||
    document.getElementById('app-content') ||
    document.getElementById('app-root');
  if (!content) return;
  if (document.getElementById('tab-construction-v2')) return;

  const section = document.createElement('div');
  section.id = 'tab-construction-v2';
  section.className = 'view-section hidden';
  section.innerHTML = `
    <div class="p-3 sm:p-4">
      <div class="flex items-center justify-between mb-3 gap-2">
        <div class="min-w-0">
          <h2 class="text-[14px] font-bold tracking-tight text-slate-800 dark:text-slate-100">Стройконтроль в2</h2>
          <p class="text-[10px] text-slate-400 mt-0.5">Тестовый контур · основной СК не затронут</p>
        </div>
        <a href="#/construction/defects"
          class="shrink-0 text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2.5 py-1.5 rounded-xl">Старый СК</a>
      </div>
      <div id="construction-v2-root"></div>
    </div>`;
  content.appendChild(section);
}

/** Точечное обновление маркеров/зон без полного re-render (после sync/CRUD). */
export async function refreshConstructionV2Markers(): Promise<void> {
  const tab = document.getElementById('tab-construction-v2');
  if (!tab || tab.classList.contains('hidden')) return;
  if (_subview === 'acceptance') {
    const root = _root();
    if (root) await renderAcceptanceKanban(root);
    return;
  }
  if (_subview === 'transfer') {
    const root = _root();
    if (root) await renderTransferBoard(root);
    return;
  }
  if (_subview === 'defects') {
    await renderConstructionV2();
    return;
  }
  await _refreshOverlaysOnly();
}

// re-export для index (focus helper)
export { focusAcceptanceOnPlan };
