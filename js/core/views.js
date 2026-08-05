/* Файл: js/core/views.js */

// Мягкое переключение экранов (через CSS класс)
// Мягкое переключение экранов (через CSS класс)
function switchViewNode(tabId, showHeader) {
    // 1. Скрываем все вкладки
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
    });
    
    // 2. Показываем только нужную
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
    }
    
    // 3. Управляем шапкой (основной)
    const header = document.getElementById('main-header');
    if (header) {
        // Жестко скрываем шапку на вкладках Аналитики, Настроек и т.д., чтобы не ломать верстку
        header.style.display = showHeader ? 'block' : 'none';
        
        // Если шапка видима, настраиваем её внутренности в зависимости от режима
        if (window.AppModeManager) window.AppModeManager.updateHeaderVisibility(showHeader);
    }
    
    // 4. Пересчитываем отступы
    if (typeof updateBodyPadding === 'function') setTimeout(updateBodyPadding, 50);
}

// Функция для режима-заглушки (В разработке)
function showModePlaceholder(modeName, customMessage) {
    const el = document.getElementById('tab-mode-placeholder');
    if (!el) return;

    function _phT(key, vars, fallback) {
        var i18n = window.RBI && window.RBI.services && window.RBI.services.i18n;
        if (i18n && typeof i18n.t === 'function') {
            var tr = i18n.t(key, vars);
            if (tr && tr !== key) return tr;
        }
        return fallback;
    }

    // Display name via nav.* (hyphens → underscores); RU fallbacks for ids without keys
    var nameFallbacks = {
        transfer: 'Передача квартир',
        warranty: 'Гарантия',
        safety: 'Безопасность',
        uk: 'Управляющая компания',
        tender: 'Тендерный отдел',
        standards: 'Стандарты (тех. решения)',
        schedule: 'Сроки',
        budget: 'Бюджет'
    };
    var navKey = 'nav.' + String(modeName || '').replace(/-/g, '_');
    var displayName = _phT(navKey, null, nameFallbacks[modeName] || modeName);

    const titleEl = el.querySelector('h2');
    if (titleEl) {
        titleEl.innerText = _phT(
            'shell.placeholder_title',
            { name: displayName },
            'Модуль «' + displayName + '»'
        );
    }

    const messageEl = document.getElementById('placeholder-message');
    if (messageEl) {
        messageEl.innerText = customMessage || _phT(
            'shell.placeholder_body',
            null,
            'Модуль ещё не разработан. Стадия оформления концепции и наполнения.'
        );
    }

    // showHeader=true только оставляет видимой верхнюю строку шапки
    // (переключатель режима) — безопасно для потока AppModeManager
    // (safety/warranty/uk), т.к. там currentMode уже сменился с 'quality' и
    // updateHeaderVisibility() прячет дашборд/данные объекта. Для sidebar-
    // потока (rbi_showSidebarPlaceholder) currentMode остаётся 'quality' —
    // та же функция показала бы полный дашборд аудита поверх заглушки,
    // поэтому там шапка скрывается целиком (showHeader=false).
    var keepHeader = !window.rbi_sidebarPlaceholderReturnHash;
    switchViewNode('tab-mode-placeholder', keepHeader);

    // Sidebar-поток (rbi_showSidebarPlaceholder) не меняет AppModeManager.currentMode,
    // поэтому renderBottomNav() не вызывается и таббар (Осмотр/Инженер/... или
    // Дефекты/Приёмка/...) остаётся видимым поверх заглушки — прячем его явно
    // здесь. Поток AppModeManager (safety/warranty/uk) уже скрывает нав сам
    // (см. app-mode-utils.js renderBottomNav — currentMode не quality/construction).
    if (window.rbi_sidebarPlaceholderReturnHash) {
        var navEl = document.getElementById('main-bottom-nav');
        if (navEl) navEl.style.display = 'none';
        if (typeof updateBodyPadding === 'function') setTimeout(updateBodyPadding, 60);
    }
}

