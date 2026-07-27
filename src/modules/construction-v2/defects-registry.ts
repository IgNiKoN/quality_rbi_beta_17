/**
 * Реестр замечаний этажа (construction-v2 subview `defects`).
 * Фильтр — тот же PinFilters, что на плане (chips статусов + категория).
 */

import type { ConstructionDefectV2 } from '../../services/construction-defects/types';
import {
  type PinFilters,
  filterDefectsByPins,
  pinFiltersState,
  renderPinFiltersHtml
} from './pin-filters';

/** @deprecated — оставлен для совместимости импортов; фильтр теперь PinFilters. */
export type DefectsFilter = 'all' | 'open' | 'closed';

export type DefectsRegistryCallbacks = {
  onOpenDefect: (id: string) => void;
  onShowOnPlan: (id: string, locationId: string) => void;
  onFiltersChanged?: () => void;
};

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _statusLabel(s: string): string {
  const map: Record<string, string> = {
    issued: 'Выдано',
    in_progress: 'В работе',
    fixed: 'Устранено',
    closed: 'Закрыто',
    rejected: 'Отклонено',
    open: 'Выдано',
    cancelled: 'Отклонено'
  };
  return map[s] || s || '—';
}

function _categoryLabel(c: string): string {
  const v = String(c || '').toUpperCase();
  if (v === 'B1' || v === 'MINOR') return 'B1';
  if (v === 'B3' || v === 'CRITICAL') return 'B3';
  if (v === 'B2' || v === 'MAJOR') return 'B2';
  return v || '—';
}

function _categoryBar(c: string): string {
  const v = String(c || '').toUpperCase();
  if (v === 'B1' || v === 'MINOR') return 'bg-blue-500';
  if (v === 'B3' || v === 'CRITICAL') return 'bg-red-600';
  return 'bg-orange-500';
}

function _isClosed(status: string): boolean {
  const st = String(status || '').toLowerCase();
  return st === 'closed' || st === 'fixed' || st === 'rejected' || st === 'cancelled';
}

function _deadlineMeta(v: unknown): { label: string; overdue: boolean } {
  if (v == null || v === '') return { label: 'без срока', overdue: false };
  const m = String(v).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return { label: String(v), overdue: false };
  const [y, mo, d] = m[1].split('-');
  const label = `${d}.${mo}.${y}`;
  const end = new Date(`${m[1]}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { label, overdue: end < today };
}

function _statusChip(status: string): string {
  const st = String(status || '').toLowerCase();
  let cls = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (st === 'issued' || st === 'open') cls = 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
  else if (st === 'in_progress') cls = 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  else if (st === 'fixed') cls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  else if (st === 'closed') cls = 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300';
  else if (st === 'rejected' || st === 'cancelled') cls = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  return `<span class="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${cls}">${_escape(
    _statusLabel(st)
  )}</span>`;
}

/** Фильтрация по PinFilters (общий контракт с планом). */
export function filterDefects(
  list: ConstructionDefectV2[],
  filters: PinFilters = pinFiltersState
): ConstructionDefectV2[] {
  return filterDefectsByPins(list, filters);
}

export function renderDefectsRegistry(
  host: HTMLElement,
  opts: {
    floorId: string | null;
    floorLabel?: string;
    defects: ConstructionDefectV2[];
    filters?: PinFilters;
    cb: DefectsRegistryCallbacks;
  }
): void {
  const { floorId, floorLabel, defects, cb } = opts;
  const filters = opts.filters || pinFiltersState;

  if (!floorId) {
    host.innerHTML = `<div class="flex items-center justify-center h-full min-h-[240px] text-slate-400 text-[13px] font-medium px-6 text-center">
      Выберите этаж слева, чтобы увидеть реестр замечаний
    </div>`;
    return;
  }

  const filtered = filterDefectsByPins(defects, filters);
  const rows =
    filtered.length === 0
      ? `<div class="p-8 text-center text-slate-400 text-[13px] font-medium">
          Нет замечаний по выбранному фильтру
        </div>`
      : `<ul class="divide-y divide-slate-100 dark:divide-slate-800">
          ${filtered
            .map((d, i) => {
              const desc = String(d.description || d.item_name || d.text || 'Без описания').slice(0, 140);
              const dl = _deadlineMeta(d.deadline);
              const dlCls =
                dl.overdue && !_isClosed(String(d.status))
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-slate-400';
              const bar = _categoryBar(String(d.category));
              return `<li>
                <div class="flex items-stretch hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <div class="w-1 shrink-0 ${bar}"></div>
                  <button type="button" data-c2-def-row="${_escape(d.id)}"
                    class="flex-1 min-w-0 text-left px-3 py-2.5 flex items-start gap-2.5">
                    <span class="shrink-0 w-6 h-6 mt-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                                 flex items-center justify-center text-[10px] font-bold">${i + 1}</span>
                    <span class="min-w-0 flex-1">
                      <span class="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span class="text-[10px] font-bold text-slate-500">${_escape(_categoryLabel(String(d.category)))}</span>
                        ${_statusChip(String(d.status))}
                        <span class="text-[10px] ${dlCls}">${_escape(dl.label)}${dl.overdue && !_isClosed(String(d.status)) ? ' · просрочено' : ''}</span>
                      </span>
                      <span class="block text-[13px] font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">${_escape(desc)}</span>
                    </span>
                  </button>
                  <button type="button" data-c2-def-on-plan="${_escape(d.id)}" data-c2-def-loc="${_escape(d.locationId)}"
                    class="shrink-0 self-center mr-2 px-2 py-1.5 rounded-lg text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    title="Показать на плане">На плане</button>
                </div>
              </li>`;
            })
            .join('')}
        </ul>`;

  host.innerHTML = `
    <div class="flex flex-col h-full min-h-[320px]">
      <div class="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[12px] font-semibold text-slate-700 dark:text-slate-200 min-w-0 truncate">
            ${_escape(floorLabel || 'Этаж')}
          </div>
          <div class="text-[10px] text-slate-400 shrink-0">Показано ${filtered.length} из ${defects.length}</div>
        </div>
        <div data-c2-pin-filters-host="registry">${renderPinFiltersHtml(defects, filters, { compact: true })}</div>
      </div>
      <div class="flex-1 overflow-y-auto">${rows}</div>
    </div>`;

  host.querySelectorAll('[data-c2-def-row]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = (btn as HTMLElement).getAttribute('data-c2-def-row');
      if (id) cb.onOpenDefect(id);
    });
  });

  host.querySelectorAll('[data-c2-def-on-plan]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const el = btn as HTMLElement;
      const id = el.getAttribute('data-c2-def-on-plan');
      const loc = el.getAttribute('data-c2-def-loc');
      if (id && loc) cb.onShowOnPlan(id, loc);
    });
  });
}
