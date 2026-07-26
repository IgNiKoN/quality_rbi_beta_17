/**
 * Модалка create/details заявки на приёмку construction-v2 (без ConstAcceptance / startInspection).
 */

import type {
  AcceptanceStatusV2,
  AcceptanceZoneV2,
  ChecklistItemStatusV2,
  ConstructionAcceptanceV2
} from '../../services/construction-acceptance/types';
import {
  acceptGateWarning,
  listFailBatchCandidates,
  resolveTemplateGroups,
  renderChecklistSectionHtml
} from './acceptance-checklist';
import { openCreateDefectForm } from './defect-form';

/** Full-rect zone для приёмки квартиры (без zone-picker). */
export const APARTMENT_FULL_ZONE: AcceptanceZoneV2 = { x: 0, y: 0, w: 100, h: 100 };

type ChecklistItemMeta = {
  id: string;
  name: string;
  group?: string;
  norm?: string;
  weight?: number | null;
};

type ChecklistRunnerApi = {
  open: (opts: {
    title: string;
    templateKey: string;
    groups: Array<{
      group?: string;
      title?: string;
      items?: Array<{ id: string | number; n?: string; t?: string; w?: number }>;
    }>;
    getStatus: (id: string) => ChecklistItemStatusV2 | null;
    setStatus: (
      id: string,
      status: string | null,
      itemMeta: ChecklistItemMeta
    ) => void | Promise<void>;
    getItemDetails?: (id: string) => { comment?: string; photos?: string[] };
    setItemComment?: (id: string, comment: string, itemMeta: ChecklistItemMeta) => void | Promise<void>;
    addItemPhoto?: (id: string, itemMeta: ChecklistItemMeta) => void | Promise<void>;
    removeItemPhoto?: (id: string, index: number, itemMeta: ChecklistItemMeta) => void | Promise<void>;
    onHelp?: (id: string, event: Event, itemMeta: ChecklistItemMeta) => void;
    onEscalate?: (id: string, itemMeta: ChecklistItemMeta) => void | Promise<void>;
    onFailAction?: (item: ChecklistItemMeta) => void;
    onBatchFailAction?: () => void | Promise<void>;
    onClose?: () => void;
    features?: {
      na?: boolean;
      failAction?: boolean;
      batchFail?: boolean;
      norms?: boolean;
      weightTag?: boolean;
      photos?: boolean;
      comments?: boolean;
      help?: boolean;
      escalate?: boolean;
      swipe?: boolean;
      collapse?: boolean;
    };
  }) => { close: () => void; refresh: () => void } | null;
};

function _checklistRunner(): ChecklistRunnerApi | null {
  return (
    (window as unknown as { ChecklistRunner?: ChecklistRunnerApi }).ChecklistRunner ||
    ((window.RBI as { shared?: { checklistRunner?: ChecklistRunnerApi } } | undefined)?.shared
      ?.checklistRunner ?? null)
  );
}

export type AcceptanceFormCreateInput = {
  locationId: string;
  zone: AcceptanceZoneV2;
  template_key: string | null;
  work_type: string | null;
  volume: string | null;
  requested_date: string | null;
  requested_time: string | null;
  contractorId: string | null;
};

type LocNode = { id: string; displayName: string; nodeType?: string; parentId?: string | null };

type AccSvc = {
  get: (id: string) => ConstructionAcceptanceV2 | null;
  setChecklistItem: (
    id: string,
    item: {
      id: string;
      group?: string | null;
      name: string;
      status: ChecklistItemStatusV2 | string;
      comment?: string | null;
      photos?: string[] | null;
      clearExtras?: boolean;
    }
  ) => Promise<ConstructionAcceptanceV2>;
  setChecklistResults: (
    id: string,
    results: ConstructionAcceptanceV2['checklist_results']
  ) => Promise<ConstructionAcceptanceV2>;
};

