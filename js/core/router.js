/* Файл: js/core/router.js */

window.AppRouter = {
    routes: {},
    scrollPositions: {}, // Память прокрутки для каждой вкладки
    /** Путь, для которого UI считается «смонтированным» после последнего renderRoute */
    activePath: null,

    /**
     * Тяжёлые маршруты: полный teardown view при уходе (не CSS-hide).
     * Перед очисткой DOM — flush черновиков (RBIFormDraft).
     * Remount каркаса — ensure* / rbiEnsureTabMarkup в AppViews.render*.
     */
    heavyRoutes: {
        '#/quality/analytics': {
            containerId: 'tab-analytics',
            teardown: function () {
                var mod = window.AnalyticsModule
                    || (window.RBI && window.RBI.registry && typeof window.RBI.registry.get === 'function'
                        ? window.RBI.registry.get('module.analytics')
                        : null);
                if (mod && typeof mod.teardownView === 'function') {
                    mod.teardownView();
                    return;
                }
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-analytics', function () {
                        try {
                            if (window.AnalyticsDesktopRender && typeof window.AnalyticsDesktopRender.teardown === 'function') {
                                window.AnalyticsDesktopRender.teardown();
                            }
                        } catch (_) { /* ignore */ }
                        try {
                            if (window.AnalyticsState && window.AnalyticsState.chartInstances) {
                                Object.values(window.AnalyticsState.chartInstances).forEach(function (ch) {
                                    try { if (ch && typeof ch.destroy === 'function') ch.destroy(); } catch (e) { /* ignore */ }
                                });
                                if (typeof window.AnalyticsState.setChartInstances === 'function') {
                                    window.AnalyticsState.setChartInstances({});
                                }
                            }
                        } catch (_) { /* ignore */ }
                        if (typeof window.clearAnalyticsViewRuntimeCaches === 'function') {
                            try { window.clearAnalyticsViewRuntimeCaches(); } catch (_) { /* ignore */ }
                        }
                    });
                }
            }
        },
        '#/quality/audit': {
            containerId: 'tab-audit',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-audit');
                } else {
                    var el = document.getElementById('tab-audit');
                    if (el) el.innerHTML = '';
                }
            }
        },
        '#/quality/engineer': {
            containerId: 'tab-engineer',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-engineer');
                } else {
                    var el = document.getElementById('tab-engineer');
                    if (el) el.innerHTML = '';
                }
            }
        },
        '#/quality/reference': {
            containerId: 'tab-reference',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-reference');
                } else {
                    var el = document.getElementById('tab-reference');
                    if (el) el.innerHTML = '';
                }
            }
        },
        '#/quality/settings': {
            containerId: 'tab-settings',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-settings');
                } else {
                    var el = document.getElementById('tab-settings');
                    if (el) el.innerHTML = '';
                }
            }
        },
        '#/construction/defects': {
            containerId: 'tab-construction-defects',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-construction-defects');
                }
            }
        },
        '#/construction/acceptance': {
            containerId: 'tab-construction-acceptance',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-construction-acceptance');
                }
            }
        },
        '#/construction/transfer': {
            containerId: 'tab-transfer',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-transfer');
                }
            }
        },
        '#/construction/reference': {
            // тот же #tab-reference
            containerId: 'tab-reference',
            teardown: function () {
                if (typeof window.rbiTeardownTabView === 'function') {
                    window.rbiTeardownTabView('tab-reference');
                }
            }
        }
    },

    init() {
        console.log("Умный Роутер запущен");
        
        window.addEventListener('popstate', () => this.renderRoute());
        
        document.body.addEventListener('click', (e) => {
            const navItem = e.target.closest('[data-path]');
            if (navItem) {
                e.preventDefault();
                this.navigate(navItem.dataset.path);
            }
        });

        if (!window.location.hash || window.location.hash === '#/') {
            this.navigate('#/quality/audit', true);
        } else {
            this.renderRoute();
        }
    },

    addRoute(path, renderFunction) {
        this.routes[path] = renderFunction;
    },

    navigate(path, replace = false) {
        // 1. Запоминаем скролл текущей вкладки перед уходом
        const currentPath = window.location.hash || '#/quality/audit';
        this.scrollPositions[currentPath] = window.scrollY;

        // 2. Делаем тихий переход
        if (replace) {
            window.history.replaceState(null, '', path);
        } else {
            window.history.pushState(null, '', path);
        }
        this.renderRoute();
    },

    _teardownHeavyIfNeeded(leavingPath, enteringPath) {
        if (!leavingPath || leavingPath === enteringPath) return;
        const entry = this.heavyRoutes[leavingPath];
        if (!entry || typeof entry.teardown !== 'function') return;

        // Глобальный flush отложенных scheduleSave (localStorage), до любого DOM wipe
        try {
            if (window.RBIFormDraft && typeof window.RBIFormDraft.flushPending === 'function') {
                window.RBIFormDraft.flushPending();
            }
        } catch (_) { /* ignore */ }

        try {
            entry.teardown();
        } catch (err) {
            console.warn('[AppRouter] heavy teardown failed for', leavingPath, err);
        }
        // Страховка: контейнер пуст даже если teardown не дошёл до innerHTML
        if (entry.containerId) {
            const el = document.getElementById(entry.containerId);
            if (el && el.innerHTML) el.innerHTML = '';
        }
    },

    renderRoute() {
        let path = window.location.hash || '#/quality/audit';
        const renderFunction = this.routes[path] || this.routes['*'];
        
        if (renderFunction) {
            this._teardownHeavyIfNeeded(this.activePath, path);
            renderFunction();
            this.activePath = path;
            this.updateNavHighlight(path);

            // 3. Восстанавливаем скролл. 
            // Ждем 60мс, чтобы скрипт шапки успел пересчитать отступы (padding)
            setTimeout(() => {
                const savedScroll = this.scrollPositions[path] || 0;
                window.scrollTo(0, savedScroll);
            }, 60);
        }
    },

    updateNavHighlight(path) {
        document.querySelectorAll('#main-bottom-nav .nav-item[data-path], #app-nav2 .app-nav2-item[data-path]').forEach(item => {
            if (item.dataset.path === path) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
};

window.switchTab = function (tabId, navElement = null) {
    const routeMap = {
        'tab-audit': '#/quality/audit',
        'tab-engineer': '#/quality/engineer',
        'tab-analytics': '#/quality/analytics',
        'tab-reference': '#/quality/reference',
        'tab-settings': '#/quality/settings'
    };

    if (routeMap[tabId]) {
        AppRouter.navigate(routeMap[tabId]);
    }
};