// Единая заглушка для разделов сайдбара, не относящихся к переключению
// бизнес-режима AppModeManager (§29 п.9 — «Тендерный отдел»/«Стандарты»/
// «Сроки»/«Бюджет» и т.п.). В отличие от showModePlaceholder(...) из
// AppModeManager-потока (safety/warranty/uk), здесь НЕ меняется
// AppModeManager.currentMode/previousMode — раздел открывается «поверх»
// текущего маршрута без переключения бизнес-режима. Поэтому кнопка «Назад»
// не может полагаться на revertToPreviousMode() (no-op, если currentMode не
// менялся) — путь возврата запоминается отдельно и обрабатывается
// rbi_backFromModePlaceholder().
window.rbi_sidebarPlaceholderReturnHash = null;
window.rbi_showSidebarPlaceholder = function (moduleId) {
    window.rbi_sidebarPlaceholderReturnHash = window.location.hash || '#/quality/audit';
    showModePlaceholder(moduleId);
};

// Обработчик кнопки «Вернуться назад» на экране-заглушке (единый для обоих
// потоков): если заглушка была открыта из sidebar (см. выше) — возвращаемся
// на сохранённый маршрут через роутер; иначе (поток AppModeManager —
// safety/warranty/uk) — старое поведение revertToPreviousMode().
window.rbi_backFromModePlaceholder = function () {
    if (window.rbi_sidebarPlaceholderReturnHash) {
        var path = window.rbi_sidebarPlaceholderReturnHash;
        window.rbi_sidebarPlaceholderReturnHash = null;
        // Восстанавливаем таббар, скрытый в showModePlaceholder() при входе из
        // sidebar — роутер ниже вызовет renderAudit()/renderConstruction*(),
        // но на всякий случай (если path совпадает с уже активным роутом и
        // AppRouter.navigate() не перерисует) восстанавливаем нав явно здесь же.
        if (window.AppModeManager && typeof window.AppModeManager.renderBottomNav === 'function') {
            window.AppModeManager.renderBottomNav();
        }
        if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
            window.AppRouter.navigate(path);
        }
        return;
    }
    if (typeof window.revertToPreviousMode === 'function') window.revertToPreviousMode();
};

