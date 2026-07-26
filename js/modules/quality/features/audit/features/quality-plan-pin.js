/**
 * Quality plan pin — fullscreen PDF pin + object→building→floor picker.
 * ES-модуль без window.* assignments (публичный API через audit.module.js).
 * Паттерн координат % — как construction-v2 PlanViewer, без cross-import.
 */

let _mounted = false;

function _locations() {
  const rbi = window.RBI;
  return (rbi && rbi.services && rbi.services.locations) || null;
}

function _toast(msg) {
  const fn = window['showToast'];
  if (typeof fn === 'function') fn(msg);
}

function _pdfjs() {
  return window.pdfjsLib || null;
}

function _norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^корпус\s+/i, '')
    .replace(/^этаж\s+/i, '')
    .replace(/^секция\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function _escape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function _getPin() {
  const st = window.AuditState;
  if (st && typeof st.getPlanPin === 'function') return st.getPlanPin();
  return null;
}

function _setPin(pin) {
  const st = window.AuditState;
  if (st && typeof st.setPlanPin === 'function') st.setPlanPin(pin);
}

function _clearPinState() {
  const st = window.AuditState;
  if (st && typeof st.clearPlanPin === 'function') st.clearPlanPin();
}

function _scheduleSave() {
  const actions = window.AuditActions;
  if (actions && typeof actions.scheduleSessionSave === 'function') {
    actions.scheduleSessionSave();
    return;
  }
  const fn = window['scheduleSessionSave'];
  if (typeof fn === 'function') fn();
}

function _updateLocationFromStructured() {
  const fn = window['updateLocationFromStructured'];
  if (typeof fn === 'function') fn();
}

/** Floors under a building (building → sections → floors). */
function _floorsUnderBuilding(loc, buildingId) {
  const sections = loc.getChildren(buildingId) || [];
  const floors = [];
  for (let i = 0; i < sections.length; i++) {
    const kids = loc.getChildren(sections[i].id) || [];
    for (let j = 0; j < kids.length; j++) {
      if (kids[j].nodeType === 'floor') floors.push(kids[j]);
    }
  }
  return floors;
}

function _isDefaultSection(sec) {
  if (!sec) return true;
  const n = _norm(sec.displayName);
  return !n || n === '1' || n === 'секция 1' || n === 'default' || n === 'основная' || n === 'осн';
}

/**
 * Resolve floor node from form fields (project / section=корпус / floor).
 * @returns {{ floor: object, path: object[] } | null}
 */
export function resolveFloorFromForm() {
  const loc = _locations();
  if (!loc || typeof loc.listNodes !== 'function') return null;

  const pin = _getPin();
  if (pin && pin.locationId) {
    const floor = loc.getNode(pin.locationId);
    if (floor && floor.nodeType === 'floor') {
      return { floor: floor, path: loc.getPath(floor.id) || [] };
    }
  }

  const projEl = document.getElementById('inp-project');
  const secEl = document.getElementById('inp-section');
  const floorEl = document.getElementById('inp-floor');
  const projName = _norm(projEl && projEl.value);
  const buildingName = _norm(secEl && secEl.value);
  const floorName = _norm(floorEl && floorEl.value);
  if (!projName || !buildingName || !floorName) return null;

  const objects = loc.listNodes({ nodeType: 'object', parentId: null }) || [];
  let obj = null;

  // Prefer linked locationObjectId from OD↔locations bridge when form has project name
  if (typeof loc.resolveObjectLink === 'function' && projName) {
    const projRaw = (projEl && projEl.value) || '';
    const link = loc.resolveObjectLink({ displayName: projRaw });
    if (link && link.locationObject) {
      obj = link.locationObject;
    }
  }
  if (!obj) {
    obj = objects.find(function (o) {
      return _norm(o.displayName) === projName || _norm(o.canonical_key) === projName;
    }) || null;
  }
  if (!obj) return null;

  const buildings = loc.getChildren(obj.id) || [];
  const building = buildings.find(function (b) {
    if (b.nodeType && b.nodeType !== 'building') return false;
    const bn = _norm(b.displayName);
    return bn === buildingName || buildingName.indexOf(bn) === 0 || bn.indexOf(buildingName) === 0;
  });
  if (!building) return null;

  const floors = _floorsUnderBuilding(loc, building.id);
  const floor = floors.find(function (f) {
    const fn = _norm(f.displayName);
    return fn === floorName || fn === 'этаж ' + floorName || floorName === fn.replace(/^этаж\s+/, '');
  });
  if (!floor) return null;
  return { floor: floor, path: loc.getPath(floor.id) || [] };
}

/** Seed smart-input suggestions from locations (merge, keep ObjectDirectory). */
export function seedLocationSuggestions() {
  const loc = _locations();
  if (!loc || typeof loc.listNodes !== 'function') return;
  try {
    let cache = {};
    try {
      cache = JSON.parse(localStorage.getItem('smart_input_cache') || '{}') || {};
    } catch (_e) {
      cache = {};
    }
    const clean = typeof loc.cleanObjectName === 'function'
      ? function (s) { return loc.cleanObjectName(s); }
      : function (s) {
        return String(s || '').toLowerCase().replace(/['"«»]/g, '').replace(/жк\s+/gi, '').trim();
      };
    const mergeUnique = function (field, names) {
      const prev = Array.isArray(cache[field]) ? cache[field] : [];
      const seen = new Set();
      const out = [];
      prev.concat(names).forEach(function (raw) {
        const v = String(raw || '').trim();
        if (!v) return;
        const k = clean(v);
        if (!k || seen.has(k)) return;
        seen.add(k);
        out.push(v);
      });
      cache[field] = out.slice(0, 60);
    };

    const objects = loc.listNodes({ nodeType: 'object', parentId: null }) || [];
    mergeUnique('projectName', objects.map(function (o) { return o.displayName; }));

    const buildings = loc.listNodes({ nodeType: 'building' }) || [];
    mergeUnique('section', buildings.map(function (b) { return b.displayName; }));

    const floors = loc.listNodes({ nodeType: 'floor' }) || [];
    mergeUnique('floor', floors.map(function (f) { return f.displayName; }));

    localStorage.setItem('smart_input_cache', JSON.stringify(cache));
    // Refresh in-memory smart-input cache object if already created (mutate, no global assign).
    const mem = window['_smartInputMemoryCache'];
    if (mem && typeof mem === 'object') {
      Object.keys(cache).forEach(function (k) {
        mem[k] = cache[k];
      });
    }
  } catch (e) {
    console.warn('[quality-plan-pin] seed suggestions failed', e);
  }
}

export function updatePinIndicator() {
  const el = document.getElementById('quality-plan-pin-indicator');
  const room = document.getElementById('inp-room');
  const pin = _getPin();
  if (el) {
    if (pin && pin.locationId != null && Number.isFinite(Number(pin.x)) && Number.isFinite(Number(pin.y))) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  }
  if (room) {
    if (pin) {
      room.placeholder = 'Оси/Пом. (опц.)';
      room.removeAttribute('required');
    } else {
      room.placeholder = 'Оси/Пом.*';
    }
  }
}

/**
 * Apply path texts to form + set planPin. Does not wipe inp-room.
 */
export function applyPinToForm(pin, floorId) {
  const loc = _locations();
  if (!loc || !pin || !floorId) return false;
  const path = loc.getPath(floorId) || [];
  const obj = path.find(function (n) { return n.nodeType === 'object'; });
  const building = path.find(function (n) { return n.nodeType === 'building'; });
  const section = path.find(function (n) { return n.nodeType === 'section'; });
  const floor = path.find(function (n) { return n.nodeType === 'floor'; }) || loc.getNode(floorId);
  if (!floor) return false;

  const proj = document.getElementById('inp-project');
  const sec = document.getElementById('inp-section');
  const floorEl = document.getElementById('inp-floor');

  if (proj && obj && !proj.readOnly && !proj.disabled) {
    proj.value = obj.displayName || '';
  }
  if (sec && building) {
    let secVal = building.displayName || '';
    if (section && !_isDefaultSection(section)) {
      secVal = secVal + ' / ' + section.displayName;
    }
    sec.value = secVal;
  }
  if (floorEl && floor) {
    floorEl.value = floor.displayName || '';
  }

  _setPin({
    locationId: String(floorId),
    x: Number(pin.x),
    y: Number(pin.y)
  });

  _updateLocationFromStructured();
  updatePinIndicator();
  _scheduleSave();
  return true;
}

export function clearPin() {
  _clearPinState();
  updatePinIndicator();
  _scheduleSave();
  document.dispatchEvent(new CustomEvent('quality:planPin:changed', { detail: { planPin: null } }));
}

function _removeOverlay() {
  const existing = document.getElementById('quality-plan-pin-overlay');
  if (existing) existing.remove();
}

function _showPicker(onPickFloor) {
  const loc = _locations();
  if (!loc) {
    _toast('⚠️ Справочник локаций недоступен');
    return;
  }
  _removeOverlay();

  let step = 'object';
  let objectId = null;
  let buildingId = null;

  // Entry A: if form project is linked → start at building under that object
  const projEl = document.getElementById('inp-project');
  const projRaw = (projEl && projEl.value) || '';
  if (projRaw && typeof loc.resolveObjectLink === 'function') {
    const link = loc.resolveObjectLink({ displayName: projRaw });
    if (link && link.linked && link.locationObject) {
      objectId = link.locationObject.id;
      step = 'building';
    }
  }

  const overlay = document.createElement('div');
  overlay.id = 'quality-plan-pin-overlay';
  overlay.className = 'fixed inset-0 z-[12000] bg-black/50 flex items-end sm:items-center justify-center p-3';
  overlay.innerHTML = `
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div class="text-[11px] font-black uppercase tracking-widest text-slate-500" data-qpin-step-label>Объект</div>
          <div class="text-sm font-bold text-slate-800 dark:text-slate-100">Выбор этажа для плана</div>
        </div>
        <button type="button" data-qpin-cancel class="text-slate-400 hover:text-slate-700 text-xl leading-none px-2">×</button>
      </div>
      <div class="overflow-y-auto p-2 flex-1" data-qpin-list></div>
    </div>`;
  document.body.appendChild(overlay);

  const listEl = overlay.querySelector('[data-qpin-list]');
  const stepLabel = overlay.querySelector('[data-qpin-step-label]');

  const close = function () { _removeOverlay(); };
  overlay.querySelector('[data-qpin-cancel]').addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  const renderList = function (items, emptyMsg) {
    if (!items.length) {
      listEl.innerHTML = `<div class="p-4 text-center text-[11px] text-slate-400 font-bold uppercase">${_escape(emptyMsg)}</div>`;
      return;
    }
    listEl.innerHTML = items.map(function (it) {
      return `<button type="button" data-qpin-id="${_escape(it.id)}"
        class="w-full text-left px-3 py-2.5 rounded-xl mb-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30
               text-[12px] font-bold text-slate-700 dark:text-slate-200 border border-transparent hover:border-indigo-100">
        ${_escape(it.displayName || it.id)}
      </button>`;
    }).join('');
    listEl.querySelectorAll('[data-qpin-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-qpin-id');
        if (step === 'object') {
          objectId = id;
          step = 'building';
          stepLabel.textContent = 'Корпус';
          renderList(
            (loc.getChildren(objectId) || []).filter(function (n) { return !n.nodeType || n.nodeType === 'building'; }),
            'Нет корпусов'
          );
        } else if (step === 'building') {
          buildingId = id;
          step = 'floor';
          stepLabel.textContent = 'Этаж';
          renderList(_floorsUnderBuilding(loc, buildingId), 'Нет этажей');
        } else if (step === 'floor') {
          close();
          onPickFloor(id);
        }
      });
    });
  };

  if (step === 'building' && objectId) {
    stepLabel.textContent = 'Корпус';
    renderList(
      (loc.getChildren(objectId) || []).filter(function (n) { return !n.nodeType || n.nodeType === 'building'; }),
      'Нет корпусов'
    );
  } else {
    renderList(loc.listNodes({ nodeType: 'object', parentId: null }) || [], 'Нет объектов в справочнике');
  }
}

