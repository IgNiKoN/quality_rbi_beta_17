/**
 * audit.desktop.render.js
 * Desktop Осмотр (≥1280):
 *  - шапка как Analytics: slim #app-desk-topbar, мобильный #main-header скрыт
 *  - chrome: селектор / УрК / поля объекта (те же DOM id)
 *  - body: чек-лист фикс. слева | план flex справа
 * Mobile audit.* / карточки пунктов не переписывает.
 */

import {
  repositionPlanPin,
  clearPin,
  updatePinIndicator
} from './features/quality-plan-pin.js';

const DESKTOP_MIN = 1280;
const SHELL_ID = 'audit-desktop-shell';
const CHROME_ID = 'audit-desktop-chrome';
const WORK_ID = 'audit-desktop-work';
const CHECK_ID = 'audit-desktop-check';
const PLAN_ID = 'audit-desktop-plan';
const CSS_HREF = './css/audit.desktop.css';
const WIDE_CLASS = 'rbi-audit-desktop-wide';

let _resizeBound = false;
let _hooksBound = false;
let _shellApplied = false;
let _previewToken = 0;
let _origRenderAudit = null;

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.innerWidth >= DESKTOP_MIN;
}

function isQualityMode() {
  try {
    if (window.AppModeManager && window.AppModeManager.currentMode) {
      return window.AppModeManager.currentMode === 'quality';
    }
  } catch (_) { /* ignore */ }
  return /#\/quality\//i.test(String(location.hash || ''));
}

