/**
 * Канбан заявок на приёмку construction-v2: pending / rejected / accepted.
 */

import type { ConstructionAcceptanceV2 } from '../../services/construction-acceptance/types';
import type { LocationNode } from '../../services/locations/types';
import { openAcceptanceDetails } from './acceptance-form';

type AccSvc = {
  init: () => Promise<boolean>;
  list: (opts?: { includeDeleted?: boolean }) => ConstructionAcceptanceV2[];
  get: (id: string) => ConstructionAcceptanceV2 | null;
  changeStatus: (id: string, status: string) => Promise<ConstructionAcceptanceV2>;
  softDelete: (id: string) => Promise<ConstructionAcceptanceV2>;
};

type LocSvc = {
  init: () => Promise<boolean>;
  listNodes: (opts?: { nodeType?: string; parentId?: string | null }) => LocationNode[];
  getPath: (id: string) => LocationNode[];
  getNode: (id: string) => LocationNode | null;
};

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _acc(): AccSvc | null {
  return (window.RBI?.services?.constructionAcceptance as AccSvc) || null;
}

function _loc(): LocSvc | null {
  return (window.RBI?.services?.locations as LocSvc) || null;
}

let _filterObjectId: string | null = null;
let _bound = false;

function _objectIdForFloor(loc: LocSvc, floorId: string): string | null {
  const path = loc.getPath(floorId);
  const obj = path.find((n) => n.nodeType === 'object');
  return obj?.id || path[0]?.id || null;
}

function _cardHtml(r: ConstructionAcceptanceV2, loc: LocSvc): string {
  const path = loc
    .getPath(r.locationId)
    .map((n) => n.displayName)
    .join(' · ');
  const overdue =
    r.status === 'pending' &&
    r.requested_date &&
    new Date(r.requested_date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  return `
    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 mb-3 shadow-sm cursor-pointer hover:border-indigo-400 transition-colors"
         data-c2-acc-card="${_escape(r.id)}">
      <div class="flex justify-between items-start gap-2 mb-1">
        <div class="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight">${_escape(r.work_type || 'Без вида работ')}</div>
        ${overdue ? '<span class="text-[8px] font-black uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded">просрочено</span>' : ''}
      </div>
      <div class="text-[10px] text-slate-500 font-bold mb-2">${_escape(path || r.locationId)}</div>
      <div class="flex justify-between items-center text-[10px]">
        <span class="font-bold text-slate-600">${_escape(r.requested_date || '—')} ${_escape(r.requested_time || '')}</span>
        <button type="button" data-c2-acc-plan="${_escape(r.id)}"
          class="text-indigo-600 bg-white border border-indigo-200 px-2 py-1 rounded text-[9px] font-bold">План</button>
      </div>
      ${r.volume ? `<div class="mt-1 text-[9px] text-slate-400 font-bold">${_escape(r.volume)}</div>` : ''}
    </div>`;
}

function _column(title: string, color: string, items: ConstructionAcceptanceV2[], loc: LocSvc): string {
  return `
    <div class="flex-1 min-w-[220px] bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-2">
      <div class="flex items-center justify-between px-1 mb-2">
        <span class="text-[10px] font-black uppercase tracking-widest ${color}">${_escape(title)}</span>
        <span class="bg-white dark:bg-slate-800 text-slate-600 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 text-[10px] font-bold">${items.length}</span>
      </div>
      <div class="max-h-[55vh] overflow-y-auto">
        ${
          items.length
            ? items.map((r) => _cardHtml(r, loc)).join('')
            : '<div class="text-center py-4 text-[10px] font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">Заявок нет</div>'
        }
      </div>
    </div>`;
}

export async function renderAcceptanceKanban(root: HTMLElement): Promise<void> {
  const acc = _acc();
  const loc = _loc();
  if (!acc || !loc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">constructionAcceptance / locations не загружены</div>`;
    return;
  }
  await loc.init();
  await acc.init();

  const objects = loc.listNodes({ nodeType: 'object', parentId: null });
  const objOpts =
    `<option value="">Все объекты</option>` +
    objects
      .map(
        (o) =>
          `<option value="${_escape(o.id)}" ${_filterObjectId === o.id ? 'selected' : ''}>${_escape(o.displayName)}</option>`
      )
      .join('');

  let all = acc.list();
  if (_filterObjectId) {
    all = all.filter((r) => _objectIdForFloor(loc, r.locationId) === _filterObjectId);
  }
  const pending = all.filter((r) => r.status === 'pending');
  const rejected = all.filter((r) => r.status === 'rejected');
  const accepted = all.filter((r) => r.status === 'accepted');

  root.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Канбан приёмки (v2)</div>
        <select id="c2-acc-obj-filter" class="input-base text-[11px] font-bold max-w-[220px]">${objOpts}</select>
      </div>
      <div class="flex flex-col lg:flex-row gap-3">
        ${_column('Ожидают', 'text-blue-600', pending, loc)}
        ${_column('Отклонены', 'text-red-600', rejected, loc)}
        ${_column('Приняты', 'text-green-600', accepted, loc)}
      </div>
    </div>`;

  _bindOnce();
}

function _bindOnce() {
  if (_bound) return;
  _bound = true;
  document.addEventListener(
    'change',
    (ev) => {
      const t = ev.target as HTMLElement | null;
      if (t?.id === 'c2-acc-obj-filter') {
        _filterObjectId = (t as HTMLSelectElement).value || null;
        const root = document.getElementById('construction-v2-root');
        if (root) renderAcceptanceKanban(root).catch(() => {});
      }
    },
    true
  );
  document.addEventListener(
    'click',
    (ev) => {
      const t = ev.target as HTMLElement | null;
      const planBtn = t?.closest?.('[data-c2-acc-plan]') as HTMLElement | null;
      if (planBtn) {
        ev.stopPropagation();
        const id = planBtn.getAttribute('data-c2-acc-plan');
        if (id) focusAcceptanceOnPlan(id);
        return;
      }
      const card = t?.closest?.('[data-c2-acc-card]') as HTMLElement | null;
      if (card) {
        const id = card.getAttribute('data-c2-acc-card');
        if (!id) return;
        const acc = _acc();
        const item = acc?.get(id);
        if (!item || !acc) return;
        openAcceptanceDetails(item, {
          onFocusPlan: (rid) => focusAcceptanceOnPlan(rid),
          onChangeStatus: async (rid, status) => {
            await acc.changeStatus(rid, status);
            window.showToast?.('✅ Статус обновлён');
            const root = document.getElementById('construction-v2-root');
            if (root) await renderAcceptanceKanban(root);
          },
          onSoftDelete: async (rid) => {
            await acc.softDelete(rid);
            window.showToast?.('Заявка отозвана');
            const root = document.getElementById('construction-v2-root');
            if (root) await renderAcceptanceKanban(root);
          }
        });
      }
    },
    true
  );
}

/** Переход на план + подсветка зоны (через hash + событие). */
export function focusAcceptanceOnPlan(id: string): void {
  const acc = _acc();
  const item = acc?.get(id);
  if (!item?.locationId || !item.zone) {
    window.showToast?.('⚠️ Для этой заявки не была выделена зона на плане');
    return;
  }
  window.RBI?.events?.emit?.('construction-acceptance:focus', {
    id,
    locationId: item.locationId
  });
  if ((location.hash || '').replace(/^#/, '') !== '/construction-v2') {
    location.hash = '#/construction-v2';
  }
}
