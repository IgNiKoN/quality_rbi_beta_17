/**
 * Карточка квартиры (sheet поверх transfer-board).
 * PDF upload/clear — только из Настроек (location-directory); здесь open + pin.
 */

import type { ConstructionUnitV2, UnitStatusV2 } from '../../services/construction-units/types';
import { UNIT_STATUS_LABELS_RU, UNIT_STATUSES_V2 } from '../../services/construction-units/types';

type LocPathNode = { id: string; displayName?: string; nodeType?: string };

type LocSvc = {
  getPath?: (id: string) => LocPathNode[];
};

type UnitsSvc = {
  get: (id: string) => ConstructionUnitV2 | null;
  changeStatus: (id: string, status: string) => Promise<ConstructionUnitV2>;
  softDelete: (id: string) => Promise<ConstructionUnitV2>;
};

export type UnitCardCallbacks = {
  onChanged: () => void | Promise<void>;
  isGuest: () => boolean;
  canSoftDelete: (u: ConstructionUnitV2) => boolean;
  toast: (msg: string) => void;
  /** Открыть pin-UI на PDF квартиры (блок B). */
  onOpenApartmentPlan?: (unit: ConstructionUnitV2) => void | Promise<void>;
  /** Приёмка квартиры (locationId = apartment). */
  onOpenAcceptance?: (unit: ConstructionUnitV2) => void | Promise<void>;
};

let _openUnitId: string | null = null;

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _pathLabel(loc: LocSvc | null, locationId: string): string {
  if (!loc?.getPath || !locationId) return locationId || '—';
  try {
    const path = loc.getPath(locationId) || [];
    if (!path.length) return locationId;
    return path.map((n) => n.displayName || n.id).join(' / ');
  } catch {
    return locationId;
  }
}

export function closeUnitCard() {
  _openUnitId = null;
  document.getElementById('c2-unit-card')?.remove();
}

export function isUnitCardOpen(): boolean {
  return !!_openUnitId;
}

