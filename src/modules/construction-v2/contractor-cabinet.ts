/**
 * Subview «Кабинет» подрядчика — KPI + открытые / на проверке / просроченные + слоты.
 */

import type { ConstructionAcceptanceV2 } from '../../services/construction-acceptance/types';
import type { ConstructionDefectV2 } from '../../services/construction-defects/types';
import { isOverdueNow } from './defect-sla-metrics';
import {
  filterAcceptancesForRole,
  filterDefectsForRole,
  resolveMyContractorId
} from './contractor-scope';
import { listSlotOccupancy, slotBoardHtml } from './acceptance-slots';

export type CabinetCallbacks = {
  onOpenDefect: (id: string) => void;
  onOpenAcceptance: (id: string) => void;
};

type LocNode = { id: string; displayName: string };

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function _pathLabel(locationId: string): string {
  const loc = window.RBI?.services?.locations as
    | { getPath?: (id: string) => LocNode[]; getNode?: (id: string) => LocNode | null }
    | undefined;
  if (loc?.getPath) {
    return loc
      .getPath(locationId)
      .map((n) => n.displayName)
      .join(' · ');
  }
  return loc?.getNode?.(locationId)?.displayName || locationId;
}

function _statusLabel(s: string): string {
  const map: Record<string, string> = {
    issued: 'Выдано',
    in_progress: 'В работе',
    fixed: 'На проверке',
    closed: 'Закрыто',
    rejected: 'Отклонено',
    pending: 'Ожидает',
    accepted: 'Принята'
  };
  return map[s] || s || '—';
}

function _kpi(label: string, value: number, tone = ''): string {
  const toneCls =
    tone === 'danger'
      ? 'border-red-200 dark:border-red-900/50'
      : tone === 'warn'
        ? 'border-amber-200 dark:border-amber-900/40'
        : 'border-[var(--card-border)]';
  return `<div class="min-w-[6.5rem] flex-1 bg-[var(--card-bg)] border ${toneCls} rounded-2xl px-3 py-2.5">
    <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">${_escape(label)}</div>
    <div class="text-[18px] font-black text-slate-800 dark:text-slate-100 leading-none">${value}</div>
  </div>`;
}

function _defectRow(d: ConstructionDefectV2): string {
  const desc = String(d.description || d.item_name || d.text || 'Без описания').slice(0, 120);
  const overdue = isOverdueNow(d);
  return `<li>
    <button type="button" data-c2-cab-def="${_escape(d.id)}"
      class="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
        overdue ? 'bg-red-50/40 dark:bg-red-950/15' : ''
      }">
      <span class="flex flex-wrap items-center gap-1.5 mb-0.5">
        <span class="text-[10px] font-bold text-slate-500">${_escape(String(d.category || ''))}</span>
        <span class="text-[9px] font-bold uppercase text-indigo-600">${_escape(_statusLabel(String(d.status)))}</span>
        ${overdue ? '<span class="text-[9px] font-bold uppercase text-red-600">просрочено</span>' : ''}
      </span>
      <span class="block text-[13px] font-medium text-slate-800 dark:text-slate-100 line-clamp-2">${_escape(desc)}</span>
      <span class="block text-[10px] text-slate-400 mt-0.5">${_escape(_pathLabel(d.locationId))}</span>
    </button>
  </li>`;
}

function _accRow(a: ConstructionAcceptanceV2): string {
  return `<li>
    <button type="button" data-c2-cab-acc="${_escape(a.id)}"
      class="w-full text-left px-3 py-2.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
      <span class="flex flex-wrap items-center gap-1.5 mb-0.5">
        <span class="text-[9px] font-bold uppercase text-indigo-600">${_escape(_statusLabel(String(a.status)))}</span>
        <span class="text-[10px] font-bold text-slate-500">${_escape(a.requested_date || '—')} ${_escape(
          a.requested_time || ''
        )}</span>
      </span>
      <span class="block text-[13px] font-medium text-slate-800 dark:text-slate-100">${_escape(
        a.work_type || 'Без вида работ'
      )}</span>
      <span class="block text-[10px] text-slate-400 mt-0.5">${_escape(_pathLabel(a.locationId))}</span>
    </button>
  </li>`;
}