async function _openPlanViewer(floorId) {
  const loc = _locations();
  if (!loc) {
    _toast('⚠️ Справочник локаций недоступен');
    return;
  }
  const plan = loc.getPlanForFloor(floorId);
  if (!plan || !plan.pdf_url) {
    _toast('⚠️ У этажа нет PDF-плана. Загрузите план в Настройках.');
    return;
  }
  const pdfjs = _pdfjs();
  if (!pdfjs || typeof pdfjs.getDocument !== 'function') {
    _toast('⚠️ PDF-библиотека недоступна');
    return;
  }

  _removeOverlay();
  const existingPin = _getPin();
  let tempX = existingPin && String(existingPin.locationId) === String(floorId) ? Number(existingPin.x) : null;
  let tempY = existingPin && String(existingPin.locationId) === String(floorId) ? Number(existingPin.y) : null;

  const overlay = document.createElement('div');
  overlay.id = 'quality-plan-pin-overlay';
  overlay.className = 'fixed inset-0 z-[12000] bg-slate-900 flex flex-col';
  overlay.innerHTML = `
    <div class="flex items-center justify-between px-3 py-2 bg-slate-950/90 text-white shrink-0">
      <div class="text-[11px] font-black uppercase tracking-widest">Точка на плане этажа</div>
      <div class="flex gap-2">
        <button type="button" data-qpin-confirm
          class="px-3 py-1.5 rounded-lg bg-indigo-500 text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
          ${tempX == null ? 'disabled' : ''}>Подтвердить</button>
        <button type="button" data-qpin-cancel
          class="px-3 py-1.5 rounded-lg bg-slate-700 text-[10px] font-black uppercase tracking-wider">Отмена</button>
      </div>
    </div>
    <div class="relative flex-1 min-h-0" data-qpin-host>
      <div class="absolute inset-0 overflow-auto bg-slate-800" data-qpin-wrap>
        <div class="relative mx-auto my-2 shadow-lg bg-white" data-qpin-stage style="width:fit-content">
          <canvas data-qpin-canvas class="block max-w-none"></canvas>
          <div data-qpin-pins class="absolute inset-0 pointer-events-none"></div>
        </div>
      </div>
      <div data-qpin-loader class="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-[11px] font-bold uppercase tracking-widest text-slate-300">
        Загрузка плана…
      </div>
    </div>
    <div class="px-3 py-2 text-[10px] text-slate-300 bg-slate-950/80 shrink-0">Нажмите на план, чтобы поставить точку</div>`;
  document.body.appendChild(overlay);

  const host = overlay.querySelector('[data-qpin-host]');
  const wrap = overlay.querySelector('[data-qpin-wrap]');
  const stage = overlay.querySelector('[data-qpin-stage]');
  const canvas = overlay.querySelector('[data-qpin-canvas]');
  const pins = overlay.querySelector('[data-qpin-pins]');
  const loader = overlay.querySelector('[data-qpin-loader]');
  const confirmBtn = overlay.querySelector('[data-qpin-confirm]');

  const close = function () { _removeOverlay(); };
  overlay.querySelector('[data-qpin-cancel]').addEventListener('click', close);

  const drawTemp = function () {
    if (!pins) return;
    pins.innerHTML = '';
    if (tempX == null || tempY == null) return;
    pins.innerHTML = `<div class="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg
      flex items-center justify-center text-white text-[10px] font-black z-30
      transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style="left:${tempX}%;top:${tempY}%;">+</div>`;
  };

  confirmBtn.addEventListener('click', function () {
    if (tempX == null || tempY == null) return;
    applyPinToForm({ x: tempX, y: tempY }, floorId);
    document.dispatchEvent(new CustomEvent('quality:planPin:changed', {
      detail: { planPin: _getPin() }
    }));
    _toast('✅ Точка на плане сохранена');
    close();
  });

  wrap.classList.add('cursor-crosshair');
  wrap.addEventListener('click', function (ev) {
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPercent = ((ev.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((ev.clientY - rect.top) / rect.height) * 100;
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;
    tempX = Math.round(xPercent * 100) / 100;
    tempY = Math.round(yPercent * 100) / 100;
    confirmBtn.disabled = false;
    drawTemp();
  });

  try {
    let buf = null;
    const pdfUrl = plan.pdf_url;
    if (window.PhotoManager && typeof window.PhotoManager.getAsyncUrl === 'function') {
      try {
        const cached = await window.PhotoManager.getAsyncUrl(pdfUrl);
        if (cached && String(cached).startsWith('blob:')) {
          const res = await fetch(cached);
          buf = await res.arrayBuffer();
        }
      } catch (_e) { /* fall through */ }
    }
    if (!buf) {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('Не удалось скачать PDF');
      buf = await res.arrayBuffer();
    }
    if (!document.getElementById('quality-plan-pin-overlay')) return;

    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const hostW = Math.max((host && host.clientWidth) || 640, 320);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, Math.max(1.1, (hostW - 24) / base.width));
    const viewport = page.getViewport({ scale: scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    stage.style.width = viewport.width + 'px';
    stage.style.height = viewport.height + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d недоступен');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    if (loader) loader.remove();
    drawTemp();
  } catch (e) {
    console.error('[quality-plan-pin] load failed', e);
    _toast('⚠️ Не удалось открыть план этажа');
    close();
  }
}

/** Entry: open plan if floor known + PDF, else path picker. */
export async function openPlanPinFlow(opts) {
  opts = opts || {};
  const forcedFloorId = opts.floorId || null;

  if (forcedFloorId) {
    await _openPlanViewer(forcedFloorId);
    return;
  }

  const resolved = resolveFloorFromForm();
  if (resolved && resolved.floor) {
    const loc = _locations();
    const plan = loc && loc.getPlanForFloor(resolved.floor.id);
    if (plan && plan.pdf_url) {
      await _openPlanViewer(resolved.floor.id);
      return;
    }
    if (resolved.floor) {
      _toast('⚠️ У выбранного этажа нет PDF — выберите другой');
    }
  }

  _showPicker(function (floorId) {
    _openPlanViewer(floorId);
  });
}

export function repositionPlanPin() {
  const pin = _getPin();
  if (pin && pin.locationId) {
    return openPlanPinFlow({ floorId: pin.locationId });
  }
  return openPlanPinFlow();
}

/** Bind buttons in audit header; idempotent. */
export function mountControls() {
  if (_mounted) {
    updatePinIndicator();
    return;
  }
  _mounted = true;

  const btn = document.getElementById('btn-quality-plan-pin');
  if (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openPlanPinFlow();
    });
  }
  const ind = document.getElementById('quality-plan-pin-indicator');
  if (ind) {
    const repo = ind.querySelector('[data-qpin-reposition]');
    const clr = ind.querySelector('[data-qpin-clear]');
    if (repo) {
      repo.addEventListener('click', function (e) {
        e.preventDefault();
        repositionPlanPin();
      });
    }
    if (clr) {
      clr.addEventListener('click', function (e) {
        e.preventDefault();
        clearPin();
        _toast('Точка на плане снята');
      });
    }
  }

  seedLocationSuggestions();
  updatePinIndicator();

  document.addEventListener('locations:changed', function () {
    seedLocationSuggestions();
  });
}