type DefSvc = {
  create: (input: Record<string, unknown>) => Promise<unknown>;
  list?: (opts?: { locationId?: string }) => Array<{
    item_id?: string | null;
    locationId?: string;
    status?: string;
    is_deleted?: boolean;
    _deleted?: boolean;
  }>;
  listForLocation?: (locationId: string) => Array<{
    item_id?: string | null;
    locationId?: string;
    status?: string;
    is_deleted?: boolean;
    _deleted?: boolean;
  }>;
};

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _roleInfo() {
  const perms = window.RBI?.services?.permissions as
    | {
        getCurrentRole?: () => string;
        isEngineerOrAdmin?: () => boolean;
      }
    | undefined;
  const role = perms?.getCurrentRole?.() || 'guest';
  const isEngineer =
    perms?.isEngineerOrAdmin?.() ?? ['engineer', 'manager', 'deputy_manager', 'admin'].includes(role);
  return { role, isEngineer };
}

function _sysTemplates(): Record<string, { title?: string }> {
  return (
    (window as unknown as { SYSTEM_TEMPLATES?: Record<string, { title?: string }> }).SYSTEM_TEMPLATES || {}
  );
}

function _userTemplates(): Record<string, { title?: string }> {
  return (
    (window as unknown as { userTemplates?: Record<string, { title?: string }> }).userTemplates || {}
  );
}

async function _fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Не удалось прочитать файл'));
    r.readAsDataURL(file);
  });
}

async function _pickAndSaveChecklistPhotos(): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    const cleanup = () => {
      try {
        input.remove();
      } catch (_) { /* ignore */ }
    };
    input.addEventListener('change', () => {
      void (async () => {
        try {
          const files = Array.from(input.files || []).filter(
            (f) => f && f.type && f.type.startsWith('image/')
          );
          if (!files.length) {
            cleanup();
            resolve([]);
            return;
          }
          const pm = (
            window as unknown as {
              PhotoManager?: {
                saveLocal?: (data: string, prefix?: string, meta?: object) => Promise<string>;
              };
            }
          ).PhotoManager;
          const out: string[] = [];
          for (const file of files) {
            const dataUrl = await _fileToDataUrl(file);
            if (!dataUrl.startsWith('data:')) continue;
            if (pm?.saveLocal) {
              const id = await pm.saveLocal(dataUrl, 'cacc', {
                entityType: 'construction_acceptance_checklist'
              });
              if (id) out.push(id);
            } else {
              out.push(dataUrl);
            }
          }
          cleanup();
          resolve(out);
        } catch (_) {
          cleanup();
          resolve([]);
        }
      })();
    });
    input.addEventListener('cancel', () => {
      cleanup();
      resolve([]);
    });
    input.click();
  });
}

function _tmplOptions(selected?: string | null): string {
  let html = '<option value="">-- Выберите вид работ --</option>';
  const st = _sysTemplates();
  Object.keys(st)
    .sort()
    .forEach((k) => {
      const v = `sys_${k}`;
      html += `<option value="${_escape(v)}" ${selected === v ? 'selected' : ''}>[СИС] ${_escape(st[k].title || k)}</option>`;
    });
  const ut = _userTemplates();
  Object.keys(ut)
    .sort()
    .forEach((k) => {
      const v = `user_${k}`;
      html += `<option value="${_escape(v)}" ${selected === v ? 'selected' : ''}>[МОЙ] ${_escape(ut[k].title || k)}</option>`;
    });
  return html;
}

function _workTitle(key: string): string {
  if (!key) return '';
  if (key.startsWith('sys_')) {
    const k = key.slice(4);
    return _sysTemplates()[k]?.title || k;
  }
  if (key.startsWith('user_')) {
    const k = key.slice(5);
    return _userTemplates()[k]?.title || k;
  }
  return key;
}

function _resolveContractorId(displayName: string): string | null {
  const contractorsSvc = window.RBI?.services?.contractors as
    | { resolveIdFromNormalized?: (o: Record<string, string>) => string | null | undefined }
    | undefined;
  if (contractorsSvc && typeof contractorsSvc.resolveIdFromNormalized === 'function') {
    return (
      contractorsSvc.resolveIdFromNormalized({
        display_name: displayName,
        contractor_name: displayName
      }) || null
    );
  }
  return null;
}

function _floorLabel(locationId: string): string {
  const loc = window.RBI?.services?.locations as
    | { getPath?: (id: string) => LocNode[]; getNode?: (id: string) => LocNode | null }
    | undefined;
  if (loc?.getPath) {
    return loc
      .getPath(locationId)
      .map((n) => n.displayName)
      .join(' / ');
  }
  return loc?.getNode?.(locationId)?.displayName || locationId;
}

