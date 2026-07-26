/**
 * Модалка create/details заявки на приёмку construction-v2 (без ConstAcceptance / startInspection).
 */

import type {
  AcceptanceStatusV2,
  AcceptanceZoneV2,
  ConstructionAcceptanceV2
} from '../../services/construction-acceptance/types';

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

function _today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function openCreateAcceptanceForm(
  ctx: { locationId: string; zone: AcceptanceZoneV2 },
  onSave: (input: AcceptanceFormCreateInput) => void | Promise<void>,
  onCancel?: () => void
): void {
  const { role } = _roleInfo();
  if (role === 'guest') {
    window.showToast?.('⚠️ Гости не могут предъявлять работы');
    onCancel?.();
    return;
  }

  const path = _floorLabel(ctx.locationId);
  const html = `
    <div id="c2-acc-request-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div class="bg-[var(--card-bg)] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--card-border)]" data-c2-acc-panel>
        <div class="p-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center">
          <h3 class="font-black text-[13px] uppercase text-white">📝 Заявка на приемку (v2)</h3>
          <button type="button" data-c2-acc-close class="text-indigo-200 hover:text-white font-black text-lg leading-none">✕</button>
        </div>
        <div class="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div class="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="text-[10px] font-black text-indigo-500 uppercase mb-1 flex justify-between">
              <span>Локация</span>
              <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[8px] font-black border border-blue-200">✅ Зона выделена</span>
            </div>
            <div class="text-[12px] font-bold text-slate-700 dark:text-slate-200">${_escape(path)}</div>
          </div>
          <div>
            <label class="text-[10px] font-black text-indigo-500 uppercase mb-1 block">Вид работ *</label>
            <select id="c2-acc-work" class="input-base text-[12px] font-bold mb-2 border-indigo-300 w-full">
              ${_tmplOptions()}
            </select>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Оси / Захватка</label>
                <input type="text" id="c2-acc-room" class="input-base text-[12px] w-full" placeholder="Напр: Оси А-Б" value="${_escape(ctx.zone.room || '')}">
              </div>
              <div>
                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объем</label>
                <input type="text" id="c2-acc-vol" class="input-base text-[12px] w-full" placeholder="Напр: 45 м2">
              </div>
            </div>
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
    const room = (document.getElementById('c2-acc-room') as HTMLInputElement | null)?.value?.trim() || '';
    const vol = (document.getElementById('c2-acc-vol') as HTMLInputElement | null)?.value?.trim() || '';
    const dateStr = (document.getElementById('c2-acc-date') as HTMLInputElement | null)?.value || '';
    const timeStr = (document.getElementById('c2-acc-time') as HTMLSelectElement | null)?.value || '';
    if (!workKey || !dateStr) {
      window.showToast?.('⚠️ Заполните вид работ и дату');
      return;
    }
    const engineerName =
      (window as unknown as { syncConfig?: { engineerName?: string } }).syncConfig?.engineerName || '';
    const zone: AcceptanceZoneV2 = { ...ctx.zone, room: room || null };
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
  }
): void {
  const { isEngineer, role } = _roleInfo();
  const path = _floorLabel(item.locationId);
  const status = String(item.status || 'pending');
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
        <div class="p-4 text-[12px] space-y-2">
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
          ${actions}
        </div>
      </div>
    </div>`;

  document.getElementById('c2-acc-details-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('c2-acc-details-modal');
  if (!modal) return;

  const close = () => modal.remove();
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
      void Promise.resolve(handlers.onChangeStatus?.(item.id, st)).then(() => close());
    });
  });
  modal.querySelector('[data-c2-acc-revoke]')?.addEventListener('click', () => {
    void Promise.resolve(handlers.onSoftDelete?.(item.id)).then(() => close());
  });
}
