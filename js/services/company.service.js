// company.service.js — Minimal Company Context (§29, п.11)
//
// Read-only сервис данных о компании. Единственная существующая
// компания (single-tenant) — не multi-tenant engine, не матрица прав,
// без UI. enabledModules — каталог platform-модулей компании (согласован
// с MODULE_KEYS / modules.manifest.js). app.entry режет init по
// availableModules (= enabled ∩ getAllowedModules) + бандлы; settings
// всегда в init как platform chrome, даже если нет в availableModules.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var ENABLED_MODULES = ['quality', 'sk', 'settings', 'knowledge', 'construction', 'construction-v2', 'game', 'ai'];


  var CompanyService = {
    getCompany: function () {
      return {
        id: 'rbi',
        name: 'RBI',
        enabledModules: ENABLED_MODULES.slice()
      };
    }
  };

  window.RBI = window.RBI || {};
  window.RBI.services = window.RBI.services || {};
  window.RBI.services.company = CompanyService;
  if (window.RBI.registry && window.RBI.registry.register) {
    window.RBI.registry.register('service.company', CompanyService);
  }

  console.log('[CompanyService] company.service.js loaded');
}());
