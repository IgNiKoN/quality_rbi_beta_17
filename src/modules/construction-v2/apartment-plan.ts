/**
 * Отдельный хост PlanViewer для PDF квартиры (не этажный #c2-plan).
 * Дефекты с locationId = apartment; без zone-mode / acceptance.
 */

import type { ConstructionDefectV2 } from '../../services/construction-defects/types';
import type { ConstructionUnitV2 } from '../../services/construction-units/types';
import { openCreateDefectForm, openViewDefectForm } from './defect-form';
import { PlanViewer } from './plan-viewer';

type LocNode = { id: string; nodeType?: string; displayName?: string };

type LocSvc = {
  getNode?: (id: string) => LocNode | null;
  getPath?: (id: string) => LocNode[];
};

type DefectsSvc = {
  init: () => Promise<boolean>;
  list: (opts?: { locationId?: string }) => ConstructionDefectV2[];
  listForLocation?: (locationId: string) => ConstructionDefectV2[];
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

type UnitsSvc = {
  get: (id: string) => ConstructionUnitV2 | null;
  ensureApartmentForUnit?: (unitId: string) => Promise<ConstructionUnitV2>;
  changeStatus: (id: string, status: string) => Promise<ConstructionUnitV2>;
};

export type ApartmentPlanCallbacks = {
  isGuest: () => boolean;
  toast: (msg: string) => void;
  onChanged?: () => void | Promise<void>;
};

let _viewer: PlanViewer | null = null;
let _openUnitId: string | null = null;
let _apartmentId: string | null = null;
let _addMode = false;

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _defects(): DefectsSvc | null {
  return (window.RBI?.services?.constructionDefects as DefectsSvc) || null;
}

function _units(): UnitsSvc | null {
  return (window.RBI?.services?.constructionUnits as UnitsSvc) || null;
}

function _loc(): LocSvc | null {
  return (window.RBI?.services?.locations as LocSvc) || null;
}

function _listForApartment(dSvc: DefectsSvc, apartmentId: string): ConstructionDefectV2[] {
  if (typeof dSvc.listForLocation === 'function') return dSvc.listForLocation(apartmentId);
  return dSvc.list({ locationId: apartmentId });
}

function _pathLabel(apartmentId: string): string {
  const loc = _loc();
  if (!loc?.getPath || !apartmentId) return apartmentId || '—';
  try {
    const path = loc.getPath(apartmentId) || [];
    if (!path.length) return apartmentId;
    return path.map((n) => n.displayName || n.id).join(' / ');
  } catch {
    return apartmentId;
  }
}

function _syncAddBtn() {
  const btn = document.querySelector('[data-c2-apt-add-mode]') as HTMLElement | null;
  if (!btn) return;
  btn.textContent = _addMode ? 'Кликни на план…' : '+ Замечание';
  btn.className = _addMode
    ? 'px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-indigo-600 text-white border-indigo-600'
    : 'px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200';
}

async function _refreshPins(): Promise<void> {
  const dSvc = _defects();
  if (!_viewer || !_apartmentId || !dSvc) return;
  await dSvc.init();
  const defects = _listForApartment(dSvc, _apartmentId);
  _viewer.setMarkers(defects);
  const countEl = document.getElementById('c2-apt-overlay-count');
  if (countEl) countEl.textContent = `Замечаний: ${defects.length}`;
}

async function _maybeMarkHasDefects(unitId: string): Promise<void> {
  const uSvc = _units();
  if (!uSvc) return;
  const u = uSvc.get(unitId);
  if (!u) return;
  const st = String(u.status || 'not_inspected');
  if (st !== 'not_inspected' && st !== 'none') return;
  try {
    await uSvc.changeStatus(unitId, 'has_defects');
  } catch (e) {
    console.warn('[apartment-plan] changeStatus has_defects', e);
  }
}

export function closeApartmentPlan(): void {
  _viewer?.destroy();
  _viewer = null;
  _openUnitId = null;
  _apartmentId = null;
  _addMode = false;
  document.getElementById('c2-apartment-plan')?.remove();
}

export function isApartmentPlanOpen(): boolean {
  return !!_openUnitId;
}

/** Точечное обновление пинов (после sync / CRUD). */
export async function refreshApartmentPlanMarkers(): Promise<void> {
  if (!_openUnitId || !_apartmentId) return;
  await _refreshPins();
}

/**
 * Открыть полноэкранный PlanViewer на PDF квартиры.
 * locationId дефектов = canonical apartment (unit.locationId после ensure).
 */
export async function openApartmentPlan(
  unit: ConstructionUnitV2,
  cb: ApartmentPlanCallbacks
): Promise<void> {
  closeApartmentPlan();

  const pdfUrl = String(unit.pdf_url || '');
  if (!pdfUrl.startsWith('http')) {
    cb.toast('Сначала загрузите PDF плана квартиры');
    return;
  }

  const uSvc = _units();
  const dSvc = _defects();
  if (!dSvc) {
    cb.toast('service.constructionDefects не загружен');
    return;
  }
  if (!uSvc) {
    cb.toast('service.constructionUnits не загружен');
    return;
  }

  let fresh = unit;
  try {
    if (typeof uSvc.ensureApartmentForUnit === 'function') {
      fresh = await uSvc.ensureApartmentForUnit(unit.id);
    }
  } catch (e) {
    cb.toast(`Нужна миграция квартиры: ${(e as Error)?.message || e}`);
    return;
  }

  const loc = _loc();
  const node = loc?.getNode?.(fresh.locationId);
  if (node && node.nodeType && node.nodeType !== 'apartment') {
    cb.toast('Сначала откройте Передачу — нужна привязка к квартире');
    return;
  }

  const apartmentId = fresh.locationId;
  if (!apartmentId) {
    cb.toast('У помещения нет locationId');
    return;
  }

  _openUnitId = fresh.id;
  _apartmentId = apartmentId;
  _addMode = false;
  const guest = cb.isGuest();
  const title = `${fresh.type || 'КВ'} ${fresh.name || ''}`.trim();
  const path = _pathLabel(apartmentId);

  const wrap = document.createElement('div');
  wrap.id = 'c2-apartment-plan';
  wrap.className = 'fixed inset-0 z-[95] flex flex-col bg-slate-100 dark:bg-slate-900';
  wrap.innerHTML = `
    <div class="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div class="min-w-0">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Замечания на плане</div>
        <div class="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">${_escape(title)}</div>
        <div class="text-[10px] font-bold text-slate-400 truncate">${_escape(path)}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span id="c2-apt-overlay-count" class="text-[10px] font-bold text-slate-400 hidden sm:inline">Замечаний: 0</span>
        ${
          guest
            ? ''
            : `<button type="button" data-c2-apt-add-mode
                class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200">+ Замечание</button>`
        }
        <button type="button" data-c2-apt-close
          class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-600">Закрыть</button>
      </div>
    </div>
    <div id="c2-apt-plan-host" class="relative flex-1 min-h-0 overflow-hidden"></div>`;

  document.body.appendChild(wrap);

  wrap.querySelector('[data-c2-apt-close]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    closeApartmentPlan();
    void cb.onChanged?.();
  });

  wrap.querySelector('[data-c2-apt-add-mode]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (guest) return;
    _addMode = !_addMode;
    _viewer?.setAddMode(_addMode);
    _syncAddBtn();
  });

  const host = wrap.querySelector('#c2-apt-plan-host') as HTMLElement;
  _viewer = new PlanViewer(host, {
    onPlanClick: (x, y) => {
      if (!_apartmentId || guest) return;
      _viewer?.drawTempPin(x, y);
      openCreateDefectForm(
        { locationId: _apartmentId, x, y },
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
          if (_openUnitId) await _maybeMarkHasDefects(_openUnitId);
          _addMode = false;
          _viewer?.setAddMode(false);
          _viewer?.clearTempPin();
          _syncAddBtn();
          cb.toast('Замечание сохранено');
          await _refreshPins();
          await cb.onChanged?.();
        },
        () => _viewer?.clearTempPin()
      );
    },
    onMarkerClick: (id) => {
      const d = dSvc.get(id);
      if (!d) return;
      openViewDefectForm(
        d,
        async (defectId) => {
          await dSvc.softDelete(defectId);
          cb.toast('Замечание удалено');
          await _refreshPins();
          await cb.onChanged?.();
        },
        async (defectId, patch) => {
          await dSvc.update(defectId, patch);
          cb.toast('Замечание обновлено');
          await _refreshPins();
        },
        async (defectId, input) => {
          await dSvc.changeStatus(defectId, input.status, {
            comment: input.comment,
            photos: input.photos
          });
          cb.toast('✅ Статус обновлён');
          await _refreshPins();
        }
      );
    }
  });

  try {
    await dSvc.init();
    await _viewer.load(pdfUrl);
    await _refreshPins();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    host.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">Ошибка плана: ${_escape(msg)}</div>`;
    _viewer = null;
  }
}