window.AppViews = {
    // === РАЗДЕЛ 1: КАЧЕСТВО (СУЩЕСТВУЮЩИЙ) ===
    renderAudit() {
        if (typeof window.ensureAuditMarkup === 'function') {
            try { window.ensureAuditMarkup(); } catch (_) { /* ignore */ }
        }
        if (AppModeManager.currentMode !== 'quality') AppModeManager.changeMode('quality');
        switchViewNode('tab-audit', true); // ТУТ TRUE (шапка нужна)
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateFabButton === 'function') updateFabButton('tab-audit');
    },
    
    renderEngineer() {
        if (typeof window.ensureEngineerMarkup === 'function') {
            try { window.ensureEngineerMarkup(); } catch (_) { /* ignore */ }
        }
        if (AppModeManager.currentMode !== 'quality') AppModeManager.changeMode('quality');
        var tabEl = document.getElementById('tab-engineer');
        var alreadyMounted = !!(tabEl && tabEl.classList.contains('active') && tabEl.querySelector('#engineer-subtabs-block'));
        switchViewNode('tab-engineer', false); // ТУТ FALSE
        var subId = (window.AppRouter && typeof window.AppRouter.subTabIdFromPath === 'function')
            ? window.AppRouter.subTabIdFromPath(window.location.hash || '', '#/quality/engineer')
            : null;
        subId = subId || 'eng-sub-tasks';
        if (alreadyMounted && typeof window.rbi_switchEngineerSubTab === 'function') {
            window.rbi_switchEngineerSubTab(subId, null, { fromRouter: true });
        } else {
            if (typeof rbi_renderEngineerTab === 'function') rbi_renderEngineerTab();
            if (typeof window.rbi_switchEngineerSubTab === 'function') {
                window.rbi_switchEngineerSubTab(subId, null, { fromRouter: true });
            }
        }
        if (typeof updateFabButton === 'function') updateFabButton('tab-engineer');
    },

    renderAnalytics() {
        // После route-teardown (#tab-analytics.innerHTML='') каркас нужно вернуть
        // до любого paint / desktop.show / defer-ветки.
        if (typeof window.ensureAnalyticsMarkup === 'function') {
            try { window.ensureAnalyticsMarkup(); } catch (_) { /* ignore */ }
        }

        var anaTab = document.getElementById('tab-analytics');
        var anaAlready = !!(anaTab && anaTab.classList.contains('active')
            && anaTab.querySelector('#analytics-subtabs-block'));
        if (anaAlready && window.AppRouter && window.AppRouter.sameFamily
            && window.AppRouter.sameFamily(window.AppRouter.activePath, window.location.hash)) {
            var subFromHash = window.AppRouter.subTabIdFromPath(window.location.hash || '', '#/quality/analytics');
            if (subFromHash && typeof switchAnalyticsSubTab === 'function') {
                switchAnalyticsSubTab(subFromHash, null, { fromRouter: true });
                if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');
                return;
            }
        }

        // Re-entry во время sync на уже открытой Аналитике → только dirty (§5).
        // Но breakpoint desktop↔mobile всегда применяем shell/teardown — иначе
        // после сужения UI залипает в mobile при обратном растягивании.
        var desk = window.AnalyticsDesktopRender;
        var wantDesk = !!(desk && typeof desk.isDesktop === 'function' && desk.isDesktop());
        var deskShellOn = !!(desk && typeof desk.isShellApplied === 'function'
            ? desk.isShellApplied()
            : document.getElementById('analytics-desktop-shell'));

        // Resize watcher нужен и на mobile-входе, иначе expand ≥1280 молчит.
        if (desk && typeof desk.bindResizeWatcher === 'function') {
            desk.bindResizeWatcher(function () {
                if (typeof window.AppViews !== 'undefined' && window.AppViews.renderAnalytics) {
                    window.AppViews.renderAnalytics();
                }
            });
        }

        if (desk && typeof desk.teardown === 'function' && !wantDesk) {
            try { desk.teardown(); } catch (_) { /* ignore */ }
            deskShellOn = false;
        }

        if (typeof window.shouldDeferFullRender === 'function' && window.shouldDeferFullRender('analytics')) {
            // После teardown на mobile всё равно нужен mobile-paint списка,
            // иначе остаётся пусто / HTML таблицы до смены вкладки.
            if (!wantDesk) {
                try {
                    if (typeof updateAnalyticsFilters === 'function') updateAnalyticsFilters();
                    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
                } catch (_) { /* ignore */ }
            } else if (desk && typeof desk.show === 'function' && !deskShellOn) {
                // Expand ≥1280 во время defer: shell обязателен, dirty недостаточен.
                try { desk.show(); } catch (_) { /* ignore */ }
                return;
            }
            if (window.RBI?.utils?.syncUi?.markDirty) window.RBI.utils.syncUi.markDirty('analytics');
            else if (window.syncDirtyFlags) window.syncDirtyFlags.analytics = true;
            return;
        }

        if (AppModeManager.currentMode !== 'quality') AppModeManager.changeMode('quality');
        switchViewNode('tab-analytics', false); // Шапка скрыта

        function _syncAnalyticsSubFromHash() {
            var targetTab = (window.AppRouter && typeof window.AppRouter.subTabIdFromPath === 'function')
                ? window.AppRouter.subTabIdFromPath(window.location.hash || '', '#/quality/analytics')
                : null;
            targetTab = targetTab
                || (window.AnalyticsState && window.AnalyticsState.activeSubTab)
                || window.currentActiveAnalyticsTab;
            if (!targetTab || typeof switchAnalyticsSubTab !== 'function') return;
            var btn = document.querySelector('#analytics-subtabs-block button[data-action-arg="' + targetTab + '"]');
            switchAnalyticsSubTab(targetTab, btn || null, { fromRouter: true });
            if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');
        }

        if (wantDesk && desk && typeof desk.show === 'function') {
            var deskTarget = (window.AppRouter && typeof window.AppRouter.subTabIdFromPath === 'function')
                ? window.AppRouter.subTabIdFromPath(window.location.hash || '', '#/quality/analytics')
                : null;
            desk.show();
            // desk.show может выставить дефолт; вернуть slug из hash (или сохранённый target)
            var forceTab = deskTarget
                || (window.AppRouter && typeof window.AppRouter.subTabIdFromPath === 'function'
                    ? window.AppRouter.subTabIdFromPath(window.location.hash || '', '#/quality/analytics')
                    : null);
            if (forceTab && typeof switchAnalyticsSubTab === 'function') {
                var forceBtn = document.querySelector('#analytics-subtabs-block button[data-action-arg="' + forceTab + '"]');
                switchAnalyticsSubTab(forceTab, forceBtn || null, { fromRouter: true });
                // Если desk.show успел переписать hash на дефолт — вернуть
                if (window.AppRouter && typeof window.AppRouter.navigateSub === 'function') {
                    window.AppRouter.navigateSub('#/quality/analytics', forceTab, true);
                }
            }
            if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');
            return;
        }

        if (typeof updateAnalyticsFilters === 'function') updateAnalyticsFilters();

        // Внутренняя функция: выполнить рендер активной подвкладки
        function _doRender() {
            _syncAnalyticsSubFromHash();
            if (!((window.AnalyticsState && window.AnalyticsState.activeSubTab) || window.currentActiveAnalyticsTab)) {
                if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
            }
            if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');
        }

        // Были ли данные уже в памяти на входе — если да, retry не должен
        // второй раз full-render'ить (схлопывает аккордеоны при параллельном sync).
        var _hadDataOnOpen = false;
        try {
            var _inspections0 = window.RBI && window.RBI.services && window.RBI.services.inspections
                ? window.RBI.services.inspections.getAllForAnalyticsSync()
                : [];
            _hadDataOnOpen = Array.isArray(_inspections0) && _inspections0.length > 0;
        } catch (_) { _hadDataOnOpen = false; }

        // Первый рендер сразу (данные могут уже быть, если переключаем вкладки)
        _doRender();

        // Страховочный повторный рендер после загрузки данных из IndexedDB.
        // При F5 app.js заполняет contractorArray асинхронно (await restoreSession).
        // Опрашиваем каждые 200 мс, пока данные не появятся или не истечёт 5 сек.
        // Повторный _doRender — ТОЛЬКО если на входе данных ещё не было.
        var _retryCount = 0;
        var _retryMax = 25; // 25 × 200 мс = 5 сек максимум
        var _retryTimer = setInterval(function () {
            _retryCount++;
            var activeSection = document.querySelector('.view-section.active');
            // Прекращаем, если ушли с вкладки аналитики
            if (!activeSection || activeSection.id !== 'tab-analytics') {
                clearInterval(_retryTimer);
                return;
            }
            var _inspections = window.RBI.services.inspections.getAllForAnalyticsSync();
            if (_inspections.length > 0) {
                clearInterval(_retryTimer);
                if (!_hadDataOnOpen) {
                    if (typeof updateAnalyticsFilters === 'function') updateAnalyticsFilters();
                    _doRender();
                }
                return;
            }
            // Превысили таймаут — останавливаем
            if (_retryCount >= _retryMax) {
                clearInterval(_retryTimer);
            }
        }, 200);

        // ВОЗВРАЩАЕМ ЛОГИКУ СВОРАЧИВАНИЯ ФИЛЬТРОВ
        if (typeof initCollapsiblePanel === 'function') {
            initCollapsiblePanel('analytics-filters-block', 'analytics-panel-body', 'analytics-panel-header', 'analytics-panel-toggle-icon');
        }
    },

    renderReference() {
        if (typeof window.ensureReferenceMarkup === 'function') {
            try { window.ensureReferenceMarkup(); } catch (_) { /* ignore */ }
        }
        var tabEl = document.getElementById('tab-reference');
        var alreadyMounted = !!(tabEl && tabEl.classList.contains('active') && tabEl.querySelector('#reference-subtabs-block'));
        switchViewNode('tab-reference', false); // ТУТ FALSE
        if (typeof updateFabButton === 'function') updateFabButton('tab-reference');
        var subId = (window.AppRouter && typeof window.AppRouter.subTabIdFromPath === 'function')
            ? window.AppRouter.subTabIdFromPath(window.location.hash || '', '#/quality/reference')
            : null;
        subId = subId || 'ref-sub-checklists';
        if (alreadyMounted && typeof window.switchReferenceSubTab === 'function') {
            window.switchReferenceSubTab(subId, null, { fromRouter: true });
        } else {
            if (typeof window.renderReferenceTab === 'function') {
                try { window.renderReferenceTab(); } catch (_) { /* ignore */ }
            }
            if (typeof window.switchReferenceSubTab === 'function') {
                window.switchReferenceSubTab(subId, null, { fromRouter: true });
            }
        }

        if (window.syncDirtyFlags && window.syncDirtyFlags.reference) {
            if (typeof window.rbi_reloadReferenceMemory === 'function') {
                window.RBI.services.knowledge.reloadReferenceMemory().then(() => {
                    window.syncDirtyFlags.reference = false;
                    const activeSub = document.querySelector('.ref-sub-section:not(.hidden)');
                    if (activeSub && activeSub.id === 'ref-sub-twi' && typeof renderTwiList === 'function') renderTwiList();
                });
            }
        }
    },

    renderSettings() {
        if (typeof window.ensureSettingsMarkup === 'function') {
            try { window.ensureSettingsMarkup(); } catch (_) { /* ignore */ }
        }
        var tabEl = document.getElementById('tab-settings');
        var alreadyOn = !!(tabEl && tabEl.classList.contains('active')
            && tabEl.querySelector('#settings-subnav'));
        var hash = window.location.hash || '';
        if (alreadyOn && window.AppRouter && typeof window.AppRouter.sameFamily === 'function'
            && window.AppRouter.sameFamily(window.AppRouter.activePath, hash)) {
            // Подвкладки настроек: только sync секции — без switchViewNode (мигание #main-header / логотипа)
            var sub = (typeof window.AppRouter.subTabIdFromPath === 'function')
                ? window.AppRouter.subTabIdFromPath(hash, '#/settings')
                : null;
            sub = sub || 'platform';
            if (typeof window.setSettingsSubsection === 'function') {
                window.setSettingsSubsection(sub, {
                    fromRouter: true,
                    skipGate: sub !== 'admin'
                });
            }
            try {
                if (window.__settingsDesktop && typeof window.__settingsDesktop.syncChrome === 'function') {
                    window.__settingsDesktop.syncChrome();
                }
            } catch (_) { /* ignore */ }
            return;
        }
        switchViewNode('tab-settings', false); // ТУТ FALSE
        if (typeof renderSettingsTab === 'function') renderSettingsTab(); // <-- ВСТАВКА: Отрисовка данных из памяти
        if (typeof updateStorageInfo === 'function') updateStorageInfo();
        if (typeof updateFabButton === 'function') updateFabButton('tab-settings');
        try {
            if (window.__settingsDesktop && typeof window.__settingsDesktop.sync === 'function') {
                window.__settingsDesktop.sync();
            }
        } catch (_) { /* ignore */ }
    },

    // === РАЗДЕЛ 2: СТРОЙКОНТРОЛЬ (НОВЫЙ) ===
    renderConstructionDefects() { 
        if (typeof window.ensureConstructionMarkup === 'function') {
            try { window.ensureConstructionMarkup('tab-construction-defects'); } catch (_) { /* ignore */ }
        }
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        switchViewNode('tab-construction-defects', true); // ТУТ TRUE (нужна шапка с режимами)
        
        // Запуск логики отрисовки планов СК
        if (window.ConstructionActions && typeof window.ConstructionActions.init === 'function') {
            window.ConstructionActions.init();
        }
    },
    renderConstructionAcceptance() { 
        if (typeof window.ensureConstructionMarkup === 'function') {
            try { window.ensureConstructionMarkup('tab-construction-acceptance'); } catch (_) { /* ignore */ }
        }
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        switchViewNode('tab-construction-acceptance', true); 
        if (window.ConstructionActions && typeof window.ConstructionActions.initAcceptance === 'function') window.ConstructionActions.initAcceptance(); 
    },
    
    
    renderConstructionReports() { showModePlaceholder('construction_reports'); },

    renderConstructionReference() {
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        window.AppViews.renderReference();
    },
    
    // === РАЗДЕЛЫ-ЗАГЛУШКИ ===
    renderTransfer() { 
        if (typeof window.ensureConstructionMarkup === 'function') {
            try { window.ensureConstructionMarkup('tab-transfer'); } catch (_) { /* ignore */ }
        }
        // Если мы не в Стройконтроле, переключаемся на Стройконтроль
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        
        switchViewNode('tab-transfer', true); 
        
        if (window.ConstructionActions && typeof window.ConstructionActions.initTransfer === 'function') {
            window.ConstructionActions.initTransfer();
        }
    },
    renderWarranty() { showModePlaceholder('warranty'); },
    renderSafety() { showModePlaceholder('safety'); }, // <-- ДОБАВИЛИ ЭТУ СТРОКУ
    renderUk() { showModePlaceholder('uk'); },

    // Новый construction-v2 (Vite) — параллельный тестовый контур, не legacy #/construction/*
    renderConstructionV2() {
        if (AppModeManager.currentMode !== 'construction-v2') {
            AppModeManager.changeMode('construction-v2');
            return;
        }
        if (window.ConstructionV2Module && typeof window.ConstructionV2Module.showTab === 'function') {
            window.ConstructionV2Module.showTab();
            return;
        }
        showModePlaceholder('construction-v2', 'Модуль «Стройконтроль в2 (тест)» загружается… Обновите страницу, если экран не сменится.');
    },

    renderNotFound() { showModePlaceholder('404'); }
};