function isAuditActive() {
  if (!isQualityMode()) return false;
  const hash = String(location.hash || '');
  if (hash && !/#\/quality\/audit/i.test(hash)) return false;
  const tab = document.getElementById('tab-audit');
  return !!(tab && tab.classList.contains('active'));
}

function ensureDesktopCss() {
  if (document.querySelector('link[data-audit-desktop-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  link.setAttribute('data-audit-desktop-css', '1');
  document.head.appendChild(link);
}

function setWideLayout(on) {
  ensureDesktopCss();
  const root = document.getElementById('app-root');
  const body = document.body;
  if (on) {
    if (root) root.classList.add(WIDE_CLASS);
    if (body) body.classList.add(WIDE_CLASS);
  } else {
    if (root) root.classList.remove(WIDE_CLASS);
    if (body) body.classList.remove(WIDE_CLASS);
  }
}

function setMobileAuditHeaderVisible(on) {
  const header = document.getElementById('main-header');
  if (!header) return;
  header.style.display = on ? 'block' : 'none';
  if (typeof window.updateBodyPadding === 'function') {
    try { window.updateBodyPadding(); } catch (_) { /* ignore */ }
  }
}

function getPlanPin() {
  const st = window.AuditState;
  if (st && typeof st.getPlanPin === 'function') return st.getPlanPin();
  return null;
}

function locations() {
  const rbi = window.RBI;
  return (rbi && rbi.services && rbi.services.locations) || null;
}

const DESK_FIELD_LABELS = [
  ['inp-contractor', 'Подрядчик'],
  ['inp-project', 'Объект'],
  ['inp-section', 'Корпус'],
  ['inp-floor', 'Этаж'],
  ['inp-room', 'Оси / помещение']
];

function decorateDeskFields() {
  DESK_FIELD_LABELS.forEach(function (pair) {
    const id = pair[0];
    const text = pair[1];
    const inp = document.getElementById(id);
    if (!inp || !inp.parentElement) return;
    const wrap = inp.parentElement;
    wrap.classList.add('audit-desk-field');
    if (wrap.querySelector(':scope > .audit-desk-field-label')) return;
    const lab = document.createElement('label');
    lab.className = 'audit-desk-field-label';
    lab.htmlFor = id;
    lab.textContent = text;
    wrap.insertBefore(lab, wrap.firstChild);
  });
}

function undecorateDeskFields() {
  document.querySelectorAll('.audit-desk-field-label').forEach(function (el) {
    if (el.closest('.audit-desk-zone-tpl') && !el.closest('.audit-desk-field')) return;
    if (el.closest('#header-checklist-container')) return;
    el.remove();
  });
  document.querySelectorAll('.audit-desk-field').forEach(function (el) {
    el.classList.remove('audit-desk-field');
  });
  const selSpan = document.querySelector('#header-checklist-container > span');
  if (selSpan) {
    selSpan.className = 'text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase flex items-center gap-1.5';
    selSpan.textContent = 'Чек-лист ▾';
  }
  const expanded = document.getElementById('dash-expanded-view');
  if (expanded) expanded.classList.add('hidden');
}

function moveHeaderPiecesIntoChrome(chrome) {
  if (!chrome) return;
  const slotCheck = chrome.querySelector('[data-audit-desk-slot-checklist]');
  const slotDash = document.querySelector('[data-audit-desk-slot-dash]');
  const slotData = chrome.querySelector('[data-audit-desk-slot-data]');
  const slotNav = chrome.querySelector('[data-audit-desk-slot-nav]');

  const checklist = document.getElementById('header-checklist-container');
  const dash = document.getElementById('header-dashboard');
  const data = document.getElementById('header-data-block');
  const nav = document.getElementById('audit-group-nav');

  if (slotCheck && checklist && checklist.parentElement !== slotCheck) {
    slotCheck.appendChild(checklist);
  }
  if (slotDash && dash && dash.parentElement !== slotDash) {
    slotDash.appendChild(dash);
  }
  if (slotData && data) {
    const content = document.getElementById('data-block-content');
    if (content && slotData && content.parentElement !== slotData) {
      slotData.appendChild(content);
    }
  }
  if (slotNav && nav && nav.parentElement !== slotNav) {
    slotNav.appendChild(nav);
  }
  decorateDeskFields();
  // На desk всегда показываем коэффициенты
  const expanded = document.getElementById('dash-expanded-view');
  if (expanded) expanded.classList.remove('hidden');
}

function restoreHeaderPieces() {
  undecorateDeskFields();

  const modeBox = document.getElementById('app-mode-selector-container');
  const right = modeBox && modeBox.parentElement;
  const inner = document.getElementById('header-inner');
  const checklist = document.getElementById('header-checklist-container');
  const dash = document.getElementById('header-dashboard');
  const data = document.getElementById('header-data-block');
  const content = document.getElementById('data-block-content');
  const nav = document.getElementById('audit-group-nav');

  if (right && checklist && checklist.parentElement !== right) {
    right.appendChild(checklist);
  }
  if (inner && dash) {
    const topRow = inner.querySelector('.header-top-row');
    if (topRow && topRow.nextSibling !== dash) {
      if (topRow.nextSibling) inner.insertBefore(dash, topRow.nextSibling);
      else inner.appendChild(dash);
    } else if (!dash.parentElement || dash.parentElement !== inner) {
      inner.appendChild(dash);
    }
  }
  if (inner && data && data.parentElement !== inner) {
    inner.appendChild(data);
  }
  if (data && content && content.parentElement !== data) {
    data.appendChild(content);
  }
  if (data && nav && nav.parentElement !== data) {
    data.appendChild(nav);
  }
}

function ensureShell() {
  const appRoot = document.getElementById('app-root');
  const tab = document.getElementById('tab-audit');
  if (!appRoot || !tab) return null;

  let shell = document.getElementById(SHELL_ID);
  // Старая раскладка без side / без единой headstrip — пересобрать
  if (shell && (!document.getElementById('audit-desktop-side')
      || !shell.querySelector('.audit-desk-topbar-strip'))) {
    restoreHeaderPieces();
    if (tab.parentElement !== appRoot) {
      appRoot.insertBefore(tab, shell);
    }
    shell.remove();
    shell = null;
  }

  if (!shell) {
    shell = document.createElement('div');
    shell.id = SHELL_ID;

    const chrome = document.createElement('section');
    chrome.id = CHROME_ID;
    chrome.className = 'audit-desk-chrome';
    chrome.innerHTML = ''
      + '<div class="audit-desk-topbar-strip" data-audit-desk-topbar-strip>'
      + '  <div class="audit-desk-topbar-strip-inner">'
      + '    <div class="audit-desk-topbar-brand">'
      + '      <span class="audit-desk-topbar-label">Осмотр</span>'
      + '      <span class="audit-desk-topbar-sub" data-audit-desk-chrome-sub>Выберите чек-лист</span>'
      + '    </div>'
      + '    <div class="audit-desk-topbar-tpl" data-audit-desk-slot-checklist></div>'
      + '  </div>'
      + '</div>'
      + '<div class="audit-desk-chrome-body">'
      + '  <div class="audit-desk-zone audit-desk-zone-object">'
      + '    <div class="audit-desk-zone-head">'
      + '      <div class="audit-desk-zone-label">Объект проверки</div>'
      + '      <p class="audit-desk-zone-hint">Подрядчик, место и привязка к плану</p>'
      + '    </div>'
      + '    <div class="audit-desk-chrome-form" data-audit-desk-slot-data></div>'
      + '  </div>'
      + '  <div class="audit-desk-zone audit-desk-zone-groups" data-audit-desk-slot-nav-wrap>'
      + '    <div class="audit-desk-zone-label">Группы пунктов</div>'
      + '    <div data-audit-desk-slot-nav></div>'
      + '  </div>'
      + '</div>';

    const work = document.createElement('div');
    work.id = WORK_ID;
    work.className = 'audit-desk-work';

    const check = document.createElement('div');
    check.id = CHECK_ID;

    const side = document.createElement('div');
    side.id = 'audit-desktop-side';
    side.className = 'audit-desk-side';

    const plan = document.createElement('aside');
    plan.id = PLAN_ID;
    plan.className = 'audit-desk-plan';
    plan.innerHTML = ''
      + '<div class="audit-desk-plan-toolbar">'
      + '  <h3 class="audit-desk-plan-title">План этажа</h3>'
      + '  <span class="audit-desk-plan-meta" data-audit-desk-plan-meta></span>'
      + '  <button type="button" class="audit-desk-btn" data-audit-desk-move-pin hidden>Переставить</button>'
      + '  <button type="button" class="audit-desk-btn" data-audit-desk-clear-pin hidden>Снять</button>'
      + '</div>'
      + '<div class="audit-desk-plan-stage" data-audit-desk-plan-stage>'
      + '  <div class="audit-desk-plan-empty" data-audit-desk-plan-empty data-empty-kind="nopin">'
      + '    <div class="audit-desk-plan-art" aria-hidden="true">'
      + '      <svg viewBox="0 0 240 168" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '        <rect x="12" y="12" width="216" height="144" rx="6" class="audit-desk-plan-art-frame"/>'
      + '        <path d="M12 56h216M12 112h216M80 12v144M160 12v144" class="audit-desk-plan-art-grid"/>'
      + '        <rect x="28" y="28" width="40" height="20" rx="2" class="audit-desk-plan-art-room"/>'
      + '        <rect x="92" y="28" width="56" height="20" rx="2" class="audit-desk-plan-art-room"/>'
      + '        <rect x="172" y="28" width="40" height="20" rx="2" class="audit-desk-plan-art-room"/>'
      + '        <rect x="28" y="72" width="56" height="28" rx="2" class="audit-desk-plan-art-room"/>'
      + '        <rect x="108" y="72" width="48" height="28" rx="2" class="audit-desk-plan-art-room"/>'
      + '        <rect x="172" y="72" width="40" height="28" rx="2" class="audit-desk-plan-art-room"/>'
      + '        <rect x="28" y="120" width="184" height="20" rx="2" class="audit-desk-plan-art-room"/>'
      + '        <circle cx="132" cy="86" r="7" class="audit-desk-plan-art-pin"/>'
      + '        <circle cx="132" cy="86" r="3" class="audit-desk-plan-art-pin-core"/>'
      + '      </svg>'
      + '    </div>'
      + '    <div class="audit-desk-plan-empty-copy">'
      + '      <div class="audit-desk-plan-empty-title">План не выбран</div>'
      + '      <p>Нажмите «на плане» рядом с полем осей — откроется выбор этажа и точка на чертеже.</p>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    const metrics = document.createElement('section');
    metrics.id = 'audit-desktop-metrics';
    metrics.className = 'audit-desk-metrics';
    metrics.innerHTML = ''
      + '<div class="audit-desk-metrics-head">'
      + '  <h3 class="audit-desk-metrics-title">УрК и коэффициенты</h3>'
      + '  <p class="audit-desk-metrics-hint">Подрядчик · изделие · формулы расчёта</p>'
      + '</div>'
      + '<div data-audit-desk-slot-dash></div>';

    side.appendChild(plan);
    side.appendChild(metrics);
    work.appendChild(check);
    work.appendChild(side);
    shell.appendChild(chrome);
    shell.appendChild(work);
  }

  if (shell.parentElement !== appRoot) {
    if (tab.parentElement === appRoot) {
      appRoot.insertBefore(shell, tab);
    } else {
      appRoot.insertBefore(shell, appRoot.firstChild);
    }
  }

  const chrome = document.getElementById(CHROME_ID);
  moveHeaderPiecesIntoChrome(chrome);

  // Убрать дубли «Выбрать план» из старой разметки просмотрщика
  document.querySelectorAll('[data-audit-desk-pick-plan]').forEach(function (el) {
    el.remove();
  });

  const checkHost = document.getElementById(CHECK_ID);
  if (checkHost && tab.parentElement !== checkHost) {
    checkHost.appendChild(tab);
  }

  if (!shell._auditDeskBound) {
    shell._auditDeskBound = true;
    shell.addEventListener('click', onPlanToolbarClick);
  }

  syncChromeSubtitle();
  return shell;
}

function syncChromeSubtitle() {
  const label = document.getElementById('current-checklist-label');
  const raw = (label && label.textContent || '').trim();
  const name = raw && !/не выбран/i.test(raw) ? raw : 'Не выбран';

  const sub = document.querySelector('[data-audit-desk-chrome-sub]');
  if (sub) {
    sub.textContent = name === 'Не выбран'
      ? 'Выберите чек-лист'
      : name;
  }

  const selSpan = document.querySelector('#header-checklist-container > span');
  if (selSpan) {
    selSpan.className = 'audit-desk-tpl-face';
    selSpan.innerHTML = ''
      + '<span class="audit-desk-tpl-name">' + escapeHtml(name) + '</span>'
      + '<span class="audit-desk-tpl-chev" aria-hidden="true">▾</span>';
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function onPlanToolbarClick(e) {
  const move = e.target.closest('[data-audit-desk-move-pin]');
  const clr = e.target.closest('[data-audit-desk-clear-pin]');
  if (move) {
    e.preventDefault();
    repositionPlanPin();
    return;
  }
  if (clr) {
    e.preventDefault();
    clearPin();
    if (typeof window.showToast === 'function') window.showToast('Точка на плане снята');
    updatePinIndicator();
    paintPlanPanel();
  }
}

function restoreTabAudit() {
  restoreHeaderPieces();

  const appRoot = document.getElementById('app-root');
  const tab = document.getElementById('tab-audit');
  const shell = document.getElementById(SHELL_ID);
  if (appRoot && tab && tab.parentElement !== appRoot) {
    if (shell && shell.parentElement === appRoot) {
      appRoot.insertBefore(tab, shell);
    } else {
      appRoot.insertBefore(tab, appRoot.firstChild);
    }
  }
  if (shell && shell.parentElement) {
    shell.remove();
  }
}

function planEmptyHtml(kind) {
  const titles = {
    nopin: 'План не выбран',
    nopdf: 'Нет PDF у этажа',
    nopdfjs: 'Превью недоступно',
    fail: 'Не удалось загрузить план'
  };
  const hints = {
    nopin: 'Нажмите «на плане» рядом с полем осей — откроется выбор этажа и точка на чертеже.',
    nopdf: 'Выберите другой этаж через «на плане» в форме объекта.',
    nopdfjs: 'PDF.js не загружен. Откройте точку через «на плане» в форме.',
    fail: 'Повторите через «на плане» в форме объекта.'
  };
  const title = titles[kind] || titles.nopin;
  const hint = hints[kind] || hints.nopin;
  // Схематичный «чертёж» — декоративная заглушка, не настоящий план
  const art = ''
    + '<div class="audit-desk-plan-art" aria-hidden="true">'
    + '  <svg viewBox="0 0 240 168" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '    <rect x="12" y="12" width="216" height="144" rx="6" class="audit-desk-plan-art-frame"/>'
    + '    <path d="M12 56h216M12 112h216M80 12v144M160 12v144" class="audit-desk-plan-art-grid"/>'
    + '    <rect x="28" y="28" width="40" height="20" rx="2" class="audit-desk-plan-art-room"/>'
    + '    <rect x="92" y="28" width="56" height="20" rx="2" class="audit-desk-plan-art-room"/>'
    + '    <rect x="172" y="28" width="40" height="20" rx="2" class="audit-desk-plan-art-room"/>'
    + '    <rect x="28" y="72" width="56" height="28" rx="2" class="audit-desk-plan-art-room"/>'
    + '    <rect x="108" y="72" width="48" height="28" rx="2" class="audit-desk-plan-art-room"/>'
    + '    <rect x="172" y="72" width="40" height="28" rx="2" class="audit-desk-plan-art-room"/>'
    + '    <rect x="28" y="120" width="184" height="20" rx="2" class="audit-desk-plan-art-room"/>'
    + '    <circle cx="132" cy="86" r="7" class="audit-desk-plan-art-pin"/>'
    + '    <circle cx="132" cy="86" r="3" class="audit-desk-plan-art-pin-core"/>'
    + '  </svg>'
    + '</div>';
  return ''
    + '<div class="audit-desk-plan-empty" data-audit-desk-plan-empty data-empty-kind="' + kind + '">'
    + art
    + '  <div class="audit-desk-plan-empty-copy">'
    + '    <div class="audit-desk-plan-empty-title">' + title + '</div>'
    + '    <p>' + hint + '</p>'
    + '  </div>'
    + '</div>';
}

function paintPlanPanel() {
  const stage = document.querySelector('[data-audit-desk-plan-stage]');
  const meta = document.querySelector('[data-audit-desk-plan-meta]');
  const moveBtn = document.querySelector('[data-audit-desk-move-pin]');
  const clearBtn = document.querySelector('[data-audit-desk-clear-pin]');
  if (!stage) return;

  const pin = getPlanPin();
  if (moveBtn) moveBtn.hidden = !pin;
  if (clearBtn) clearBtn.hidden = !pin;

  if (!pin || pin.x == null || pin.y == null) {
    if (meta) meta.textContent = '';
    stage.innerHTML = planEmptyHtml('nopin');
    return;
  }

  const loc = locations();
  const floor = loc && typeof loc.getNode === 'function' ? loc.getNode(pin.locationId) : null;
  const plan = loc && typeof loc.getPlanForFloor === 'function'
    ? loc.getPlanForFloor(pin.locationId)
    : null;
  if (meta) {
    const floorName = (floor && (floor.name || floor.title)) || pin.locationId || 'этаж';
    meta.textContent = plan && plan.pdf_url
      ? (floorName + ' · точка ' + Math.round(pin.x) + '% / ' + Math.round(pin.y) + '%')
      : (floorName + ' · PDF нет');
  }

  if (!plan || !plan.pdf_url) {
    stage.innerHTML = planEmptyHtml('nopdf');
    return;
  }

  const token = ++_previewToken;
  stage.innerHTML = '<div class="audit-desk-plan-loader">Загрузка плана…</div>';
  renderPdfPreview(stage, plan.pdf_url, pin, token);
}

async function renderPdfPreview(stage, pdfUrl, pin, token) {
  const pdfjs = window.pdfjsLib;
  if (!pdfjs) {
    stage.innerHTML = planEmptyHtml('nopdfjs');
    return;
  }

  try {
    const doc = await pdfjs.getDocument(pdfUrl).promise;
    if (token !== _previewToken) return;
    const page = await doc.getPage(1);
    if (token !== _previewToken) return;

    const base = page.getViewport({ scale: 1 });
    const avail = Math.max(280, (stage.clientWidth || 480) - 16);
    const scale = Math.min(1.5, avail / base.width);
    const viewport = page.getViewport({ scale: scale });

    const wrap = document.createElement('div');
    wrap.className = 'audit-desk-plan-canvas-wrap';
    wrap.style.width = viewport.width + 'px';

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    wrap.appendChild(canvas);

    const pinEl = document.createElement('div');
    pinEl.className = 'audit-desk-plan-pin';
    pinEl.style.left = pin.x + '%';
    pinEl.style.top = pin.y + '%';
    wrap.appendChild(pinEl);

    stage.innerHTML = '';
    stage.appendChild(wrap);

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport: viewport
    }).promise;
  } catch (e) {
    if (token !== _previewToken) return;
    console.warn('[audit.desktop] plan preview failed', e);
    stage.innerHTML = planEmptyHtml('fail');
  }
}

export function showAuditDesktop() {
  if (!isDesktopViewport() || !isAuditActive()) {
    teardownAuditDesktop();
    return;
  }
  setWideLayout(true);
  setMobileAuditHeaderVisible(false);
  const shell = ensureShell();
  if (!shell) return;
  _shellApplied = true;
  syncChromeSubtitle();
  paintPlanPanel();
}

export function teardownAuditDesktop() {
  _previewToken += 1;
  const wasApplied = _shellApplied;
  if (_shellApplied) {
    restoreTabAudit();
    _shellApplied = false;
  }
  setWideLayout(false);
  // Вернуть мобильную шапку только если Осмотр ещё активен (mobile / уход с desk)
  if (wasApplied && isAuditActive() && !isDesktopViewport()) {
    setMobileAuditHeaderVisible(true);
  } else if (wasApplied && isAuditActive() && isDesktopViewport()) {
    // stay desk — no-op
  } else if (wasApplied && !isAuditActive()) {
    // другая вкладка сама управляет header через switchViewNode
  } else if (!isDesktopViewport() && isAuditActive()) {
    setMobileAuditHeaderVisible(true);
  }
}

function syncAuditDesktop() {
  if (isDesktopViewport() && isAuditActive()) {
    showAuditDesktop();
  } else {
    teardownAuditDesktop();
  }
}

function bindHooks() {
  if (_hooksBound) return;
  _hooksBound = true;

  document.addEventListener('quality:planPin:changed', function () {
    if (_shellApplied) paintPlanPanel();
  });

  // Label / template changes
  document.addEventListener('change', function (e) {
    if (!_shellApplied) return;
    if (e.target && (e.target.id === 'checklist-selector' || e.target.id === 'fake-checklist-selector')) {
      queueMicrotask(syncChromeSubtitle);
    }
  });

  window.addEventListener('hashchange', function () {
    queueMicrotask(function () {
      setTimeout(syncAuditDesktop, 0);
      setTimeout(syncAuditDesktop, 80);
    });
  });

  // AppRouter.navigate использует replaceState — hashchange не всегда приходит.
  if (window.RBI && window.RBI.events && typeof window.RBI.events.on === 'function') {
    window.RBI.events.on('appMode:changed', function () {
      queueMicrotask(function () {
        setTimeout(syncAuditDesktop, 0);
        setTimeout(syncAuditDesktop, 100);
      });
    });
  }

  if (window.AppViews && typeof window.AppViews.renderAudit === 'function') {
    _origRenderAudit = window.AppViews.renderAudit;
    window.AppViews.renderAudit = function () {
      const r = _origRenderAudit.apply(this, arguments);
      queueMicrotask(syncAuditDesktop);
      return r;
    };
  }

  document.addEventListener('click', function (e) {
    const nav = e.target.closest('[data-route], .app-nav2-item, .nav-item, [href*="audit"], [href*="analytics"]');
    if (nav) queueMicrotask(function () { setTimeout(syncAuditDesktop, 50); });
  });
}

function bindResize() {
  if (_resizeBound) return;
  _resizeBound = true;
  let t = null;
  window.addEventListener('resize', function () {
    if (t) clearTimeout(t);
    t = setTimeout(syncAuditDesktop, 120);
  });
}

function boot() {
  bindHooks();
  bindResize();
  if (!_origRenderAudit && window.AppViews && typeof window.AppViews.renderAudit === 'function') {
    _origRenderAudit = window.AppViews.renderAudit;
    window.AppViews.renderAudit = function () {
      const r = _origRenderAudit.apply(this, arguments);
      queueMicrotask(syncAuditDesktop);
      return r;
    };
  }
  syncAuditDesktop();
  setTimeout(syncAuditDesktop, 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.__auditDesktop = {
  show: showAuditDesktop,
  teardown: teardownAuditDesktop,
  sync: syncAuditDesktop,
  paintPlan: paintPlanPanel
};
