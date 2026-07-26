/**
 * Лёгкий PDF-просмотрщик этажа для construction-v2 (pdfjsLib + overlay маркеров/зон).
 * Не использует UniversalPdfViewer / pdf-viewer.js.
 */

import type { AcceptanceZoneV2, ConstructionAcceptanceV2 } from '../../services/construction-acceptance/types';
import type { ConstructionDefectV2 } from '../../services/construction-defects/types';

export type PlanViewerHandlers = {
  onPlanClick?: (xPercent: number, yPercent: number) => void;
  onMarkerClick?: (defectId: string) => void;
  /** Завершение zone-mode: 2 клика → прямоугольник %. */
  onZoneDrawn?: (zone: AcceptanceZoneV2) => void;
  onZoneClick?: (acceptanceId: string) => void;
};

type PdfjsLib = {
  getDocument: (src: { data: ArrayBuffer } | string) => { promise: Promise<PdfDoc> };
  GlobalWorkerOptions?: { workerSrc: string };
};

type PdfDoc = {
  getPage: (n: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>;
  };
};

function _pdfjs(): PdfjsLib | null {
  return (window as unknown as { pdfjsLib?: PdfjsLib }).pdfjsLib || null;
}

/** Цвета как в legacy ConstDefectForm: B1 blue / B2 orange / B3 red / closed green. */
function _pinBg(category: string, status: string): string {
  const st = String(status || '').toLowerCase();
  if (st === 'closed' || st === 'fixed') return 'bg-green-500';
  const c = String(category || '').toLowerCase();
  if (c === 'critical' || c === 'b3') return 'bg-red-600';
  if (c === 'major' || c === 'b2') return 'bg-orange-500';
  // minor / B1 / default
  return 'bg-blue-500';
}

function _zoneColors(status: string): { box: string; label: string } {
  const st = String(status || '').toLowerCase();
  if (st === 'rejected') return { box: 'bg-red-500/20 border-red-500', label: 'bg-red-600' };
  if (st === 'accepted') return { box: 'bg-green-500/20 border-green-500', label: 'bg-green-600' };
  return { box: 'bg-blue-500/20 border-blue-500', label: 'bg-blue-600' };
}