// Регистрируем маршруты
document.addEventListener('DOMContentLoaded', () => {
    // Качество (База)
    AppRouter.addRoute('#/quality/audit', window.AppViews.renderAudit);
    AppRouter.addRoute('#/quality/engineer', window.AppViews.renderEngineer);
    AppRouter.addRoute('#/quality/analytics', window.AppViews.renderAnalytics);
    AppRouter.addRoute('#/quality/reference', window.AppViews.renderReference);
    AppRouter.addRoute('#/settings', window.AppViews.renderSettings);
    // Legacy alias — resolveRoute longest-prefix; normalizeSubPath перепишет hash
    AppRouter.addRoute('#/quality/settings', window.AppViews.renderSettings);
    
   // Стройконтроль
    AppRouter.addRoute('#/construction/defects', window.AppViews.renderConstructionDefects);
    AppRouter.addRoute('#/construction/acceptance', window.AppViews.renderConstructionAcceptance);
    AppRouter.addRoute('#/construction/reports', window.AppViews.renderConstructionReports);
    AppRouter.addRoute('#/construction/transfer', window.AppViews.renderTransfer);
    AppRouter.addRoute('#/construction/reference', window.AppViews.renderConstructionReference);
    AppRouter.addRoute('#/construction-v2', window.AppViews.renderConstructionV2);
    
    // Заглушки
    AppRouter.addRoute('#/warranty/placeholder', window.AppViews.renderWarranty);
    AppRouter.addRoute('#/uk/placeholder', window.AppViews.renderUk);
    AppRouter.addRoute('#/safety/placeholder', window.AppViews.renderSafety); // <-- ДОБАВИЛИ ЭТУ СТРОКУ
    
    AppRouter.addRoute('*', window.AppViews.renderNotFound);
    
    // Инициализация менеджера режимов перед роутером
    AppModeManager.init();
    AppRouter.init();
});