function _locationNodeType(locationId: string): string {
  const loc = window.RBI?.services?.locations as
    | { getNode?: (id: string) => LocNode | null }
    | undefined;
  return String(loc?.getNode?.(locationId)?.nodeType || '');
}

function _listDefectsForLocation(locationId: string) {
  const dSvc = _defects();
  if (!dSvc) return [];
  if (typeof dSvc.listForLocation === 'function') return dSvc.listForLocation(locationId) || [];
  if (typeof dSvc.list === 'function') return dSvc.list({ locationId }) || [];
  return [];
}

function _today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function _acc(): AccSvc | null {
  return (window.RBI?.services?.constructionAcceptance as AccSvc) || null;
}

function _defects(): DefSvc | null {
  return (window.RBI?.services?.constructionDefects as DefSvc) || null;
}

function _zoneCenter(zone: AcceptanceZoneV2 | null | undefined): { x: number; y: number } {
  if (!zone) return { x: 50, y: 50 };
  return {
    x: Number(zone.x) + Number(zone.w) / 2,
    y: Number(zone.y) + Number(zone.h) / 2
  };
}

export function openCreateAcceptanceForm(
  ctx: { locationId: string; zone: AcceptanceZoneV2; mode?: 'floor' | 'apartment' },
  onSave: (input: AcceptanceFormCreateInput) => void | Promise<void>,
  onCancel?: () => void
): void {
  const { role } = _roleInfo();
  if (role === 'guest') {
    window.showToast?.('⚠️ Гости не могут предъявлять работы');
    onCancel?.();
    return;
  }

  const isApartment =
    ctx.mode === 'apartment' || _locationNodeType(ctx.locationId) === 'apartment';
  const path = _floorLabel(ctx.locationId);
  const zoneBadge = isApartment
    ? `<span class="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-[8px] font-black border border-violet-200">Квартира</span>`
    : `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[8px] font-black border border-blue-200">✅ Зона выделена</span>`;
  const roomVolHtml = isApartment
    ? `<div>
         <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объем</label>
         <input type="text" id="c2-acc-vol" class="input-base text-[12px] w-full" placeholder="Напр: 45 м2">
       </div>`
    : `<div class="grid grid-cols-2 gap-2">
         <div>
           <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Оси / Захватка</label>
           <input type="text" id="c2-acc-room" class="input-base text-[12px] w-full" placeholder="Напр: Оси А-Б" value="${_escape(ctx.zone.room || '')}">
         </div>
         <div>
           <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объем</label>
           <input type="text" id="c2-acc-vol" class="input-base text-[12px] w-full" placeholder="Напр: 45 м2">
         </div>
       </div>`;

  const html = `
    <div id="c2-acc-request-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div class="bg-[var(--card-bg)] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--card-border)]" data-c2-acc-panel>
        <div class="p-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center">
          <h3 class="font-black text-[13px] uppercase text-white">${isApartment ? '📝 Приёмка квартиры (v2)' : '📝 Заявка на приемку (v2)'}</h3>
          <button type="button" data-c2-acc-close class="text-indigo-200 hover:text-white font-black text-lg leading-none">✕</button>
        </div>
        <div class="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div class="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="text-[10px] font-black text-indigo-500 uppercase mb-1 flex justify-between">
              <span>Локация</span>
              ${zoneBadge}
            </div>
            <div class="text-[12px] font-bold text-slate-700 dark:text-slate-200">${_escape(path)}</div>
          </div>
          <div>
            <label class="text-[10px] font-black text-indigo-500 uppercase mb-1 block">Вид работ *</label>
            <select id="c2-acc-work" class="input-base text-[12px] font-bold mb-2 border-indigo-300 w-full">
              ${_tmplOptions()}
            </select>
            ${roomVolHtml}
          </div>
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label class="text-[10px] font-black text-indigo-500 uppercase mb-2 block">Когда готовы сдать?</label>
            <div class="grid grid-cols-2 gap-2">
              <input type="date" id="c2-acc-date" class="input-base text-[12px] font-bold w-full" value="${_today()}">
              <select id="c2-acc-time" class="input-base text-[12px] font-bold w-full">
                <option value="09:00">09:00 - 10:00</option>
                <option value="10:00">10:00 - 11:00</option>
                <option value="11:00">11:00 - 12:00</option>
                <option value="13:00">13:00 - 14:00</option>
                <option value="14:00" selected>14:00 - 15:00</option>
                <option value="15:00">15:00 - 16:00</option>
                <option value="16:00">16:00 - 17:00</option>
              </select>
            </div>
          </div>
        </div>
        <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 flex gap-2">
          <button type="button" data-c2-acc-close class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-[11px] font-bold uppercase border border-slate-200">Отмена</button>
          <button type="button" data-c2-acc-save class="flex-[1.5] bg-indigo-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md">Отправить</button>
        </div>
      </div>
    </div>`;

  document.getElementById('c2-acc-request-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('c2-acc-request-modal');
  if (!modal) return;

  const close = () => {
    modal.remove();
    onCancel?.();
  };

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) close();
  });
  modal.querySelectorAll('[data-c2-acc-close]').forEach((btn) => btn.addEventListener('click', close));
  modal.querySelector('[data-c2-acc-save]')?.addEventListener('click', () => {
    const workKey = (document.getElementById('c2-acc-work') as HTMLSelectElement | null)?.value || '';
    const room = isApartment
      ? ''
      : (document.getElementById('c2-acc-room') as HTMLInputElement | null)?.value?.trim() || '';
    const vol = (document.getElementById('c2-acc-vol') as HTMLInputElement | null)?.value?.trim() || '';
    const dateStr = (document.getElementById('c2-acc-date') as HTMLInputElement | null)?.value || '';
    const timeStr = (document.getElementById('c2-acc-time') as HTMLSelectElement | null)?.value || '';
    if (!workKey || !dateStr) {
      window.showToast?.('⚠️ Заполните вид работ и дату');
      return;
    }
    const engineerName =
      (window as unknown as { syncConfig?: { engineerName?: string } }).syncConfig?.engineerName || '';
    const baseZone = isApartment ? { ...APARTMENT_FULL_ZONE } : { ...ctx.zone };
    const zone: AcceptanceZoneV2 = { ...baseZone, room: room || null };
    void Promise.resolve(
      onSave({
        locationId: ctx.locationId,
        zone,
        template_key: workKey,
        work_type: _workTitle(workKey),
        volume: vol || null,
        requested_date: dateStr,
        requested_time: timeStr || null,
        contractorId: _resolveContractorId(engineerName)
      })
    ).then(() => modal.remove());
  });
}