function _escapeAttr(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export class PlanViewer {
  private host: HTMLElement;
  private handlers: PlanViewerHandlers;
  private wrap: HTMLElement | null = null;
  private stage: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private pins: HTMLElement | null = null;
  private zonesEl: HTMLElement | null = null;
  private addMode = false;
  private zoneMode = false;
  private zoneClick1: { x: number; y: number } | null = null;
  private focusZoneId: string | null = null;
  private destroyed = false;
  private pdfUrl = '';

  constructor(host: HTMLElement, handlers: PlanViewerHandlers = {}) {
    this.host = host;
    this.handlers = handlers;
  }

  setAddMode(on: boolean) {
    this.addMode = !!on;
    if (on) this.setZoneMode(false);
    this._syncCursor();
  }

  isAddMode(): boolean {
    return this.addMode;
  }

  setZoneMode(on: boolean) {
    this.zoneMode = !!on;
    if (on) {
      this.addMode = false;
      this.zoneClick1 = null;
      this.clearTempZone();
    } else {
      this.zoneClick1 = null;
      this.clearTempZone();
    }
    this._syncCursor();
  }

  isZoneMode(): boolean {
    return this.zoneMode;
  }

  setFocusZone(id: string | null) {
    this.focusZoneId = id;
    const zones = this.zonesEl?.querySelectorAll('[data-c2-zone]');
    zones?.forEach((el) => {
      const hid = el as HTMLElement;
      const match = hid.getAttribute('data-c2-zone') === id;
      hid.classList.toggle('ring-4', match);
      hid.classList.toggle('ring-indigo-400', match);
      hid.style.zIndex = match ? '25' : '10';
    });
  }

  destroy() {
    this.destroyed = true;
    this.host.innerHTML = '';
    this.wrap = null;
    this.stage = null;
    this.canvas = null;
    this.pins = null;
    this.zonesEl = null;
  }

  async load(pdfUrl: string): Promise<void> {
    this.pdfUrl = pdfUrl;
    this.destroyed = false;
    this.host.innerHTML = `
      <div class="absolute inset-0 overflow-auto bg-slate-200 dark:bg-slate-900" data-c2-plan-wrap>
        <div class="relative mx-auto my-2 shadow-lg bg-white" data-c2-plan-stage style="width:fit-content">
          <canvas data-c2-plan-canvas class="block max-w-none"></canvas>
          <div data-c2-plan-zones class="absolute inset-0 pointer-events-none"></div>
          <div data-c2-plan-pins class="absolute inset-0 pointer-events-none"></div>
        </div>
      </div>
      <div data-c2-plan-loader class="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Загрузка плана…
      </div>`;

    this.wrap = this.host.querySelector('[data-c2-plan-wrap]');
    this.stage = this.host.querySelector('[data-c2-plan-stage]');
    this.canvas = this.host.querySelector('[data-c2-plan-canvas]');
    this.pins = this.host.querySelector('[data-c2-plan-pins]');
    this.zonesEl = this.host.querySelector('[data-c2-plan-zones]');
    const loader = this.host.querySelector('[data-c2-plan-loader]') as HTMLElement | null;

    if (!this.canvas || !this.stage || !this.wrap) throw new Error('plan-viewer DOM broken');

    this.wrap.addEventListener('click', (ev) => this._onClick(ev));

    const pdfjs = _pdfjs();
    if (!pdfjs?.getDocument) throw new Error('pdfjsLib недоступен');

    let buf: ArrayBuffer | null = null;
    if (window.PhotoManager?.getAsyncUrl) {
      try {
        const cached = await window.PhotoManager.getAsyncUrl(pdfUrl);
        if (cached && cached.startsWith('blob:')) {
          const res = await fetch(cached);
          buf = await res.arrayBuffer();
        }
      } catch {
        /* fall through */
      }
    }
    if (!buf) {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('Не удалось скачать PDF');
      buf = await res.arrayBuffer();
    }

    if (this.destroyed) return;

    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const hostW = Math.max(this.host.clientWidth || 640, 320);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, Math.max(1.1, (hostW - 24) / base.width));
    const viewport = page.getViewport({ scale });

    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    this.stage.style.width = `${viewport.width}px`;
    this.stage.style.height = `${viewport.height}px`;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d недоступен');
    await page.render({ canvasContext: ctx, viewport }).promise;

    if (loader) loader.remove();
    this._syncCursor();
  }

  setMarkers(defects: ConstructionDefectV2[]) {
    if (!this.pins) return;
    // Как legacy: номер по порядку на этаже (1…N), круг w-6 + белая обводка + hover scale
    const html = defects
      .map((d, i) => {
        const x = Number(d.x);
        const y = Number(d.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
        const bg = _pinBg(String(d.category), String(d.status));
        const title = _escapeAttr(String(d.description || '').slice(0, 80));
        const num = i + 1;
        return `<button type="button" data-c2-pin="${_escapeAttr(d.id)}"
          class="absolute w-6 h-6 ${bg} rounded-full border-2 border-white shadow-md
                 flex items-center justify-center text-white text-[10px] font-black
                 cursor-pointer hover:scale-125 transition-transform z-20
                 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style="left:${x}%;top:${y}%;" title="${title}">${num}</button>`;
      })
      .join('');
    this.pins.innerHTML = html;
  }

  setZones(items: ConstructionAcceptanceV2[]) {
    if (!this.zonesEl) return;
    const html = items
      .map((a) => {
        const z = a.zone;
        if (!z) return '';
        const x = Number(z.x);
        const y = Number(z.y);
        const w = Number(z.w);
        const h = Number(z.h);
        if (![x, y, w, h].every(Number.isFinite)) return '';
        const colors = _zoneColors(String(a.status));
        const title = _escapeAttr(String(a.work_type || 'Приёмка').slice(0, 60));
        const focus = this.focusZoneId === a.id ? 'ring-4 ring-indigo-400' : '';
        const zIndex = this.focusZoneId === a.id ? 25 : 10;
        return `<button type="button" data-c2-zone="${_escapeAttr(a.id)}"
          class="absolute border-2 ${colors.box} ${focus} shadow-inner flex items-center justify-center
                 cursor-pointer hover:bg-black/10 transition-colors pointer-events-auto"
          style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${zIndex}" title="${title}">
          <span class="${colors.label} text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase">зона</span>
        </button>`;
      })
      .join('');
    this.zonesEl.innerHTML = html;
  }

  /** Временный пин «+» в режиме выдачи — как legacy drawTempPin. */
  drawTempPin(xPercent: number, yPercent: number) {
    if (!this.pins) return;
    this.clearTempPin();
    this.pins.insertAdjacentHTML(
      'beforeend',
      `<div id="c2-temp-pin"
        class="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg
               flex items-center justify-center text-white text-[10px] font-black z-30
               transform -translate-x-1/2 -translate-y-1/2 animate-bounce pointer-events-none"
        style="left:${xPercent}%;top:${yPercent}%;">+</div>`
    );
  }

  clearTempPin() {
    this.pins?.querySelector('#c2-temp-pin')?.remove();
  }

  clearTempZone() {
    this.zonesEl?.querySelector('#c2-temp-zone')?.remove();
    this.zonesEl?.querySelector('#c2-temp-zone-dot')?.remove();
  }

  private _drawTempZone(zone: AcceptanceZoneV2) {
    if (!this.zonesEl) return;
    this.clearTempZone();
    this.zonesEl.insertAdjacentHTML(
      'beforeend',
      `<div id="c2-temp-zone"
        class="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/20 z-30 pointer-events-none"
        style="left:${zone.x}%;top:${zone.y}%;width:${zone.w}%;height:${zone.h}%;"></div>`
    );
  }

  private _syncCursor() {
    if (!this.wrap) return;
    const cross = this.addMode || this.zoneMode;
    this.wrap.classList.toggle('cursor-crosshair', cross);
    this.wrap.classList.toggle('cursor-default', !cross);
  }

  private _onClick(ev: MouseEvent) {
    const t = ev.target as HTMLElement | null;
    const zoneBtn = t?.closest?.('[data-c2-zone]') as HTMLElement | null;
    if (zoneBtn && !this.zoneMode && !this.addMode) {
      const id = zoneBtn.getAttribute('data-c2-zone');
      if (id) this.handlers.onZoneClick?.(id);
      return;
    }
    const pin = t?.closest?.('[data-c2-pin]') as HTMLElement | null;
    if (pin && !this.zoneMode) {
      const id = pin.getAttribute('data-c2-pin');
      if (id) this.handlers.onMarkerClick?.(id);
      return;
    }
    if (!this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPercent = ((ev.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((ev.clientY - rect.top) / rect.height) * 100;
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

    if (this.zoneMode) {
      if (!this.zoneClick1) {
        this.zoneClick1 = { x: xPercent, y: yPercent };
        this.clearTempZone();
        this.zonesEl?.insertAdjacentHTML(
          'beforeend',
          `<div id="c2-temp-zone-dot"
            class="absolute w-3 h-3 bg-indigo-600 rounded-full border-2 border-white z-30
                   transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style="left:${xPercent}%;top:${yPercent}%;"></div>`
        );
        return;
      }
      const x1 = this.zoneClick1.x;
      const y1 = this.zoneClick1.y;
      const x = Math.min(x1, xPercent);
      const y = Math.min(y1, yPercent);
      const w = Math.max(0.5, Math.abs(xPercent - x1));
      const h = Math.max(0.5, Math.abs(yPercent - y1));
      const zone: AcceptanceZoneV2 = { x, y, w, h };
      this._drawTempZone(zone);
      this.zoneClick1 = null;
      this.handlers.onZoneDrawn?.(zone);
      return;
    }

    if (!this.addMode) return;
    this.handlers.onPlanClick?.(xPercent, yPercent);
  }

  getPdfUrl(): string {
    return this.pdfUrl;
  }
}