function _section(title: string, rows: string, empty: string): string {
  return `
    <section class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
      <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-indigo-600">${_escape(
        title
      )}</div>
      ${
        rows
          ? `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${rows}</ul>`
          : `<div class="p-4 text-center text-slate-400 text-[12px]">${_escape(empty)}</div>`
      }
    </section>`;
}

export function renderContractorCabinet(
  host: HTMLElement,
  opts: {
    defects: ConstructionDefectV2[];
    acceptances: ConstructionAcceptanceV2[];
    cb: CabinetCallbacks;
  }
): void {
  const myId = resolveMyContractorId();
  const defects = filterDefectsForRole(opts.defects || []);
  const acceptances = filterAcceptancesForRole(opts.acceptances || []);

  if (!myId) {
    host.innerHTML = `
      <div class="p-6 max-w-lg mx-auto">
        <div class="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-[13px] font-medium text-amber-900 dark:text-amber-100">
          Подрядчик не привязан к профилю. Обратитесь к администратору, чтобы назначить карточку подрядчика —
          иначе кабинет, реестр и пины будут пустыми.
        </div>
      </div>`;
    return;
  }

  const open = defects.filter((d) => {
    const st = String(d.status || '').toLowerCase();
    return st === 'issued' || st === 'in_progress' || st === 'open' || st === 'rejected';
  });
  const onReview = defects.filter((d) => String(d.status || '').toLowerCase() === 'fixed');
  const overdue = defects.filter((d) => isOverdueNow(d));
  const upcoming = acceptances
    .filter((a) => {
      const st = String(a.status || '').toLowerCase();
      return st === 'pending' || st === 'accepted';
    })
    .slice()
    .sort((a, b) => {
      const da = `${a.requested_date || ''} ${a.requested_time || ''}`;
      const db = `${b.requested_date || ''} ${b.requested_time || ''}`;
      return da.localeCompare(db);
    })
    .slice(0, 8);

  const occupancy = listSlotOccupancy(acceptances, { date: _today() });

  host.innerHTML = `
    <div class="space-y-3 p-1 sm:p-2">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Кабинет подрядчика</div>
        <div class="text-[10px] text-slate-400 font-bold truncate max-w-[14rem]" title="${_escape(myId)}">мой id · ${_escape(
          myId.length > 10 ? `${myId.slice(0, 8)}…` : myId
        )}</div>
      </div>
      <div class="flex flex-wrap gap-2">
        ${_kpi('Открытые', open.length)}
        ${_kpi('На проверке', onReview.length, 'warn')}
        ${_kpi('Просроченные', overdue.length, 'danger')}
        ${_kpi('Слоты (скоро)', upcoming.length)}
      </div>
      ${slotBoardHtml(occupancy, { title: `Слоты сегодня (${_today()})` })}
      ${_section('Открытые замечания', open.map(_defectRow).join(''), 'Нет открытых замечаний')}
      ${_section('На проверке', onReview.map(_defectRow).join(''), 'Нет замечаний на проверке')}
      ${_section('Просроченные', overdue.map(_defectRow).join(''), 'Нет просроченных')}
      ${_section('Ближайшие слоты приёмки', upcoming.map(_accRow).join(''), 'Нет заявок на приёмку')}
    </div>`;

  host.querySelectorAll('[data-c2-cab-def]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = (btn as HTMLElement).getAttribute('data-c2-cab-def');
      if (id) opts.cb.onOpenDefect(id);
    });
  });
  host.querySelectorAll('[data-c2-cab-acc]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = (btn as HTMLElement).getAttribute('data-c2-cab-acc');
      if (id) opts.cb.onOpenAcceptance(id);
    });
  });
}