export function openUnitCard(
  unit: ConstructionUnitV2,
  deps: { loc: LocSvc | null; units: UnitsSvc; cb: UnitCardCallbacks }
) {
  closeUnitCard();
  _openUnitId = unit.id;
  const guest = deps.cb.isGuest();
  const canDel = !guest && deps.cb.canSoftDelete(unit);
  const path = _pathLabel(deps.loc, unit.locationId);
  const status = String(unit.status || 'not_inspected') as UnitStatusV2;
  const hasPdf = !!(unit.pdf_url && String(unit.pdf_url).startsWith('http'));

  const statusOpts = UNIT_STATUSES_V2.map(
    (st) =>
      `<option value="${st}" ${status === st ? 'selected' : ''}>${_escape(UNIT_STATUS_LABELS_RU[st])}</option>`
  ).join('');

  const wrap = document.createElement('div');
  wrap.id = 'c2-unit-card';
  // Inline z-index: выше .bottom-nav (1000), ниже plan fullscreen (1100)
  wrap.className = 'fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 p-3';
  wrap.style.zIndex = '1050';
  wrap.innerHTML = `
    <div data-c2-unit-card-panel class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
      <div class="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div>
          <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Квартира</div>
          <div class="text-[18px] font-black text-slate-800 dark:text-slate-100">${_escape(unit.type || 'КВ')} ${_escape(
            unit.name
          )}</div>
          <div class="text-[11px] font-bold text-slate-400 mt-0.5">${_escape(path)}</div>
        </div>
        <button type="button" data-c2-unit-card-close class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[20px] leading-none px-1" aria-label="Закрыть">×</button>
      </div>
      <div class="px-4 pb-4 space-y-3">
        <label class="block">
          <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Статус передачи</span>
          <select id="c2-unit-card-status" data-c2-unit-id="${_escape(unit.id)}"
            class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold"
            ${guest ? 'disabled' : ''}>
            ${statusOpts}
          </select>
        </label>
        <div class="rounded-xl border border-slate-200 dark:border-slate-600 p-3 space-y-2">
          <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">План квартиры (PDF)</div>
          ${
            hasPdf
              ? `<div class="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">${_escape(
                  unit.pdf_name || 'plan.pdf'
                )}${unit.pdf_size ? ` · ${_escape(String(unit.pdf_size))} B` : ''}</div>
                 <div class="flex flex-wrap gap-2">
                   <a href="${_escape(String(unit.pdf_url))}" target="_blank" rel="noopener"
                     class="inline-flex items-center px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase border border-indigo-200">Открыть</a>
                   <button type="button" data-c2-unit-apt-plan="${_escape(unit.id)}"
                     class="inline-flex items-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase border border-indigo-600">Замечания на плане</button>
                 </div>`
              : `<div class="text-[11px] text-slate-400 font-bold">План не загружен</div>
                 <div class="text-[10px] text-slate-400 font-bold">Загрузка PDF — в Настройках → справочник локаций</div>
                 <button type="button" disabled
                   class="inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-black uppercase border border-slate-200 cursor-not-allowed opacity-70">Замечания на плане</button>`
          }
        </div>
        <button type="button" data-c2-unit-acceptance="${_escape(unit.id)}"
          class="w-full py-2.5 rounded-xl text-[11px] font-black uppercase text-white bg-violet-600 border border-violet-600 ${guest ? 'opacity-50 cursor-not-allowed' : ''}"
          ${guest ? 'disabled' : ''}>Приёмка</button>
        ${
          canDel
            ? `<button type="button" data-c2-unit-delete="${_escape(unit.id)}"
                class="w-full py-2.5 rounded-xl text-[11px] font-black uppercase text-red-600 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">Удалить помещение</button>`
            : ''
        }
      </div>
    </div>`;

  document.body.appendChild(wrap);

  wrap.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    if (t === wrap || t.closest?.('[data-c2-unit-card-close]')) {
      closeUnitCard();
    }
  });

  const sel = wrap.querySelector('#c2-unit-card-status') as HTMLSelectElement | null;
  sel?.addEventListener('change', () => {
    if (guest || !sel) return;
    const id = sel.getAttribute('data-c2-unit-id');
    const st = sel.value;
    if (!id || !st) return;
    void (async () => {
      try {
        await deps.units.changeStatus(id, st);
        deps.cb.toast('Статус обновлён');
        await deps.cb.onChanged();
        const fresh = deps.units.get(id);
        if (fresh) openUnitCard(fresh, deps);
      } catch (e) {
        deps.cb.toast(`Ошибка: ${(e as Error)?.message || e}`);
      }
    })();
  });

  wrap.querySelector('[data-c2-unit-apt-plan]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    const id = (ev.currentTarget as HTMLElement).getAttribute('data-c2-unit-apt-plan');
    if (!id) return;
    const fresh = deps.units.get(id) || unit;
    if (!deps.cb.onOpenApartmentPlan) {
      deps.cb.toast('Открытие плана недоступно');
      return;
    }
    void deps.cb.onOpenApartmentPlan(fresh);
  });

  wrap.querySelector('[data-c2-unit-acceptance]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (guest) return;
    const id = (ev.currentTarget as HTMLElement).getAttribute('data-c2-unit-acceptance');
    if (!id) return;
    const fresh = deps.units.get(id) || unit;
    if (!deps.cb.onOpenAcceptance) {
      deps.cb.toast('Приёмка недоступна');
      return;
    }
    void deps.cb.onOpenAcceptance(fresh);
  });

  wrap.querySelector('[data-c2-unit-delete]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (guest) return;
    const id = (ev.currentTarget as HTMLElement).getAttribute('data-c2-unit-delete');
    if (!id || !confirm('Удалить помещение?')) return;
    void (async () => {
      try {
        await deps.units.softDelete(id);
        closeUnitCard();
        deps.cb.toast('Удалено');
        await deps.cb.onChanged();
      } catch (e) {
        deps.cb.toast(`Ошибка: ${(e as Error)?.message || e}`);
      }
    })();
  });
}