export function openAcceptanceDetails(
  item: ConstructionAcceptanceV2,
  handlers: {
    onFocusPlan?: (id: string) => void;
    onChangeStatus?: (id: string, status: AcceptanceStatusV2) => void | Promise<void>;
    onSoftDelete?: (id: string) => void | Promise<void>;
    onChecklistChanged?: (id: string) => void | Promise<void>;
  }
): void {
  const { isEngineer, role } = _roleInfo();
  const path = _floorLabel(item.locationId);
  const status = String(item.status || 'pending');
  const editable = isEngineer && status === 'pending';
  const defectsForLoc = _listDefectsForLocation(item.locationId);
  const batchCandidates = listFailBatchCandidates(item, defectsForLoc);
  let actions = '';

  if (status === 'pending') {
    if (isEngineer) {
      actions = `
        <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-[var(--card-border)]">
          <button type="button" data-c2-acc-focus class="w-full bg-slate-100 text-slate-700 border border-slate-300 py-3 rounded-xl font-black text-[11px] uppercase">🗺️ Показать на плане</button>
          <div class="flex gap-2">
            <button type="button" data-c2-acc-status="accepted" class="flex-1 bg-green-50 text-green-600 border border-green-200 py-3 rounded-xl font-bold text-[10px] uppercase">✅ Принять</button>
            <button type="button" data-c2-acc-status="rejected" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold text-[10px] uppercase">❌ Отклонить</button>
          </div>
        </div>`;
    } else if (role !== 'guest') {
      actions = `
        <div class="mt-4 pt-4 border-t border-[var(--card-border)] text-center">
          <div class="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-3">⏳ Инженер проверяет заявку...</div>
          <button type="button" data-c2-acc-revoke class="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-[10px] uppercase border border-red-200">Отозвать заявку</button>
        </div>`;
    }
  } else if (isEngineer) {
    actions = `
      <div class="mt-4 pt-4 border-t border-[var(--card-border)]">
        <button type="button" data-c2-acc-focus class="w-full bg-slate-100 text-slate-700 border border-slate-300 py-3 rounded-xl font-black text-[11px] uppercase mb-2">🗺️ Показать на плане</button>
        <button type="button" data-c2-acc-status="pending" class="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-[10px] uppercase border border-slate-200">Вернуть в pending</button>
      </div>`;
  } else {
    actions = `
      <div class="mt-4 pt-4 border-t border-[var(--card-border)]">
        <button type="button" data-c2-acc-focus class="w-full bg-slate-100 text-slate-700 border border-slate-300 py-3 rounded-xl font-black text-[11px] uppercase">🗺️ Показать на плане</button>
      </div>`;
  }

  const html = `
    <div id="c2-acc-details-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div class="bg-[var(--card-bg)] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-[var(--card-border)]" data-c2-acc-panel>
        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
          <h3 class="font-black text-[13px] uppercase">Заявка · ${_escape(status)}</h3>
          <button type="button" data-c2-acc-dclose class="text-slate-400 font-black text-lg">✕</button>
        </div>
        <div class="p-4 text-[12px] space-y-2 max-h-[75vh] overflow-y-auto">
          <div><span class="text-[10px] font-black uppercase text-slate-400">Локация</span><div class="font-bold">${_escape(path)}</div></div>
          <div><span class="text-[10px] font-black uppercase text-slate-400">Вид работ</span><div class="font-bold">${_escape(item.work_type || '—')}</div></div>
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-[10px] font-black uppercase text-slate-400">Объем</span><div class="font-bold">${_escape(item.volume || '—')}</div></div>
            <div><span class="text-[10px] font-black uppercase text-slate-400">Оси</span><div class="font-bold">${_escape(item.zone?.room || '—')}</div></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-[10px] font-black uppercase text-slate-400">Дата</span><div class="font-bold">${_escape(item.requested_date || '—')}</div></div>
            <div><span class="text-[10px] font-black uppercase text-slate-400">Время</span><div class="font-bold">${_escape(item.requested_time || '—')}</div></div>
          </div>
          ${renderChecklistSectionHtml(item, { editable, batchFailCount: batchCandidates.length })}
          ${actions}
        </div>
      </div>
    </div>`;

  document.getElementById('c2-acc-details-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('c2-acc-details-modal');
  if (!modal) return;

  let current = item;

  const close = () => modal.remove();

  const openDefectFromChecklist = (meta: {
    id: string;
    name: string;
    group?: string;
    norm?: string;
    weight?: number | null;
  }) => {
    const dSvc = _defects();
    if (!dSvc) {
      window.showToast?.('service.constructionDefects не загружен');
      return;
    }
    const center = _zoneCenter(current.zone);
    openCreateDefectForm(
      { locationId: current.locationId, x: center.x, y: center.y },
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
        window.showToast?.('Замечание создано');
        refreshChecklistUi(_acc()?.get(current.id) || current);
      },
      undefined,
      {
        template_key: current.template_key || null,
        item_id: meta.id || null,
        item_name: meta.name || null,
        norm_text: meta.norm || null,
        description: meta.name || null
      }
    );
  };

  const createBatchFailDefects = async () => {
    const dSvc = _defects();
    if (!dSvc) {
      window.showToast?.('service.constructionDefects не загружен');
      return;
    }
    const latest = _acc()?.get(current.id) || current;
    const candidates = listFailBatchCandidates(latest, _listDefectsForLocation(latest.locationId));
    if (!candidates.length) {
      window.showToast?.('Нет FAIL без активного замечания');
      refreshChecklistUi(latest);
      return;
    }
    if (!window.confirm(`Создать ${candidates.length} замечани(й) по FAIL без формы?`)) return;
    const center = _zoneCenter(latest.zone);
    let created = 0;
    for (const c of candidates) {
      try {
        await dSvc.create({
          locationId: latest.locationId,
          x: center.x,
          y: center.y,
          description: c.name || c.id,
          category: c.category,
          contractorId: latest.contractorId || null,
          deadline: null,
          template_key: latest.template_key || null,
          item_id: c.id,
          item_name: c.name || null,
          norm_text: c.norm || null,
          photos: [],
          status: 'issued'
        });
        created += 1;
      } catch (e) {
        console.warn('[acceptance-form] batch fail create', e);
      }
    }
    window.showToast?.(created ? `Создано замечаний: ${created}` : 'Не удалось создать замечания');
    refreshChecklistUi(_acc()?.get(current.id) || latest);
    await handlers.onChecklistChanged?.(current.id);
  };

  const refreshChecklistUi = (next: ConstructionAcceptanceV2) => {
    current = next;
    const section = modal.querySelector('[data-c2-cl-section]');
    if (!section) return;
    const batchN = listFailBatchCandidates(next, _listDefectsForLocation(next.locationId)).length;
    const tmp = document.createElement('div');
    tmp.innerHTML = renderChecklistSectionHtml(next, { editable, batchFailCount: batchN });
    const fresh = tmp.firstElementChild;
    if (fresh) section.replaceWith(fresh);
    bindChecklistActions(modal);
  };

  const openChecklistRunner = () => {
    const runner = _checklistRunner();
    if (!runner) {
      window.showToast?.('ChecklistRunner не загружен');
      return;
    }
    const tmplKey = String(current.template_key || current.checklist_results?.template_key || '');
    if (!tmplKey) {
      window.showToast?.('Вид работ не выбран');
      return;
    }
    const groups = resolveTemplateGroups(tmplKey);
    if (!groups.length) {
      window.showToast?.('Чек-лист шаблона пуст или не найден');
      return;
    }
    const title = _workTitle(tmplKey) || current.work_type || 'Чек-лист';

    const rowOf = (id: string) => {
      const latest = _acc()?.get(current.id) || current;
      return (latest.checklist_results?.items || []).find((it) => String(it.id) === String(id));
    };

    const persistItem = async (
      id: string,
      itemMeta: ChecklistItemMeta,
      patch: {
        status: ChecklistItemStatusV2 | string;
        comment?: string | null;
        photos?: string[] | null;
        clearExtras?: boolean;
      }
    ) => {
      const acc = _acc();
      if (!acc) throw new Error('service.constructionAcceptance не загружен');
      const updated = await acc.setChecklistItem(current.id, {
        id,
        name: itemMeta.name || id,
        group: itemMeta.group || null,
        status: patch.status,
        comment: patch.comment,
        photos: patch.photos,
        clearExtras: patch.clearExtras
      });
      current = updated;
      await handlers.onChecklistChanged?.(current.id);
      return updated;
    };

    const clearItem = async (id: string) => {
      const acc = _acc();
      if (!acc) throw new Error('service.constructionAcceptance не загружен');
      const latest = acc.get(current.id) || current;
      const prev = latest.checklist_results;
      if (!prev) return;
      const items = (prev.items || []).filter((it) => String(it.id) !== String(id));
      const updated = await acc.setChecklistResults(current.id, {
        template_key: prev.template_key,
        updated_at: new Date().toISOString(),
        items
      });
      current = updated;
      await handlers.onChecklistChanged?.(current.id);
    };

    runner.open({
      title,
      templateKey: tmplKey,
      groups,
      features: {
        na: true,
        failAction: true,
        batchFail: editable,
        norms: true,
        weightTag: true,
        photos: true,
        comments: true,
        help: true,
        escalate: true,
        swipe: true,
        collapse: true
      },
      getStatus: (id) => {
        const st = rowOf(id)?.status;
        if (st === 'ok' || st === 'fail' || st === 'na' || st === 'fail_escalated') return st;
        return null;
      },
      getItemDetails: (id) => {
        const row = rowOf(id);
        return {
          comment: row?.comment || '',
          photos: Array.isArray(row?.photos) ? row!.photos!.slice() : []
        };
      },
      setStatus: async (id, status, itemMeta) => {
        if (status == null || status === '') {
          await clearItem(id);
          return;
        }
        const st = status as ChecklistItemStatusV2;
        if (st !== 'ok' && st !== 'fail' && st !== 'na' && st !== 'fail_escalated') {
          throw new Error('Некорректный статус пункта');
        }
        const clearExtras = st === 'ok' || st === 'na';
        await persistItem(id, itemMeta, {
          status: st,
          clearExtras: clearExtras || undefined,
          // при переходе на fail сохраняем extras; при ok/na — clear
          photos: clearExtras ? null : undefined,
          comment: clearExtras ? null : undefined
        });
      },
      setItemComment: async (id, comment, itemMeta) => {
        const row = rowOf(id);
        const st = row?.status;
        if (st !== 'fail' && st !== 'fail_escalated') {
          throw new Error('Комментарий только для FAIL');
        }
        await persistItem(id, itemMeta, {
          status: st,
          comment: comment || null
        });
      },
      addItemPhoto: async (id, itemMeta) => {
        const row = rowOf(id);
        const st = row?.status;
        if (st !== 'ok' && st !== 'fail' && st !== 'fail_escalated') {
          throw new Error('Сначала отметьте пункт OK или FAIL');
        }
        const added = await _pickAndSaveChecklistPhotos();
        if (!added.length) return;
        const photos = (Array.isArray(row?.photos) ? row!.photos!.slice() : []).concat(added);
        await persistItem(id, itemMeta, { status: st, photos });
      },
      removeItemPhoto: async (id, index, itemMeta) => {
        const row = rowOf(id);
        const st = row?.status;
        if (!st) throw new Error('Пункт без статуса');
        const photos = Array.isArray(row?.photos) ? row!.photos!.slice() : [];
        if (index < 0 || index >= photos.length) return;
        photos.splice(index, 1);
        await persistItem(id, itemMeta, {
          status: st,
          photos: photos.length ? photos : null
        });
      },
      onHelp: (id, event, itemMeta) => {
        const openMenu = (
          window as unknown as {
            openItemHelpMenu?: (
              itemId: string | number,
              ev?: Event,
              ctx?: { templateKey?: string; checklist?: unknown }
            ) => void;
          }
        ).openItemHelpMenu;
        if (typeof openMenu === 'function') {
          openMenu(id, event, { templateKey: tmplKey, checklist: groups });
          return;
        }
        const svc = window.RBI?.services?.knowledge as
          | { openItemHelp?: (itemId: string | number, ev?: Event) => void }
          | undefined;
        if (svc?.openItemHelp) {
          svc.openItemHelp(id, event);
          return;
        }
        window.showToast?.('База знаний недоступна');
        void itemMeta;
      },
      onEscalate: async (id, itemMeta) => {
        const row = rowOf(id);
        const st = row?.status;
        if (st === 'fail_escalated') {
          await persistItem(id, itemMeta, { status: 'fail' });
        } else if (st === 'fail') {
          await persistItem(id, itemMeta, { status: 'fail_escalated' });
        }
      },
      onFailAction: (meta) => {
        openDefectFromChecklist(meta);
      },
      onBatchFailAction: async () => {
        await createBatchFailDefects();
      },
      onClose: () => {
        const latest = _acc()?.get(current.id) || current;
        refreshChecklistUi(latest);
      }
    });
  };

  const bindChecklistActions = (root: HTMLElement) => {
    root.querySelectorAll('[data-c2-cl-open]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openChecklistRunner();
      });
    });
    root.querySelectorAll('[data-c2-cl-batch-fail]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        void createBatchFailDefects();
      });
    });
  };

  bindChecklistActions(modal);

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) close();
  });
  modal.querySelector('[data-c2-acc-dclose]')?.addEventListener('click', close);
  modal.querySelector('[data-c2-acc-focus]')?.addEventListener('click', () => {
    close();
    handlers.onFocusPlan?.(item.id);
  });
  modal.querySelectorAll('[data-c2-acc-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = (btn as HTMLElement).getAttribute('data-c2-acc-status') as AcceptanceStatusV2;
      const latest = _acc()?.get(current.id) || current;
      if (st === 'accepted') {
        const warn = acceptGateWarning(latest);
        if (warn && !window.confirm(warn)) return;
      }
      void Promise.resolve(handlers.onChangeStatus?.(item.id, st)).then(() => close());
    });
  });
  modal.querySelector('[data-c2-acc-revoke]')?.addEventListener('click', () => {
    void Promise.resolve(handlers.onSoftDelete?.(item.id)).then(() => close());
  });
}
