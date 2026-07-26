/**
 * Platform entry: construction-v2 (Vite bundle).
 * Legacy js/modules/construction/** не импортируется и не изменяется.
 */

import { ConstructionV2Manifest } from './manifest';
import { refreshApartmentPlanMarkers } from './apartment-plan';
import {
  mountConstructionV2Shell,
  refreshConstructionV2Markers,
  renderConstructionV2,
  requestFocusAcceptance,
  setConstructionV2Subview
} from './ui';

let _inited = false;

function _hashPath(): string {
  return (location.hash || '').replace(/^#/, '');
}

function _applyHashSubview() {
  const h = _hashPath();
  if (h.startsWith('/construction-v2/acceptance')) {
    setConstructionV2Subview('acceptance');
  } else if (h.startsWith('/construction-v2/transfer')) {
    setConstructionV2Subview('transfer');
  } else if (h.startsWith('/construction-v2')) {
    setConstructionV2Subview('plan');
  }
}

async function init(_ctx?: Record<string, unknown>) {
  if (_inited) {
    _applyHashSubview();
    await renderConstructionV2();
    return { ok: true, reentered: true };
  }
  mountConstructionV2Shell();
  _applyHashSubview();
  await renderConstructionV2();

  window.RBI?.events?.on?.('locations:changed', () => {
    const tab = document.getElementById('tab-construction-v2');
    if (tab && !tab.classList.contains('hidden')) {
      renderConstructionV2().catch(() => {});
    }
  });

  window.RBI?.events?.on?.('construction-defects:changed', () => {
    refreshConstructionV2Markers().catch(() => {});
    refreshApartmentPlanMarkers().catch(() => {});
  });

  window.RBI?.events?.on?.('construction-acceptance:changed', () => {
    refreshConstructionV2Markers().catch(() => {});
  });

  window.RBI?.events?.on?.('construction-units:changed', () => {
    refreshConstructionV2Markers().catch(() => {});
  });

  window.RBI?.events?.on?.('construction-acceptance:focus', (payload?: unknown) => {
    const p = (payload || {}) as { id?: string; locationId?: string };
    if (p.id && p.locationId) requestFocusAcceptance(p.id, p.locationId);
  });

  _registerAppRouter();
  if (_hashPath().startsWith('/construction-v2')) {
    showTab();
  }

  _inited = true;
  console.info('[construction-v2] init ok');
  return { ok: true };
}

function showTab() {
  // App Shell / AppRouter переключают вкладки через .active (не .hidden)
  document.querySelectorAll('.view-section').forEach((el) => {
    el.classList.remove('active');
  });
  const tab = document.getElementById('tab-construction-v2');
  if (tab) {
    tab.classList.remove('hidden');
    tab.classList.add('active');
  }
  // Construction-совместимая шапка (без checklist quality); bottom-nav остаётся видимым
  const modeMgr = (
    window as unknown as {
      AppModeManager?: {
        currentMode?: string;
        updateHeaderVisibility?: (show?: boolean) => void;
        renderBottomNav?: () => void;
      };
    }
  ).AppModeManager;
  if (modeMgr?.updateHeaderVisibility) {
    modeMgr.updateHeaderVisibility(true);
  } else {
    const header = document.getElementById('main-header');
    if (header) header.style.display = 'block';
  }
  if (modeMgr?.currentMode === 'construction-v2' && typeof modeMgr.renderBottomNav === 'function') {
    modeMgr.renderBottomNav();
  } else {
    const navEl = document.getElementById('main-bottom-nav');
    if (navEl && modeMgr?.currentMode === 'construction-v2') navEl.style.display = 'flex';
  }
  if (typeof window.updateBodyPadding === 'function') {
    setTimeout(() => window.updateBodyPadding?.(), 50);
  }
  _applyHashSubview();
  renderConstructionV2().catch(() => {});
}

function _registerAppRouter() {
  const router = (window as unknown as { AppRouter?: { addRoute?: (p: string, fn: () => void) => void } })
    .AppRouter;
  if (router && typeof router.addRoute === 'function') {
    router.addRoute('#/construction-v2', () => showTab());
    router.addRoute('#/construction-v2/acceptance', () => showTab());
    router.addRoute('#/construction-v2/transfer', () => showTab());
  }
}

/** Регистрация модуля в registry (как classic modules). */
function registerModule() {
  window.RBI = window.RBI || ({ services: {} } as Window['RBI']);
  const mod = { init, showTab, manifest: ConstructionV2Manifest, render: renderConstructionV2 };
  if (window.RBI.registry?.register) {
    window.RBI.registry.register('module.construction-v2', mod);
  }
  (window as unknown as { ConstructionV2Module?: typeof mod }).ConstructionV2Module = mod;

  _registerAppRouter();

  // Hash-роутинг без ломки legacy #/construction
  window.addEventListener('hashchange', () => {
    const h = _hashPath();
    if (h.startsWith('/construction-v2')) showTab();
  });
  if (_hashPath().startsWith('/construction-v2')) {
    // после mount (и после возможного раннего AppRouter → 404-заглушки)
    setTimeout(() => showTab(), 0);
  }
}

registerModule();

export { init, showTab, ConstructionV2Manifest };
export default { init, showTab, manifest: ConstructionV2Manifest };
