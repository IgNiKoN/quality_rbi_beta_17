/**
 * tasks.module.js
 * Модуль задач инженера — ES-модуль (Step 36).
 *
 * Содержит всю бизнес-логику из tasks.legacy.js (IIFE, ~1400 строк).
 * Регистрирует window.rbi_* accessor-функции напрямую.
 *
 * Приватные хелперы: _storage(), _syncEnqueue(), _getSetting(),
 *   _isDemoMode(), _inspections(), _syncConfig(), _sync(), _templates().
 * Бизнес-логику не меняет — перенос 1-в-1 из tasks.legacy.js.
 */

// =========================================================================
// ПРИВАТНЫЕ ХЕЛПЕРЫ (изоляция от прямых dbPut/STORES/triggerSync)
// =========================================================================

let _ctx = null;

function _getSetting(key) {
    if (_ctx && _ctx.settings) return _ctx.settings.get(key);
    return window.RBI.services.settings.get(key);
}

function _isDemoMode() {
    if (_ctx && _ctx.appMode) return _ctx.appMode.isDemo();
    return window.RBI.services.appMode.isDemo();
}

function _analyticsFilters() {
    if (_ctx && _ctx.analytics) {
        return _ctx.analytics.getAnalyticsFilters();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.analytics) {
        return window.RBI.services.analytics.getAnalyticsFilters();
    }
    if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics) {
        return activeMultiFilters.analytics;
    }
    return { project: [], contractor: [], inspector: [], template: [] };
}

function _syncEnqueue(action, payload) {
    if (_ctx && _ctx.sync && typeof _ctx.sync.enqueue === 'function') {
        _ctx.sync.enqueue(action, payload);
        return;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.sync &&
        typeof window.RBI.services.sync.enqueue === 'function') {
        window.RBI.services.sync.enqueue(action, payload);
        return;
    }
    if (window.SyncQueueManager && typeof window.SyncQueueManager.enqueue === 'function') {
        window.SyncQueueManager.enqueue(action, payload);
    }
}

function _inspections() {
    if (_ctx && _ctx.inspections) {
        return _ctx.inspections.getAllSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getAllSync();
    }
    if (Array.isArray(window.contractorArray)) return window.contractorArray;
    return [];
}

function _storage() {
    if (_ctx && _ctx.storage) return _ctx.storage;
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
        return window.RBI.services.storage;
    }
    return {
        stores: function() { return typeof STORES !== 'undefined' ? STORES : {}; },
        get: function(store, key) { return dbGet(store, key); },
        getAll: function(store) { return dbGetAll(store); },
        put: function(store, data) { return dbPut(store, data); },
        delete: function(store, key) { return dbDelete(store, key); }
    };
}

function _callAI(messages, options) {
    if (_ctx && _ctx.ai) return _ctx.ai.call(messages, options);
    if (window.RBI && window.RBI.services && window.RBI.services.ai) {
        return window.RBI.services.ai.call(messages, options);
    }
    return window.callAI(messages, options);
}

function _sync(mode) {
    var m = mode || 'silent';
    if (_ctx && _ctx.sync) return _ctx.sync.trigger(m);
    if (window.RBI && window.RBI.services && window.RBI.services.sync) {
        return window.RBI.services.sync.trigger(m);
    }
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
}

function _getTwiCards() {
    if (_ctx && _ctx.knowledge) return _ctx.knowledge.getTwiCardsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
        return window.RBI.services.knowledge.getTwiCardsSync();
    }
    return Array.isArray(window.customTwiCards) ? window.customTwiCards : [];
}

function _getEtalonActs() {
    if (_ctx && _ctx.knowledge) return _ctx.knowledge.getEtalonActsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
        return window.RBI.services.knowledge.getEtalonActsSync();
    }
    return Array.isArray(window.etalonActsArray) ? window.etalonActsArray : [];
}

function _getWeeklyPlan() {
    if (_ctx && _ctx.game) return _ctx.game.getWeeklyPlanSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.getWeeklyPlanSync();
    }
    return window.weeklyPlanData || { weekId: null, tasks: [], completed: false };
}

function _setWeeklyPlan(obj) {
    if (_ctx && _ctx.game) return _ctx.game.setWeeklyPlanSync(obj);
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.setWeeklyPlanSync(obj);
    }
    window.weeklyPlanData = obj;
    return window.weeklyPlanData;
}

function _getEngineerAbsence() {
    if (_ctx && _ctx.game) return _ctx.game.getEngineerAbsenceSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.getEngineerAbsenceSync();
    }
    return window.engineerAbsence || { isActive: false, reason: '', startDate: null, endDate: null };
}

function _templates() {
    if (_ctx && _ctx.templates) return _ctx.templates;
    if (window.RBI && window.RBI.services && window.RBI.services.templates) {
        return window.RBI.services.templates;
    }
    return {
        getUserTemplates: function () {
            return typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
        },
        getByKey: function (key) {
            var ut = typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
            return ut[key] || null;
        },
        getSystemTemplates: function () {
            return typeof window.SYSTEM_TEMPLATES !== 'undefined' ? window.SYSTEM_TEMPLATES : {};
        }
    };
}

// =========================================================================
// ИНЖЕНЕР REF + ОТБОР ЗАДАЧ (dual-id: engineerId + имя)
// =========================================================================

function _normalizeEngName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
}

function _buildEngineerId(name) {
    var pCode = (window.syncConfig && window.syncConfig.projectCode) || _getSetting('projectCode') || 'proj';
    var n = _normalizeEngName(name) || 'Инженер';
    return String(pCode + '_' + n).replace(/\s+/g, '_');
}

function _getCurrentEngineerRef() {
    var perm = (_ctx && _ctx.permissions) || (window.RBI && window.RBI.services && window.RBI.services.permissions);
    var name = '';
    if (perm && typeof perm.getCurrentEngineerName === 'function') {
        name = perm.getCurrentEngineerName();
    } else if (window.syncConfig && window.syncConfig.engineerName) {
        name = window.syncConfig.engineerName;
    } else {
        name = _getSetting('engineerName') || 'Инженер';
    }
    name = _normalizeEngName(name) || 'Инженер';
    return { id: _buildEngineerId(name), name: name };
}

function _engineerRefFromName(name) {
    var n = _normalizeEngName(name) || 'Инженер';
    return { id: _buildEngineerId(n), name: n };
}

function _taskBelongsTo(task, ref) {
    if (!task || !ref) return false;
    if (task._deleted || task.is_deleted) return false;
    var taskId = task.engineerId || task.engineer_id || '';
    if (taskId && ref.id && String(taskId) === String(ref.id)) return true;
    var taskName = _normalizeEngName(
        task.engineerName || task.inspectorName || task.engineer_name || task.inspector_name || ''
    );
    return !!taskName && taskName === _normalizeEngName(ref.name);
}

function _getTasksForEngineer(ref, opts) {
    opts = opts || {};
    var list = window.rbi_tasksData || [];
    return list.filter(function (t) {
        if (!t || t._deleted || t.is_deleted) return false;
        if (opts.openOnly && (t.status === 'done' || t.status === 'blocked')) return false;
        return _taskBelongsTo(t, ref);
    });
}

function _countOpenTasksFor(ref) {
    return _getTasksForEngineer(ref, { openOnly: true }).length;
}

/** Стабильный id задачи — одинаковый на телефоне/ПК/у админа (ensure, не random). */
function _hashStr64(raw) {
    var h1 = 5381;
    var h2 = 52711;
    var s = String(raw || '');
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        h1 = ((h1 << 5) + h1) ^ c;
        h2 = ((h2 << 5) + h2) + c;
    }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

function _stableTaskId(parts) {
    var norm = (parts || []).map(function (p) {
        return String(p == null ? '' : p).trim().toLowerCase().replace(/\s+/g, ' ');
    }).join('|');
    return 't_' + _hashStr64(norm);
}

function _projectCodeForTasks() {
    return (window.syncConfig && window.syncConfig.projectCode) || _getSetting('projectCode') || 'proj';
}

/** Локальное изменение задачи → снова в очередь push (не оставлять syncStatus=synced). */
function _touchTaskForSync(task) {
    if (!task) return;
    task.syncStatus = 'pending';
    task.sync_status = 'pending';
    if (task.source === 'cloud') task.source = 'local';
    task.updatedAt = new Date().toISOString();
}

function _taskSourceLabel(t) {
    if (!t) return 'система';
    if (t.type === 'manual' || t.taskType === 'Поручение') {
        var creator = _normalizeEngName(t.createdBy || t.created_by || '');
        var owner = _normalizeEngName(t.engineerName || t.inspectorName || '');
        if (creator && owner && creator !== owner) return 'руководитель';
        return 'я';
    }
    if (t.type === 'auto' || t.source === 'ai' || t.contractor === 'Системная') return 'система';
    return 'система';
}

/** Воркшоп: один дефект в fail на этой и прошлой неделе у подрядчика (уровень = подрядчик). */
function _findWorkshopCandidates(targetEngineer, allInspections, startOfThisWeek) {
    var startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    var map = {};

    function resolveItemName(c, itemId) {
        var tType = c.templateKey ? c.templateKey.split('_')[0] : '';
        var tKey = c.templateKey ? c.templateKey.replace(tType + '_', '') : '';
        var groups = [];
        if (tType === 'sys' && _templates().getSystemTemplates()[tKey]) {
            groups = _templates().getSystemTemplates()[tKey].groups || [];
        } else if (_templates().getUserTemplates()[tKey]) {
            groups = _templates().getUserTemplates()[tKey].groups || [];
        }
        var flat = [];
        (function walk(nodes) {
            (nodes || []).forEach(function (n) {
                if (n.items) walk(n.items);
                else flat.push(n);
            });
        })(groups);
        var item = flat.find(function (x) { return String(x.id) === String(itemId); });
        return item && item.n ? item.n : String(itemId);
    }

    (allInspections || []).forEach(function (c) {
        if (!c || c.inspectorName !== targetEngineer || !c.state || !c.contractorName) return;
        var d = new Date(c.date);
        if (isNaN(d.getTime())) return;
        var inThis = d >= startOfThisWeek;
        var inLast = d >= startOfLastWeek && d < startOfThisWeek;
        if (!inThis && !inLast) return;
        Object.keys(c.state).forEach(function (id) {
            var st = c.state[id];
            if (st !== 'fail' && st !== 'fail_escalated') return;
            var defectName = resolveItemName(c, id);
            var dKey = c.contractorName + '::' + defectName;
            if (!map[dKey]) {
                map[dKey] = {
                    contractor: c.contractorName,
                    defectName: defectName,
                    templateKey: c.templateKey || '',
                    templateTitle: c.templateTitle || '',
                    thisWeek: false,
                    lastWeek: false
                };
            }
            if (inThis) map[dKey].thisWeek = true;
            if (inLast) map[dKey].lastWeek = true;
        });
    });

    var byContractor = {};
    Object.keys(map).forEach(function (k) {
        var row = map[k];
        if (!(row.thisWeek && row.lastWeek)) return;
        if (!byContractor[row.contractor]) byContractor[row.contractor] = row;
    });
    return Object.keys(byContractor).map(function (k) { return byContractor[k]; });
}

function _softDeleteStaffMeetingTasks() {
    var changed = false;
    (window.rbi_tasksData || []).forEach(function (t) {
        if (!t || t._deleted || t.is_deleted) return;
        if (t.status !== 'pending' && t.status !== 'paused') return;
        var isStaff = t.title === 'Разбор критического брака' ||
            (t.prompt && String(t.prompt).indexOf('Срочно соберите штаб') !== -1);
        if (!isStaff) return;
        t._deleted = true;
        t.is_deleted = true;
        t.updatedAt = new Date().toISOString();
        _storage().put(_storage().stores().TASKS, t);
        changed = true;
    });
    if (changed) {
        window.rbi_tasksData = window.rbi_tasksData.filter(function (t) { return !t._deleted && !t.is_deleted; });
    }
    return changed;
}

/** Категория для чипов хаба (Аудиты / Эталоны / …) — как data-category на карточке. */
function _taskHubCategory(t) {
    if (!t) return 'other';
    if (t.taskType === 'Эталон') return 'etalon';
    return t.category || 'other';
}

// =========================================================================
// ИКОНКИ ЗАДАЧ (константа)
// =========================================================================
var RBI_TASK_ICONS = {
    'ППР': `<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
    'Инструктаж': `<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
    'Эталон': `<svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
    'Контроль': `<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>`,
    'Совещание': `<svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
    'Развитие': `<svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
    'Отчет': `<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
};

// =========================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ
// =========================================================================
window.rbi_tasksData    = window.rbi_tasksData    || [];
window.rbi_scheduleData = window.rbi_scheduleData || [];

var currentTaskContext = null;
window.isPlanGenerating = window.isPlanGenerating || false;
window.isTaskModalOpen  = window.isTaskModalOpen  || false;
var currentCalendarDate = new Date();

// =========================================================================
// 1. УПРАВЛЕНИЕ РУЧНЫМИ ЗАДАЧАМИ
// =========================================================================

function _openTaskModal() {
    const _allInspections = _inspections();
    var cSelect = document.getElementById('manual-task-contractor');
    if (cSelect) {
        var uniqueContrs = Array.from(new Set(_allInspections.map(function(c){ return c.contractorName; }).filter(Boolean))).sort();
        cSelect.innerHTML = '<option value="">-- Общая задача --</option>' + uniqueContrs.map(function(c){ return '<option value="' + c.replace(/"/g, '&quot;') + '">' + c + '</option>'; }).join('');
    }

    var eSelect = document.getElementById('manual-task-engineer');
    if (eSelect) {
        var currentEng = (document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : null) || _getSetting('engineerName') || 'Инженер';
        var allNames = _allInspections.map(function(c){ return c.inspectorName; }).filter(Boolean);
        if (window.serverGlobalRating) {
            allNames = allNames.concat(window.serverGlobalRating.map(function(r){ return r.name; }));
        }
        var uniqueEngs = Array.from(new Set(allNames)).sort();
        if (!uniqueEngs.includes(currentEng)) uniqueEngs.unshift(currentEng);
        eSelect.innerHTML = uniqueEngs.map(function(e){ return '<option value="' + e.replace(/"/g, '&quot;') + '"' + (e === currentEng ? ' selected' : '') + '>' + e + '</option>'; }).join('');

        var _permSvc1 = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
        var currentRole = _permSvc1 ? _permSvc1.getCurrentRole() : 'guest';
        if (_permSvc1 ? _permSvc1.isAdmin() : ['manager', 'deputy_manager'].includes(currentRole)) {
            eSelect.removeAttribute('disabled');
            eSelect.classList.remove('opacity-60', 'cursor-not-allowed');
        } else {
            eSelect.setAttribute('disabled', 'true');
            eSelect.classList.add('opacity-60', 'cursor-not-allowed');
        }
    }

    document.getElementById('manual-task-title').value = '';
    document.getElementById('manual-task-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('manual-task-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
    window.isTaskModalOpen = true;
}

function _closeTaskModal() {
    document.getElementById('manual-task-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    window.isTaskModalOpen = false;
}

async function _saveManualTask() {
    if (_isDemoMode()) return showToast("В демо-режиме сохранение отключено");

    var title    = document.getElementById('manual-task-title').value.trim();
    var promptText = document.getElementById('manual-task-prompt').value.trim();
    var urgencyVal = document.getElementById('manual-task-urgency').value;
    var dateStr  = document.getElementById('manual-task-date').value;
    var assignee = (document.getElementById('manual-task-engineer') ? document.getElementById('manual-task-engineer').value : null) || 'Инженер';

    if (!title) return showToast("⚠️ Укажите название задачи!");

    var tDate = dateStr ? new Date(dateStr) : null;
    if (tDate) tDate.setHours(12, 0, 0, 0);

    var assigneeRef = _engineerRefFromName(assignee);
    var creatorRef = _getCurrentEngineerRef();
    var newTask = {
        id: 'task_man_' + Date.now().toString(36),
        type: 'manual',
        taskType: 'Поручение',
        category: 'other',
        icon: 'Отчет',
        contractor: "Поручение",
        title: title,
        prompt: promptText || 'Без описания',
        urgency: urgencyVal,
        engineerName: assigneeRef.name,
        inspectorName: assigneeRef.name,
        engineerId: assigneeRef.id,
        createdBy: creatorRef.name,
        status: 'pending',
        priorityLvl: 2,
        date: tDate ? tDate.toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'local',
        syncStatus: 'not_synced',
        sync_status: 'not_synced',
        _deleted: false
    };

    window.rbi_tasksData.unshift(newTask);
    await _storage().put(_storage().stores().TASKS, newTask);
    if (!_isDemoMode()) {
        _syncEnqueue('SAVE_TASK', newTask);
    }
    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
    showToast("✅ Поручение создано!");
    _closeTaskModal();
    _renderTasksList(true);
}

// =========================================================================
// 2. АВТОМАТИЧЕСКИЙ ПЛАНИРОВЩИК
// =========================================================================

async function _gameForceUpdatePlan(silent) {
    if (typeof silent === 'undefined') silent = false;
    if (!silent) showToast("🧠 ИИ зачищает дубликаты и перестраивает план...");

    if (_softDeleteStaffMeetingTasks()) {
        // штаб-спам убран; дальше обычный дедуп
    }

    var uniqueKeys = new Set();
    var hadRealChanges = false; // остаётся false, если ни одна задача не была помечена как дубликат
    window.rbi_tasksData.sort(function(a, b){ return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); });

    for (var i = 0; i < window.rbi_tasksData.length; i++) {
        var t = window.rbi_tasksData[i];
        if (!t._deleted) {
            if (t.taskType === 'Эталон' || t.title.includes('Эталон')) {
                t.target = 1;
            }

            var key = '';
            var engKey = t.engineerName || 'NoName';
            if (t.contractor === 'Системная' && t.status === 'pending') {
                key = 'SYSTEMIC_' + engKey + '_' + t.title;
            } else if (t.status === 'pending' || t.status === 'paused') {
                key = 'ACTIVE_' + engKey + '_' + t.contractor + '_' + (t.templateKey || 'NO_TMPL') + '_' + t.taskType;
            } else {
                var tDate = new Date(t.createdAt || t.date || Date.now());
                var _gameSvc1 = (_ctx && _ctx.game) || window.RBI.services.game;
                var weekStr = _gameSvc1.getWeekId(tDate);
                key = 'ARCHIVE_' + engKey + '_' + t.contractor + '_' + (t.templateKey || 'NO_TMPL') + '_' + t.taskType + '_' + weekStr;
            }

            if (uniqueKeys.has(key)) {
                t._deleted = true;
                t.updatedAt = new Date().toISOString();
                await _storage().put(_storage().stores().TASKS, t);
                hadRealChanges = true;
            } else {
                uniqueKeys.add(key);
                if (t.taskType === 'Эталон') {
                    await _storage().put(_storage().stores().TASKS, t);
                }
            }
        }
    }

    window.rbi_tasksData = window.rbi_tasksData.filter(function(t){ return !t._deleted; });

    await _gameGenerateWeeklyPlan(true);

    // RBI FIX: без этой проверки каждый вызов _gameForceUpdatePlan (в т.ч. в самом конце
    // triggerSync) безусловно запрашивал новую синхронизацию — при уже идущей синхронизации
    // такой запрос уходил в pending-retry и запускал следующий полный цикл сразу после
    // окончания текущего, из-за чего sync крутился без остановки. Синхронизацию имеет смысл
    // просить только если реально были найдены и помечены дубликаты задач.
    if (hadRealChanges) {
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
    }

    if (!silent) setTimeout(function(){ showToast("✨ База очищена, дубликаты инспекций удалены!"); }, 500);
}

async function _gameGenerateWeeklyPlan(force) {
    const _allInspections = _inspections();
    if (typeof force === 'undefined') force = false;
    if (window.isPlanGenerating) return;
    window.isPlanGenerating = true;

    try {
        var _permSvc2 = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
        var currentRole = _permSvc2 ? _permSvc2.getCurrentRole() : 'guest';
        if (_permSvc2 ? !_permSvc2.canViewWeeklyPlan() : ['guest', 'contractor'].includes(currentRole)) {
            window.isPlanGenerating = false;
            return;
        }

        var myName = _permSvc2 ? _permSvc2.getCurrentEngineerName() : (_getSetting('engineerName') || 'Инженер');
        if (_getEngineerAbsence().isActive) return;

        var now = new Date();
        var _gameSvc2 = (_ctx && _ctx.game) || window.RBI.services.game;
        var currentWeekId = _gameSvc2.getWeekId(now);
        var startOfThisWeek = _gameSvc2.getStartOfWeek(now);

        if (_getWeeklyPlan().weekId && _getWeeklyPlan().weekId !== currentWeekId) force = true;

        if (force) {
            var nowTime = new Date().setHours(0, 0, 0, 0);
            window.rbi_tasksData.forEach(function(t) {
                if (t.status === 'pending') {
                    var tDate = new Date(t.date).setHours(0, 0, 0, 0);
                    if (tDate < nowTime && t.type === 'auto') {
                        var diffDays = Math.round((nowTime - tDate) / (1000 * 60 * 60 * 24));
                        t.carryOverCount = Math.max(1, Math.floor(diffDays / 7));
                    }
                }
            });
        }

        var newTasksCount = 0;
        _softDeleteStaffMeetingTasks();

        // Админ/РП: полный план на всех — только при явном force (кнопка «Синхронизировать»/force plan).
        // Обычный generate — только текущий инженер, иначе плодятся чужие локальные миры.
        var engineersToProcess = [myName];
        if (force && _permSvc2 && _permSvc2.isAdmin()) {
            var allEngs = Array.from(new Set(_allInspections.map(function(c){ return c.inspectorName; }).filter(Boolean)));
            if (allEngs.length > 0) engineersToProcess = allEngs;
            if (!engineersToProcess.includes(myName)) engineersToProcess.push(myName);
        } else if (force && currentRole === 'project_manager') {
            var allEngs2 = Array.from(new Set(_allInspections.map(function(c){ return c.inspectorName; }).filter(Boolean)));
            if (allEngs2.length > 0) engineersToProcess = allEngs2;
        }

        var pCodeTasks = _projectCodeForTasks();

        for (var ei = 0; ei < engineersToProcess.length; ei++) {
            var targetEngineer = engineersToProcess[ei];
            if (!targetEngineer || targetEngineer === 'Неизвестный инспектор') continue;
            var targetEngRef = _engineerRefFromName(targetEngineer);
            var b3AgendaNotes = [];

            var addTask = function(idSuffix, cat, icon, title, workTitle, contractor, prompt, lvl, tDate, tmplKey, taskType, targetCount) {
                if (typeof tmplKey === 'undefined') tmplKey = '';
                if (typeof taskType === 'undefined') taskType = '';
                if (typeof targetCount === 'undefined') targetCount = 1;
                var eng = targetEngRef.name;
                var engId = targetEngRef.id;
                var typeKey = taskType || title || idSuffix || 'task';
                var periodKey = (contractor === 'Системная') ? ('w:' + currentWeekId) : 'active';
                var taskId = _stableTaskId([pCodeTasks, engId || eng, typeKey, contractor, tmplKey || '-', periodKey]);

                var matchSemantic = function(t) {
                    if (!t || t._deleted || t.is_deleted) return false;
                    if (!_taskBelongsTo(t, targetEngRef)) return false;
                    if (t.status === 'pending' || t.status === 'paused') {
                        if (contractor === 'Системная') return t.title === title;
                        return t.contractor === contractor && t.templateKey === tmplKey && t.taskType === taskType;
                    }
                    var taskWeek = _gameSvc2.getWeekId(new Date(t.updatedAt || t.createdAt || t.date || Date.now()));
                    if (taskWeek === currentWeekId) {
                        if (contractor === 'Системная') return t.title === title;
                        return t.contractor === contractor && t.templateKey === tmplKey && t.taskType === taskType;
                    }
                    return false;
                };

                var existingTask = window.rbi_tasksData.find(function(t) {
                    return t && !t._deleted && !t.is_deleted && String(t.id) === String(taskId);
                });
                if (!existingTask) {
                    existingTask = window.rbi_tasksData.find(matchSemantic);
                }

                // Контроль: «active» id занят done прошлой недели → новый id на эту неделю
                if (existingTask && contractor !== 'Системная' &&
                    (existingTask.status === 'done' || existingTask.status === 'blocked')) {
                    var doneWeek = _gameSvc2.getWeekId(new Date(existingTask.updatedAt || existingTask.date || Date.now()));
                    if (doneWeek !== currentWeekId) {
                        periodKey = 'w:' + currentWeekId;
                        taskId = _stableTaskId([pCodeTasks, engId || eng, typeKey, contractor, tmplKey || '-', periodKey]);
                        existingTask = window.rbi_tasksData.find(function(t) {
                            return t && !t._deleted && !t.is_deleted && String(t.id) === String(taskId);
                        }) || null;
                    }
                }

                if (existingTask) {
                    var oldId = existingTask.id;
                    if (String(oldId) !== String(taskId)) {
                        var ghost = Object.assign({}, existingTask, {
                            id: oldId, _deleted: true, is_deleted: true,
                            updatedAt: new Date().toISOString()
                        });
                        _storage().put(_storage().stores().TASKS, ghost);
                        existingTask.id = taskId;
                        window.rbi_tasksData = window.rbi_tasksData.filter(function(t) {
                            return String(t.id) !== String(oldId);
                        });
                        if (!window.rbi_tasksData.some(function(t){ return String(t.id) === String(taskId); })) {
                            window.rbi_tasksData.push(existingTask);
                        }
                    }
                    if (!existingTask.engineerId) existingTask.engineerId = engId;
                    if (force && existingTask.status === 'pending') {
                        if (taskType === 'Аудит') {
                            var deficit = existingTask.target - (existingTask.done || 0);
                            if (deficit > 0) {
                                existingTask.target = deficit + targetCount;
                                existingTask.date = tDate.toISOString();
                            }
                        } else {
                            existingTask.date = tDate.toISOString();
                        }
                    }
                    _touchTaskForSync(existingTask);
                    _storage().put(_storage().stores().TASKS, existingTask);
                    return existingTask;
                }

                var projName = "Все";
                if (contractor !== 'Системная') {
                    var sampleCheck = _allInspections.find(function(c){ return c.inspectorName === eng && c.contractorName === contractor && c.templateKey === tmplKey; });
                    if (sampleCheck) projName = sampleCheck.project_display_name || sampleCheck.projectName || "Все";
                }

                var task = {
                    id: taskId,
                    source: 'ai', type: 'auto', category: cat, icon: icon, taskType: taskType,
                    contractor: contractor, project: projName,
                    project_canonical_key: projName === 'Все' ? '' : projName,
                    project_display_name: projName,
                    engineerName: eng, inspectorName: eng, engineerId: engId,
                    templateKey: tmplKey, workTitle: workTitle,
                    title: title, prompt: prompt,
                    status: 'pending', priorityLvl: lvl, date: tDate.toISOString(),
                    target: targetCount, done: 0, carryOverCount: 0,
                    history: ['[' + new Date().toLocaleDateString('ru-RU') + '] Задача создана системой.'],
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    syncStatus: 'pending',
                    sync_status: 'pending',
                    _deleted: false
                };
                window.rbi_tasksData.push(task);
                _storage().put(_storage().stores().TASKS, task);
                newTasksCount++;
                return task;
            };

            var allMyChecks = _allInspections.filter(function(c){ return c.inspectorName === targetEngineer; });
            var pairMap = {};

            allMyChecks.forEach(function(c) {
                if (c.instanceId === 'etalon' || c.templateKey === 'sys_etalon_act') return;
                var key = c.projectName + '::' + c.contractorName + '::' + c.templateKey;
                if (!pairMap[key]) {
                    pairMap[key] = { project: c.projectName, contractor: c.contractorName, templateKey: c.templateKey, templateTitle: c.templateTitle, checks: [], allTimeCount: 0, checksThisWeek: 0, lastCheckDate: new Date(0) };
                }
                pairMap[key].checks.push(c);
                pairMap[key].allTimeCount++;
                var cDate = new Date(c.date);
                if (cDate > pairMap[key].lastCheckDate) pairMap[key].lastCheckDate = cDate;
                if (cDate >= startOfThisWeek) pairMap[key].checksThisWeek++;
            });

            for (var pkey in pairMap) {
                var pair = pairMap[pkey];

                var hasEtalon = _getEtalonActs().some(function(c){
                    if (typeof window.rbiEtalonMatchesWork === 'function') {
                        return window.rbiEtalonMatchesWork(c, pair.contractor, pair.templateKey, pair.templateTitle, pair.templateTitle);
                    }
                    return c.instanceId === 'etalon' &&
                        c.contractorName === pair.contractor &&
                        (c.templateKey === pair.templateKey || c.templateTitle === pair.templateTitle);
                });
                if (hasEtalon) {
                    // Акт уже оформлен — закрываем висящую задачу по этой паре.
                    window.rbi_tasksData.forEach(function(t) {
                        if (t._deleted || t.is_deleted) return;
                        if (t.engineerName !== targetEngineer) return;
                        if (t.taskType !== 'Эталон' && !(t.title && t.title.indexOf('Эталон') !== -1)) return;
                        if (t.status !== 'pending' && t.status !== 'paused') return;
                        if (t.contractor !== pair.contractor) return;
                        if (t.templateKey !== pair.templateKey) return;
                        t.status = 'done';
                        t.done = 1;
                        t.target = 1;
                        t.resultComment = 'Автозакрытие (Акт-Эталон найден в базе)';
                        t.updatedAt = new Date().toISOString();
                        _storage().put(_storage().stores().TASKS, t);
                    });
                } else {
                    addTask('etalon', 'control', 'Эталон', 'Приемка Эталона', pair.templateTitle, pair.contractor, 'Отсутствует Акт-Эталон. Перед массовым контролям проведите совместную приемку эталонного узла.', 4, now, pair.templateKey, 'Эталон');
                }

                var m = pair.allTimeCount > 0 ? getContractorMetrics(pair.checks, _templates().getUserTemplates()) : null;
                var targetCount = 1;
                var promptText = "🟢 Плановый поддерживающий контроль (Зеленая зона). Подрядчик работает стабильно, достаточно 1 инспекции в неделю.";
                var lvl = 1;
                var deadlineDays = 7;

                if (pair.allTimeCount < 7) {
                    targetCount = 7; deadlineDays = 14;
                    promptText = "🔵 Новый подрядчик (Сбор данных). В базе менее 7 проверок. Необходимо набрать базу для расчета достоверного рейтинга.";
                    lvl = 3;
                } else if (m && (m.finalC < 70 || m.n_изделий_с_B3 > 0)) {
                    targetCount = 5; deadlineDays = 7;
                    promptText = "🔴 Подрядчик в красной зоне (или допустил дефект B3). Требуется усиленный контроль: минимум 5 проверок на этой неделе.";
                    lvl = 4;
                } else if (m && m.finalC >= 70 && m.finalC <= 84) {
                    targetCount = 2; deadlineDays = 7;
                    promptText = "🟡 Подрядчик в желтой зоне (Системный брак). Необходимо провести 2 проверки контроля ранее выданных предписаний.";
                    lvl = 3;
                }

                var daysSinceLastCheck = pair.lastCheckDate.getTime() > 0 ? (now - pair.lastCheckDate) / (1000 * 60 * 60 * 24) : 0;
                if (pair.allTimeCount >= 7 && daysSinceLastCheck > 14) {
                    promptText = '⚠️ ПОДРЯДЧИК ЗАБРОШЕН! Последняя проверка была ' + Math.floor(daysSinceLastCheck) + ' дней назад. Срочно проведите внеплановый аудит.';
                    lvl = 4;
                    targetCount = Math.max(targetCount, 2);
                    deadlineDays = 2;
                }

                var validChecksDone = 0;
                if (targetCount >= 7) {
                    validChecksDone = pair.checks.filter(function(c){ return c.metrics && c.metrics.checkedCount >= 3; }).length;
                } else {
                    validChecksDone = pair.checks.filter(function(c){ return c.metrics && c.metrics.checkedCount >= 3 && new Date(c.date) >= startOfThisWeek; }).length;
                }

                var deficit = targetCount - validChecksDone;
                var activeAuditTask = window.rbi_tasksData.find(function(t){
                    return t.engineerName === targetEngineer && t.contractor === pair.contractor && t.templateKey === pair.templateKey && t.taskType === 'Аудит' && (t.status === 'pending' || t.status === 'paused');
                });

                if (deficit > 0 && !activeAuditTask && targetCount > 0) {
                    var taskDate = new Date(now); taskDate.setDate(now.getDate() + deadlineDays);
                    addTask('aud_multi', 'control', 'Контроль', 'Инспекция: ' + pair.contractor, pair.templateTitle, pair.contractor, promptText, lvl, taskDate, pair.templateKey, 'Аудит', targetCount);
                } else if (deficit > 0 && activeAuditTask && activeAuditTask.target !== targetCount) {
                    activeAuditTask.target = targetCount;
                    activeAuditTask.done = validChecksDone;
                    _touchTaskForSync(activeAuditTask);
                    _storage().put(_storage().stores().TASKS, activeAuditTask);
                } else if (deficit <= 0 && activeAuditTask) {
                    // Проверки за неделю/накопленная база уже закрывают дефицит —
                    // не оставляем висящий pending (как при переходе задача→аудит).
                    activeAuditTask.done = validChecksDone;
                    activeAuditTask.target = targetCount;
                    activeAuditTask.status = 'done';
                    activeAuditTask.resultComment = 'Выполнено (' + validChecksDone + '/' + targetCount + ')';
                    _touchTaskForSync(activeAuditTask);
                    _storage().put(_storage().stores().TASKS, activeAuditTask);
                }

                // Штаб-задачу больше не создаём: критичное B3 уходит в повестку еженедельного совещания.
                if (m && m.n_изделий_с_B3 > 2) {
                    b3AgendaNotes.push(pair.contractor + ': ' + m.n_изделий_с_B3 + '× B3 (' + (pair.templateTitle || pair.templateKey || '') + ')');
                }
            }

            // Воркшоп: повтор одного дефекта на этой и прошлой неделе; max 1 pending на подрядчика.
            var workshopCandidates = _findWorkshopCandidates(targetEngineer, _allInspections, startOfThisWeek);
            workshopCandidates.forEach(function (wc) {
                var hasOpenWorkshop = window.rbi_tasksData.some(function (t) {
                    return !t._deleted && !t.is_deleted &&
                        _taskBelongsTo(t, targetEngRef) &&
                        t.taskType === 'Воркшоп' &&
                        t.contractor === wc.contractor &&
                        (t.status === 'pending' || t.status === 'paused');
                });
                if (hasOpenWorkshop) return;
                addTask(
                    'workshop',
                    'dev',
                    'Развитие',
                    'Воркшоп с бригадой',
                    wc.templateTitle || wc.defectName,
                    wc.contractor,
                    'Дефект «' + wc.defectName + '» повторяется 2 недели подряд. Проведите обучение на объекте.',
                    3,
                    now,
                    wc.templateKey || '',
                    'Воркшоп'
                );
            });

            var _knowSvc1 = (_ctx && _ctx.knowledge) || window.RBI.services.knowledge;
            if (targetEngineer === myName && typeof _knowSvc1.getMagicTwiCandidates === 'function') {
                var magicCandidates = _knowSvc1.getMagicTwiCandidates();
                if (magicCandidates.length > 0) {
                    var existingMagicTask = window.rbi_tasksData.find(function(t){
                        return !t._deleted && _taskBelongsTo(t, targetEngRef) && t.taskType === 'Магия TWI' && t.status === 'pending';
                    });
                    if (existingMagicTask) {
                        existingMagicTask.target = existingMagicTask.done + magicCandidates.length;
                        _storage().put(_storage().stores().TASKS, existingMagicTask);
                    } else {
                        addTask('magic', 'method', 'Развитие', 'Создать карту TWI', 'База Знаний', 'Системная', 'Система нашла пару OK и FAIL. Подключите ИИ и закончите формирование карточки.', 3, now, '', 'Магия TWI', magicCandidates.length);
                    }
                }
            }

            var getNextTargetDate = function(targetDayNumStr) {
                var targetDay = parseInt(targetDayNumStr) === 0 ? 7 : parseInt(targetDayNumStr);
                var d = new Date(now);
                var currentDay = d.getDay() === 0 ? 7 : d.getDay();
                var diff = targetDay - currentDay;
                if (diff < 0) diff += 7;
                d.setDate(d.getDate() + diff);
                d.setHours(12, 0, 0, 0);
                return d;
            };

            var fmeaDate = getNextTargetDate(_getSetting('taskFmeaDay') || '5');
            var recentFmeaChecks = _allInspections.filter(function(c){ return c.inspectorName === targetEngineer && new Date(c.date) >= startOfThisWeek; });
            var defectCounts = {};

            recentFmeaChecks.forEach(function(c) {
                if (c.state) {
                    Object.keys(c.state).forEach(function(id) {
                        if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                            var tType = c.templateKey ? c.templateKey.split('_')[0] : '';
                            var tKey = c.templateKey ? c.templateKey.replace(tType + '_', '') : '';
                            var cl = tType === 'sys' && _templates().getSystemTemplates()[tKey] ? _templates().getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                            var item = getFlatList(cl).find(function(x){ return String(x.id) === String(id); });
                            if (item && (item.w === 3 || item.w === 2 || c.state[id] === 'fail_escalated')) {
                                var dKey = c.contractorName + '_' + item.n;
                                defectCounts[dKey] = (defectCounts[dKey] || 0) + 1;
                            }
                        }
                    });
                }
            });

            var needsFmea = false;
            for (var k in defectCounts) {
                if (defectCounts[k] >= 3) {
                    var isAnalyzed = typeof window.rbi_fmeaRecords !== 'undefined' && window.rbi_fmeaRecords.some(function(f){ return f.author === targetEngineer && f.defects && f.defects.some(function(d){ return d.contractor + '_' + d.defectName === k; }); });
                    if (!isAnalyzed) { needsFmea = true; break; }
                }
            }

            if (needsFmea) addTask('fmea_w', 'method', 'ППР', 'Заполнить FMEA таблицу', 'Аналитика', 'Системная', 'Накопились системные дефекты (>3 повторений), требующие анализа коренных причин.', 3, fmeaDate, '', 'Отчет');

            var posterDate = getNextTargetDate(_getSetting('taskFmeaDay') || '5');
            addTask('post_w', 'report', 'Отчет', 'Распечатать Плакат качества', 'Отчетность', 'Системная', 'Сформируйте плакат А3 и повесьте в штабе подрядчиков.', 2, posterDate, '', 'Отчет');

            var meetingDate = getNextTargetDate(_getSetting('taskMeetingDay') || '1');
            var meetPrompt = 'Откройте вкладку Совещания. Система уже собрала повестку.';
            if (b3AgendaNotes.length > 0) {
                meetPrompt += '\n\n⚠️ Критичное B3 к разбору:\n• ' + b3AgendaNotes.slice(0, 8).join('\n• ');
                if (b3AgendaNotes.length > 8) meetPrompt += '\n• …ещё ' + (b3AgendaNotes.length - 8);
            }
            var meetTask = addTask('meet_w', 'meeting', 'Совещание', 'Еженедельный разбор качества', 'Коммуникация', 'Системная', meetPrompt, 3, meetingDate, '', 'Совещание');
            if (meetTask && b3AgendaNotes.length > 0 && meetTask.status === 'pending') {
                meetTask.prompt = meetPrompt;
                meetTask.priorityLvl = Math.max(meetTask.priorityLvl || 0, 3);
                meetTask.updatedAt = new Date().toISOString();
                _storage().put(_storage().stores().TASKS, meetTask);
            }

            var reportDay = parseInt(_getSetting('taskMonthReportDay') || '1');
            var monthlyReportDate = new Date(now.getFullYear(), now.getMonth(), reportDay, 12, 0, 0, 0);
            if (now > monthlyReportDate) monthlyReportDate.setMonth(monthlyReportDate.getMonth() + 1);
            addTask('op_m', 'report', 'Отчет', 'Ежемесячный One-Pager', 'Отчетность', 'Системная', 'Отправьте руководителю выгрузку Сводного статуса.', 2, monthlyReportDate, '', 'Отчет');

            var skDay1 = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
            var skDay2 = new Date(now.getFullYear(), now.getMonth(), 15, 12, 0, 0, 0);
            var nextSkDate = now < skDay1 ? skDay1 : (now < skDay2 ? skDay2 : new Date(now.getFullYear(), now.getMonth() + 1, 1, 12, 0, 0, 0));
            addTask('sk_imp', 'method', 'ППР', 'Загрузить выгрузку ПК СК', 'Аналитика СК', 'Системная', 'Регулярная сверка: скачайте свежий Excel из Стройконтроля и загрузите в систему.', 2, nextSkDate, '', 'Отчет');

            var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            var qDayDate = new Date(now.getFullYear(), now.getMonth(), daysInMonth - 2, 12, 0, 0, 0);
            if (now > qDayDate) {
                var daysInNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
                qDayDate = new Date(now.getFullYear(), now.getMonth() + 1, daysInNextMonth - 2, 12, 0, 0, 0);
            }
            addTask('qd_m', 'report', 'Отчет', 'Отчет: День Качества', 'Аналитика', 'Системная', 'Приближается дата Дня Качества. Система сгенерирует мега-отчет за месяц.', 3, qDayDate, '', 'Отчет');
        }

        _setWeeklyPlan({ weekId: currentWeekId, tasks: window.rbi_tasksData, completed: false });
        _gameSvc2.saveWeeklyPlan();
        _gameSvc2.updatePlanProgress();

        if (newTasksCount > 0) {
            localStorage.setItem('rbi_cloud_dirty', '1');
            if (_isTasksViewActive()) {
                _patchTasksListDom();
                // новый id в списке — нужен полный render, но со сохранением свёрток
                var uiState = _captureTasksUiState();
                _renderTasksList(true);
                _restoreTasksUiState(uiState);
            } else {
                _renderTasksList();
            }
        }

    } catch (err) {
        console.error("Ошибка при генерации плана:", err);
    } finally {
        window.isPlanGenerating = false;
    }
}

// =========================================================================
// 3. UI РЕНДЕР: вкладка «Задачи»
// =========================================================================

async function _renderTasksList(forceRender) {
    if (typeof forceRender === 'undefined') forceRender = false;
    var container = document.getElementById('rbi-tasks-container');
    if (!container) return;

    var taskDetailsModalEl = document.getElementById('task-details-modal');
    var isTaskModalOpenNow = window.isTaskModalOpen || (taskDetailsModalEl && taskDetailsModalEl.style.display === 'flex');
    if (!forceRender && (window.isSyncing || window.isPlanGenerating || isTaskModalOpenNow)) return;

    var tasksTab = document.getElementById('eng-sub-tasks');
    if (tasksTab && tasksTab.classList.contains('hidden')) return;

    var activeTasks = window.rbi_tasksData;
    var _permSvc3 = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
    var currentRole = _permSvc3 ? _permSvc3.getCurrentRole() : 'guest';
    var currentEng = (document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : null) || 'Инженер';
    var assignedProjects = _permSvc3 ? _permSvc3.getAssignedProjects() : [];

    if (_permSvc3 ? !_permSvc3.canViewWeeklyPlan() : ['guest', 'contractor'].includes(currentRole)) {
        container.innerHTML = '<div class="text-center py-10 bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] text-[var(--text-muted)] font-bold text-[11px] uppercase shadow-sm">План недоступен для вашей роли</div>';
        if (typeof window.__rbiAfterTasksListRender === 'function') {
            try { window.__rbiAfterTasksListRender(); } catch (_e) { /* ignore */ }
        }
        return;
    }

    if (_permSvc3 && _permSvc3.isLeadership()) {
        if (currentRole === 'project_manager' && assignedProjects.length > 0) {
            activeTasks = activeTasks.filter(function(t){
                if (window.RBI && window.RBI.services && window.RBI.services.permissions
                    && typeof window.RBI.services.permissions.isRecordInAssignedProjects === 'function') {
                    return window.RBI.services.permissions.isRecordInAssignedProjects(t, assignedProjects);
                }
                return assignedProjects.includes(t.project_canonical_key || t.project);
            });
        }
    } else {
        activeTasks = activeTasks.filter(function(t){ return (t.engineerName || t.inspectorName) === currentEng || t.contractor === 'Системная'; });
    }

    if (window.selectedCalendarDate) {
        activeTasks = activeTasks.filter(function(t){ return t.date && t.date.split('T')[0] === window.selectedCalendarDate; });
    }

    var allEngsInTasks = Array.from(new Set(activeTasks.map(function(t){ return t.engineerName || t.inspectorName; }).filter(Boolean))).sort();
    var allProjs = Array.from(new Set(activeTasks.map(function(t){ return t.project_canonical_key || t.project || t.projectName; }).filter(Boolean))).sort();
    var allContrs = Array.from(new Set(activeTasks.map(function(t){ return t.contractor || t.contractorName; }).filter(Boolean))).sort();
    var allTypes = Array.from(new Set(activeTasks.map(function(t){ return t.taskType || t.category || t.icon; }).filter(Boolean))).sort();

    if (typeof window.taskEngineerFilter === 'undefined') window.taskEngineerFilter = 'ALL';
    window.taskTypeFilter = window.taskTypeFilter || 'ALL';
    window.taskStatusFilter = window.taskStatusFilter || 'ACTIVE';
    window.taskProjectFilter = window.taskProjectFilter || 'ALL';
    window.taskContractorFilter = window.taskContractorFilter || 'ALL';

    if (window.taskEngineerFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.engineerName || t.inspectorName) === window.taskEngineerFilter; });
    if (window.taskTypeFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.taskType || t.category || t.icon) === window.taskTypeFilter; });
    if (window.taskProjectFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.project_canonical_key || t.project || t.projectName || '') === window.taskProjectFilter; });
    if (window.taskContractorFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.contractor || t.contractorName || '') === window.taskContractorFilter; });

    // Чипы хаба — до статуса, чтобы Архив тоже учитывал тип
    window._rbiTaskHubCategory = window._rbiTaskHubCategory || 'all';
    if (window._rbiTaskHubCategory !== 'all') {
        activeTasks = activeTasks.filter(function(t) {
            return _taskHubCategory(t) === window._rbiTaskHubCategory;
        });
    }

    // Архив всегда из done/blocked (не режется фильтром «Открытые»)
    var archivePool = activeTasks.filter(function(t) {
        return t && (t.status === 'done' || t.status === 'blocked');
    });
    var openPool = activeTasks.filter(function(t) {
        return t && t.status !== 'done' && t.status !== 'blocked';
    });

    var todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    if (window.taskStatusFilter === 'DONE') {
        openPool = [];
        archivePool = archivePool.filter(function(t){ return t.status === 'done'; });
    } else if (window.taskStatusFilter === 'PENDING') {
        openPool = openPool.filter(function(t){ return t.status === 'pending'; });
        archivePool = [];
    } else if (window.taskStatusFilter === 'OVERDUE') {
        openPool = openPool.filter(function(t){ return t.date && new Date(t.date) < todayStart; });
        archivePool = [];
    } else if (window.taskStatusFilter === 'ACTIVE' || !window.taskStatusFilter) {
        // openPool как есть; archivePool остаётся для секции «Архив»
    }
    // ALL — оба пула без доп. среза

    if (window._rbiTaskCriticalOnly) {
        openPool = openPool.filter(function(t) {
            if (t.priorityLvl === 4) return true;
            return !!(t.date && new Date(t.date) < todayStart);
        });
        archivePool = [];
    }

    var sortTasks = function(list) {
        return list.slice().sort(function(a, b) {
            if (b.priorityLvl !== a.priorityLvl) return b.priorityLvl - a.priorityLvl;
            return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        });
    };
    openPool = sortTasks(openPool);
    archivePool = archivePool.slice().sort(function(a, b) {
        return new Date(b.updatedAt || b.date || 0).getTime() - new Date(a.updatedAt || a.date || 0).getTime();
    });
    activeTasks = openPool; // Сегодня / Неделя / Месяц

    var isLeadership = !!(!_permSvc3 ? false : _permSvc3.isLeadership());
    window._rbiTasksFiltersOpen = !!window._rbiTasksFiltersOpen;

    var hubCatActive = window._rbiTaskHubCategory || 'all';
    var chipOn = 'bg-indigo-600 text-white shadow-sm';
    var chipOff = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    var hubChip = function(cat, label) {
        var on = hubCatActive === cat;
        return '<button type="button" onclick="rbi_filterTaskHub(\'' + cat + '\', this)" class="hub-filter-btn px-3 py-1.5 rounded-full text-[10px] font-bold active:scale-95 whitespace-nowrap transition-colors shrink-0 ' +
            (on ? chipOn : chipOff) + '">' + label + '</button>';
    };
    var hubRow =
        '<div class="flex gap-2 overflow-x-auto no-scrollbar pb-1" id="hub-filters">' +
            hubChip('all', 'Все') +
            hubChip('control', 'Аудиты') +
            hubChip('etalon', 'Эталоны') +
            hubChip('meeting', 'Планерки') +
            hubChip('report', 'Отчёты') +
            hubChip('method', 'ППР') +
            hubChip('dev', 'Обучение') +
            hubChip('other', 'Ручные') +
            '<button type="button" id="rbi-critical-only-btn" onclick="rbi_toggleCriticalOnlyFilter(this)" class="px-3 py-1.5 rounded-full text-[10px] font-bold active:scale-95 whitespace-nowrap transition-colors shrink-0 ' +
                (window._rbiTaskCriticalOnly ? 'bg-red-600 text-white shadow-sm' : chipOff + ' text-red-600 dark:text-red-400') +
            '">🔴 Критичные</button>' +
        '</div>';

    var selectsHtml =
        '<div class="grid grid-cols-2 gap-2">' +
            (isLeadership
                ?             '<select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskEngineerFilter=this.value;window._rbiTasksFiltersOpen=true;rbi_renderTasksList(true)">' +
                    '<option value="ALL"' + (window.taskEngineerFilter === 'ALL' ? ' selected' : '') + '>Все инженеры</option>' +
                    allEngsInTasks.map(function(e){
                        return '<option value="' + e.replace(/"/g, '&quot;') + '"' + (window.taskEngineerFilter === e ? ' selected' : '') + '>' + e + '</option>';
                    }).join('') +
                  '</select>'
                : '') +
            '<select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskStatusFilter=this.value;window._rbiTasksFiltersOpen=true;rbi_renderTasksList(true)">' +
                '<option value="ACTIVE"' + (window.taskStatusFilter === 'ACTIVE' ? ' selected' : '') + '>Открытые</option>' +
                '<option value="OVERDUE"' + (window.taskStatusFilter === 'OVERDUE' ? ' selected' : '') + '>Просрочка</option>' +
                '<option value="DONE"' + (window.taskStatusFilter === 'DONE' ? ' selected' : '') + '>Готово</option>' +
                '<option value="ALL"' + (window.taskStatusFilter === 'ALL' ? ' selected' : '') + '>Все статусы</option>' +
            '</select>' +
            '<select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskTypeFilter=this.value;window._rbiTasksFiltersOpen=true;rbi_renderTasksList(true)">' +
                '<option value="ALL"' + (window.taskTypeFilter === 'ALL' ? ' selected' : '') + '>Все типы</option>' +
                allTypes.map(function(t){
                    return '<option value="' + String(t).replace(/"/g, '&quot;') + '"' + (window.taskTypeFilter === t ? ' selected' : '') + '>' + t + '</option>';
                }).join('') +
            '</select>' +
            '<select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskProjectFilter=this.value;window._rbiTasksFiltersOpen=true;rbi_renderTasksList(true)">' +
                '<option value="ALL"' + (window.taskProjectFilter === 'ALL' ? ' selected' : '') + '>Все объекты</option>' +
                allProjs.map(function(p){
                    return '<option value="' + String(p).replace(/"/g, '&quot;') + '"' + (window.taskProjectFilter === p ? ' selected' : '') + '>' + p + '</option>';
                }).join('') +
            '</select>' +
            '<select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)] col-span-2" onchange="window.taskContractorFilter=this.value;window._rbiTasksFiltersOpen=true;rbi_renderTasksList(true)">' +
                '<option value="ALL"' + (window.taskContractorFilter === 'ALL' ? ' selected' : '') + '>Все подрядчики</option>' +
                allContrs.map(function(c){
                    return '<option value="' + String(c).replace(/"/g, '&quot;') + '"' + (window.taskContractorFilter === c ? ' selected' : '') + '>' + c + '</option>';
                }).join('') +
            '</select>' +
        '</div>';

    var filtersActive = !!(hubCatActive !== 'all' || window._rbiTaskCriticalOnly ||
        window.taskEngineerFilter !== 'ALL' || window.taskTypeFilter !== 'ALL' ||
        window.taskProjectFilter !== 'ALL' || window.taskContractorFilter !== 'ALL' ||
        window.taskStatusFilter !== 'ACTIVE');
    var filterHint = [];
    if (hubCatActive !== 'all') filterHint.push(hubCatActive === 'control' ? 'Аудиты' : hubCatActive === 'etalon' ? 'Эталоны' : hubCatActive === 'meeting' ? 'Планерки' : hubCatActive === 'report' ? 'Отчёты' : hubCatActive === 'method' ? 'ППР' : hubCatActive === 'dev' ? 'Обучение' : hubCatActive === 'other' ? 'Ручные' : 'Фильтр');
    if (window._rbiTaskCriticalOnly) filterHint.push('Критичные');
    if (window.taskStatusFilter !== 'ACTIVE') filterHint.push(window.taskStatusFilter === 'OVERDUE' ? 'Просрочка' : window.taskStatusFilter === 'DONE' ? 'Готово' : 'Все статусы');
    if (window.taskEngineerFilter !== 'ALL') filterHint.push(window.taskEngineerFilter);
    if (window.taskContractorFilter !== 'ALL') filterHint.push(window.taskContractorFilter);
    var filterSummary = filtersActive
        ? (filterHint.slice(0, 2).join(' · ') + (filterHint.length > 2 ? ' +' + (filterHint.length - 2) : ''))
        : 'Тип, статус, объект, подрядчик';

    var filtersHtml =
        '<details class="mb-3 group/filters bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden"' +
            (window._rbiTasksFiltersOpen ? ' open' : '') +
            ' ontoggle="if(document.contains(this)) window._rbiTasksFiltersOpen=this.open">' +
            '<summary class="cursor-pointer select-none flex items-center gap-2 px-3 py-2.5 active:bg-[var(--hover-bg)] transition-colors">' +
                '<div class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0 text-slate-500">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M6 12h12M10 20h4"/></svg>' +
                '</div>' +
                '<div class="min-w-0 flex-1">' +
                    '<div class="text-[11px] font-black uppercase tracking-wide text-slate-800 dark:text-white flex items-center gap-1.5">' +
                        'Фильтры' +
                        (filtersActive ? '<span class="inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-black">' + filterHint.length + '</span>' : '') +
                    '</div>' +
                    '<div class="text-[9px] font-bold text-[var(--text-muted)] truncate">' + filterSummary + '</div>' +
                '</div>' +
                '<span class="text-slate-400 text-[12px] transition-transform group-open/filters:rotate-180 shrink-0">▾</span>' +
            '</summary>' +
            '<div class="border-t border-[var(--card-border)] px-3 py-3 space-y-3 bg-[var(--hover-bg)]/30">' +
                hubRow +
                selectsHtml +
            '</div>' +
        '</details>';

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var _gameSvc3 = (_ctx && _ctx.game) || window.RBI.services.game;
    var startW = _gameSvc3.getStartOfWeek(today);
    var endW = new Date(startW); endW.setDate(startW.getDate() + 6); endW.setHours(23, 59, 59, 999);

    var weekNumEl = document.getElementById('rbi-week-number');
    var weekDatesEl = document.getElementById('rbi-week-dates');
    if (weekNumEl) weekNumEl.innerText = getWeekNumber(today);
    if (weekDatesEl) weekDatesEl.innerText = startW.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' — ' + endW.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

    var globalActionsHtml =
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">' +
            '<button onclick="gameForceUpdatePlan()" class="bg-[var(--card-bg)] text-slate-700 dark:text-slate-200 border border-[var(--card-border)] py-2.5 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm">Синхронизировать</button>' +
            '<button onclick="rbi_openTaskModal()" class="bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm">Поручение</button>' +
            '<button onclick="rbi_openCalendarModal()" class="bg-[var(--card-bg)] text-slate-700 dark:text-slate-200 border border-[var(--card-border)] py-2.5 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm">Календарь</button>' +
            '<button onclick="window.RBI.services.game.toggleAbsence()" class="bg-[var(--card-bg)] text-slate-700 dark:text-slate-200 border border-[var(--card-border)] py-2.5 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm">Отпуск</button>' +
        '</div>';

    var _engineerAbsence = _getEngineerAbsence();
    if (_engineerAbsence.isActive) {
        container.innerHTML = globalActionsHtml + '<div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 text-center text-slate-600 shadow-sm"><div class="font-black uppercase mb-1">Режим: ' + _engineerAbsence.reason + '</div>Инспекции приостановлены.</div>';
        if (typeof window.__rbiAfterTasksListRender === 'function') {
            try { window.__rbiAfterTasksListRender(); } catch (_e) { /* ignore */ }
        }
        return;
    }

    var overdue = [], todayTasks = [], weekTasks = [], monthTasks = [];
    var archiveTasks = archivePool;
    var weekTotal = 0, weekDone = 0;
    window.rbiCalendarDates = {};

    archiveTasks.forEach(function(t) {
        var tDt = t.date ? new Date(t.date) : new Date(); tDt.setHours(0, 0, 0, 0);
        if (t.status === 'done' && tDt.getTime() >= startW.getTime() && tDt.getTime() <= endW.getTime()) {
            weekTotal++;
            weekDone++;
        }
    });

    activeTasks.forEach(function(t) {
        weekTotal++;
        if (t.status === 'paused') { monthTasks.push(t); return; }
        if (t.type === 'manual' && t.urgency) {
            if (t.urgency === 'planned') { weekTasks.push(t); return; }
            if (t.urgency === 'future') { monthTasks.push(t); return; }
        }
        if (!t.date) { weekTasks.push(t); return; }
        var tDt2 = new Date(t.date); tDt2.setHours(0,0,0,0);
        if (tDt2.getTime() < today.getTime()) { overdue.push(t); }
        else if (tDt2.getTime() === today.getTime()) { todayTasks.push(t); }
        else if (tDt2.getTime() <= endW.getTime()) { weekTasks.push(t); }
        else { monthTasks.push(t); }
    });

    var openNow = overdue.length + todayTasks.length + weekTasks.length + monthTasks.length;
    var progText = document.getElementById('rbi-tasks-progress-text');
    var progBar = document.getElementById('rbi-tasks-progress-bar');
    if (progText) progText.innerText = weekDone + '/' + weekTotal;
    if (progBar) progBar.style.width = weekTotal > 0 ? ((weekDone / weekTotal) * 100) + '%' : '0%';
    var openEl = document.getElementById('rbi-tasks-open');
    var overdueEl = document.getElementById('rbi-tasks-overdue');
    var closedEl = document.getElementById('rbi-tasks-closed-week');
    if (openEl) openEl.textContent = String(openNow);
    if (overdueEl) overdueEl.textContent = String(overdue.length);
    if (closedEl) closedEl.textContent = String(weekDone);

    var typeBadgeClass = function(typeKey) {
        var k = String(typeKey || '').toLowerCase();
        if (k.indexOf('эталон') !== -1) return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300';
        if (k.indexOf('аудит') !== -1 || k.indexOf('контроль') !== -1) return 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300';
        if (k.indexOf('воркшоп') !== -1 || k.indexOf('обуч') !== -1) return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300';
        if (k.indexOf('совещ') !== -1 || k.indexOf('планер') !== -1) return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-300';
        if (k.indexOf('отчёт') !== -1 || k.indexOf('отчет') !== -1) return 'text-violet-600 bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900 dark:text-violet-300';
        return 'text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
    };

    var renderCard = function(t, isOverdue, isArchive, nested) {
        if (typeof isArchive === 'undefined') isArchive = false;
        if (typeof nested === 'undefined') nested = false;
        var itemCategory = t.taskType === 'Эталон' ? 'etalon' : (t.category || 'other');
        var icon = t.icon ? (RBI_TASK_ICONS[t.icon] || RBI_TASK_ICONS['Контроль']) : RBI_TASK_ICONS['Контроль'];
        var dateStr = t.date ? new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Без даты';
        var borderClass = isOverdue ? 'border-red-300 dark:border-red-800' : 'border-[var(--card-border)]';
        var bgClass = isOverdue && !isArchive ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-[var(--hover-bg)]';
        var opacityClass = isArchive ? 'opacity-60' : '';
        var titleMain = nested
            ? (t.taskType || t.title || 'Задача')
            : (t.contractor || t.title || 'Задача');
        var titleSub = nested
            ? (t.workTitle || t.templateTitle || t.title || '')
            : (t.workTitle || t.templateTitle || t.taskType || '');
        var progressHtml = (t.target > 1)
            ? '<span data-task-progress="1" class="text-[8px] sm:text-[9px] font-black text-indigo-600 tabular-nums">' + (t.done || 0) + '/' + t.target + '</span>'
            : '';
        var isCriticalCard = (isOverdue && !isArchive) || t.priorityLvl === 4;
        var safeTaskIdAttr = String(t.id).replace(/"/g, '');
        return '<div data-task-id="' + safeTaskIdAttr + '" data-category="' + itemCategory + '"' + (isCriticalCard ? ' data-critical="1"' : '') +
            ' onclick="event.stopPropagation();rbi_openTaskAction(\'' + String(t.id).replace(/'/g, "\\'") + '\')" class="task-card-item cursor-pointer ' + bgClass +
            ' border ' + borderClass + ' rounded-xl p-2.5 relative shadow-sm active:scale-[0.98] transition-transform ' + opacityClass + '">' +
            '<div class="flex gap-2 items-start">' +
                '<div class="w-8 h-8 rounded-lg bg-[var(--card-bg)] text-slate-500 flex items-center justify-center border border-[var(--card-border)] shrink-0">' + icon + '</div>' +
                '<div class="min-w-0 flex-1">' +
                    '<div class="text-[11px] font-black text-slate-800 dark:text-white leading-snug truncate">' + titleMain + '</div>' +
                    (titleSub ? '<div class="text-[8px] sm:text-[9px] font-bold text-[var(--text-muted)] truncate">' + titleSub + '</div>' : '') +
                    (t.prompt ? '<div class="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">' + t.prompt + '</div>' : '') +
                    '<div class="mt-1.5 flex items-center justify-between gap-2">' +
                        '<span class="text-[8px] sm:text-[9px] font-black uppercase ' + (isOverdue && !isArchive ? 'text-red-500' : 'text-slate-400') + '">' +
                            (isOverdue && !isArchive ? 'Просрочено · ' : '') + dateStr +
                        '</span>' + progressHtml +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    };

    var _renderContractorGroups = function(tasks, isOverdueFn, sectionKey) {
        if (!tasks || tasks.length === 0) return '';

        var groups = {};
        var order = [];
        tasks.forEach(function(t) {
            var name = t.contractor || 'Без подрядчика';
            if (!groups[name]) {
                groups[name] = { name: name, entries: [], hasCritical: false, overdueCount: 0, criticalCount: 0 };
                order.push(name);
            }
            var isOverdueTask = !!(isOverdueFn && isOverdueFn(t));
            var g = groups[name];
            if (t.priorityLvl === 4 || isOverdueTask) g.hasCritical = true;
            if (isOverdueTask) g.overdueCount++;
            if (t.priorityLvl === 4) g.criticalCount++;
            g.entries.push({ task: t, isOverdue: isOverdueTask });
        });

        var workGroups = [];
        var weeklyGroups = [];
        order.forEach(function(name) {
            var g = groups[name];
            if (name === 'Системная') weeklyGroups.push(g);
            else workGroups.push(g);
        });
        var sortFn = function(a, b) {
            if (a.hasCritical !== b.hasCritical) return a.hasCritical ? -1 : 1;
            if (b.entries.length !== a.entries.length) return b.entries.length - a.entries.length;
            return a.name.localeCompare(b.name, 'ru');
        };
        workGroups.sort(sortFn);
        weeklyGroups.sort(sortFn);

        var renderGroup = function(g, weekly) {
            var slug = g.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_').replace(/^_+|_+$/g, '') || 'contractor';
            var groupKey = sectionKey + '__' + slug;
            var title = weekly ? 'Еженедельные' : (g.name === 'Поручение' ? 'Поручения' : g.name);
            var typeCounts = {};
            var workTitles = {};
            g.entries.forEach(function(e) {
                var k = e.task.taskType || e.task.title || 'Задача';
                typeCounts[k] = (typeCounts[k] || 0) + 1;
                var wt = e.task.workTitle || e.task.templateTitle || '';
                if (wt) workTitles[wt] = true;
            });
            var typeKeys = Object.keys(typeCounts);
            var workBrief = Object.keys(workTitles).slice(0, 2).join(' · ') || typeKeys.slice(0, 2).join(' · ');
            var badgesHtml = typeKeys.slice(0, 4).map(function(k) {
                return '<span class="text-[7px] sm:text-[8px] font-black border px-1 rounded tabular-nums ' + typeBadgeClass(k) + '">' +
                    k + (typeCounts[k] > 1 ? ':' + typeCounts[k] : '') + '</span>';
            }).join('');
            var borderClass = g.hasCritical ? 'border-red-300 dark:border-red-800' : 'border-[var(--card-border)]';
            var countColor = g.hasCritical ? 'text-red-600 dark:text-red-400' : (weekly ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white');
            var cardsHtml = g.entries.map(function(e){ return renderCard(e.task, e.isOverdue, false, true); }).join('');
            return '<details data-task-group="' + groupKey + '" class="group/contractor relative bg-[var(--card-bg)] border ' + borderClass +
                ' rounded-xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">' +
                '<summary class="relative p-2.5 sm:p-3 cursor-pointer select-none active:scale-[0.98] transition-transform list-none">' +
                    (weekly
                        ? '<div class="absolute top-0 right-0 z-[1] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase leading-none">Регламент</div>'
                        : (g.hasCritical
                            ? '<div class="absolute top-0 right-0 z-[1] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase leading-none">Крит.</div>'
                            : '')) +
                    '<div class="min-w-0">' +
                        '<div class="text-[10px] sm:text-[11px] font-black leading-snug mb-0.5 pr-10 line-clamp-2 break-words ' +
                            (weekly ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-white') + '">' + title + '</div>' +
                        '<div class="text-[8px] sm:text-[9px] font-bold text-[var(--text-muted)] truncate mb-2">' + workBrief + '</div>' +
                        '<div class="flex items-end justify-between gap-2 mb-2">' +
                            '<div class="min-w-0">' +
                                '<div class="text-[7px] sm:text-[8px] uppercase text-slate-400 font-bold">Задач</div>' +
                                '<div data-group-count="1" class="text-xl sm:text-2xl font-black leading-none tabular-nums ' + countColor + '">' + g.entries.length + '</div>' +
                            '</div>' +
                            '<div class="text-right shrink-0">' +
                                (g.overdueCount
                                    ? '<div class="text-[8px] font-black text-red-500 tabular-nums">Проср. ' + g.overdueCount + '</div>'
                                    : '<div class="text-[8px] font-bold text-slate-400">В срок</div>') +
                                '<div class="text-[8px] text-slate-400 font-bold mt-0.5 transition-transform group-open/contractor:rotate-180">▾</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="flex flex-wrap justify-between items-center gap-1 bg-[var(--hover-bg)] rounded-md px-1.5 py-1.5 border border-[var(--card-border)]">' +
                            '<div class="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase shrink-0">Типы</div>' +
                            '<div class="flex flex-wrap justify-end gap-0.5 min-w-0">' + badgesHtml + '</div>' +
                        '</div>' +
                    '</div>' +
                '</summary>' +
                '<div class="border-t border-[var(--card-border)] p-2 space-y-2 bg-[var(--hover-bg)]/40">' + cardsHtml + '</div>' +
            '</details>';
        };

        var html = '<div class="grid grid-cols-2 md:grid-cols-3 gap-3">';
        workGroups.forEach(function(g) { html += renderGroup(g, false); });
        html += '</div>';
        if (weeklyGroups.length) {
            html += '<div class="mt-3">' +
                '<div class="text-[10px] font-black uppercase tracking-wide text-indigo-500/90 mb-2 px-0.5">Регламент</div>' +
                '<div class="grid grid-cols-2 md:grid-cols-3 gap-3">';
            weeklyGroups.forEach(function(g) { html += renderGroup(g, true); });
            html += '</div></div>';
        }
        return html;
    };

    var sectionBlock = function(key, title, tasks, openDefault, isOverdueFn, bodyHtml, countOverride) {
        if (!tasks.length && !bodyHtml) return '';
        var count = (typeof countOverride === 'number') ? countOverride : tasks.length;
        var body = bodyHtml || _renderContractorGroups(tasks, isOverdueFn, key);
        return '<details data-task-section="' + key + '" class="group/section mb-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden"' +
            (openDefault ? ' open' : '') + '>' +
            '<summary class="cursor-pointer select-none flex items-center justify-between gap-2 px-3 py-2.5 active:bg-[var(--hover-bg)] transition-colors">' +
                '<span class="text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">' + title +
                    ' <span class="text-slate-400 font-bold normal-case tabular-nums">' + count + '</span></span>' +
                '<span class="text-slate-400 text-[12px] transition-transform group-open/section:rotate-180 shrink-0">▾</span>' +
            '</summary>' +
            '<div class="border-t border-[var(--card-border)] px-2.5 py-2.5 bg-[var(--hover-bg)]/20">' + body + '</div>' +
        '</details>';
    };

    var accordionsHtml = '';
    var focusTasks = overdue.concat(todayTasks);
    // Без фильтра — открыто «Сегодня». С фильтром — все непустые секции, иначе результат «прячется» в свёртке.
    var openToday = filtersActive ? focusTasks.length > 0 : true;
    var openWeek = filtersActive && weekTasks.length > 0;
    var openMonth = filtersActive && monthTasks.length > 0;
    var openArchive = filtersActive && archiveTasks.length > 0;

    if (focusTasks.length) {
        accordionsHtml += sectionBlock('today', 'Сегодня', focusTasks, openToday, function(t){ return overdue.indexOf(t) !== -1; });
    } else if (!filtersActive) {
        accordionsHtml += sectionBlock('today', 'Сегодня', [], true, null,
            '<div class="text-center py-4 text-[10px] font-bold uppercase text-slate-400">На сегодня задач нет</div>');
    }
    if (weekTasks.length) {
        accordionsHtml += sectionBlock('week', 'На этой неделе', weekTasks, openWeek, function(){ return false; });
    }
    if (monthTasks.length) {
        accordionsHtml += sectionBlock('month', 'В этом месяце', monthTasks, openMonth, function(){ return false; });
    }
    // Архив — всегда внизу (свёрнут), даже при фильтре «Открытые»
    if (archiveTasks.length) {
        var recentArchive = archiveTasks.slice(0, 30);
        accordionsHtml += sectionBlock('archive', 'Архив', recentArchive, openArchive, null,
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
                recentArchive.map(function(t){ return renderCard(t, false, true, false); }).join('') +
            '</div>', archiveTasks.length);
    } else if (!filtersActive || window.taskStatusFilter === 'DONE') {
        accordionsHtml += sectionBlock('archive', 'Архив', [], false, null,
            '<div class="text-center py-4 text-[10px] font-bold uppercase text-slate-400">Выполненных задач пока нет</div>', 0);
    }

    if (!focusTasks.length && !weekTasks.length && !monthTasks.length && !archiveTasks.length) {
        container.innerHTML = globalActionsHtml + filtersHtml +
            '<div class="text-center py-6 text-slate-400 font-bold text-[11px] uppercase bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">' +
            'Нет задач в этой категории</div>';
        if (typeof window.__rbiAfterTasksListRender === 'function') {
            try { window.__rbiAfterTasksListRender(); } catch (_e) { /* ignore */ }
        }
        return;
    }

    container.innerHTML = globalActionsHtml + filtersHtml + accordionsHtml;
    if (typeof window.__rbiAfterTasksListRender === 'function') {
        try { window.__rbiAfterTasksListRender(); } catch (_e) { /* ignore */ }
    }
}

// =========================================================================
// 4. ФИЛЬТР ХАБ
// =========================================================================

function _captureTasksUiState() {
    var container = document.getElementById('rbi-tasks-container');
    var openSections = {};
    var openGroups = {};
    if (container) {
        container.querySelectorAll('details[data-task-section]').forEach(function (el) {
            openSections[el.getAttribute('data-task-section')] = !!el.open;
        });
        container.querySelectorAll('details[data-task-group]').forEach(function (el) {
            openGroups[el.getAttribute('data-task-group')] = !!el.open;
        });
    }
    var hubCategory = window._rbiTaskHubCategory || 'all';
    var hubBtn = document.querySelector('#hub-filters .hub-filter-btn.bg-indigo-600');
    if (hubBtn && hubBtn.getAttribute('onclick')) {
        var m = hubBtn.getAttribute('onclick').match(/rbi_filterTaskHub\('([^']+)'/);
        if (m) hubCategory = m[1];
    }
    return {
        openSections: openSections,
        openGroups: openGroups,
        hubCategory: hubCategory,
        scrollY: window.scrollY || window.pageYOffset || 0
    };
}

function _restoreTasksUiState(state) {
    if (!state) return;
    var container = document.getElementById('rbi-tasks-container');
    if (container && state.openSections) {
        container.querySelectorAll('details[data-task-section]').forEach(function (el) {
            var key = el.getAttribute('data-task-section');
            if (Object.prototype.hasOwnProperty.call(state.openSections, key)) {
                el.open = !!state.openSections[key];
            }
        });
    }
    if (container && state.openGroups) {
        container.querySelectorAll('details[data-task-group]').forEach(function (el) {
            var key = el.getAttribute('data-task-group');
            if (Object.prototype.hasOwnProperty.call(state.openGroups, key)) {
                el.open = !!state.openGroups[key];
            }
        });
    }
    if (state.hubCategory) {
        window._rbiTaskHubCategory = state.hubCategory;
    }
    if (typeof state.scrollY === 'number') {
        var htmlEl = document.documentElement;
        var prev = htmlEl.style.scrollBehavior;
        htmlEl.style.scrollBehavior = 'auto';
        window.scrollTo(0, state.scrollY);
        htmlEl.style.scrollBehavior = prev;
    }
}

function _isTasksViewActive() {
    if (typeof window.shouldDeferFullRender === 'function' || (window.RBI && window.RBI.utils && window.RBI.utils.syncUi)) {
        var syncUi = window.RBI && window.RBI.utils && window.RBI.utils.syncUi;
        if (syncUi && typeof syncUi.isViewActive === 'function') {
            return syncUi.isViewActive('tasks');
        }
    }
    var engTab = document.getElementById('tab-engineer');
    var tasksSub = document.getElementById('eng-sub-tasks');
    if (engTab && engTab.classList.contains('active')) {
        return !!(tasksSub && !tasksSub.classList.contains('hidden'));
    }
    return false;
}

/** Компактная сигнатура списка — чтобы не full-render'ить Задачи на каждом sync. */
function _tasksListSignature() {
    return (window.rbi_tasksData || [])
        .filter(function (t) { return t && !t._deleted && !t.is_deleted; })
        .map(function (t) {
            return [t.id, t.status, t.done, t.target, t.updatedAt || t.updated_at || ''].join(':');
        })
        .join('|');
}

/** Состав списка (без цифр прогресса) — если тот же, после sync только patch DOM. */
function _tasksStructureSignature() {
    return (window.rbi_tasksData || [])
        .filter(function (t) { return t && !t._deleted && !t.is_deleted; })
        .map(function (t) { return String(t.id) + ':' + (t.status || ''); })
        .sort()
        .join('|');
}

/** Точечно обновить цифры на карточках и в шапке — без innerHTML и сброса свёрток. */
function _patchTasksListDom() {
    var container = document.getElementById('rbi-tasks-container');
    if (!container) return false;
    var patched = 0;
    (window.rbi_tasksData || []).forEach(function (t) {
        if (!t || t._deleted || t.is_deleted) return;
        var id = String(t.id || '');
        if (!id) return;
        var card = null;
        try {
            card = container.querySelector('[data-task-id="' + id.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        } catch (e) {
            card = null;
        }
        if (!card) return;
        var prog = card.querySelector('[data-task-progress]');
        if (prog && t.target > 1) {
            prog.textContent = (t.done || 0) + '/' + t.target;
            patched++;
        }
    });
    // Шапка: лёгкий пересчёт по текущим данным (без пересборки списка)
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var _gameSvc = (_ctx && _ctx.game) || (window.RBI && window.RBI.services && window.RBI.services.game);
    var startW = _gameSvc && _gameSvc.getStartOfWeek ? _gameSvc.getStartOfWeek(today) : today;
    var endW = new Date(startW); endW.setDate(startW.getDate() + 6); endW.setHours(23, 59, 59, 999);
    var openN = 0, overdueN = 0, closedN = 0, weekTotal = 0;
    (window.rbi_tasksData || []).forEach(function (t) {
        if (!t || t._deleted || t.is_deleted) return;
        if (t.status === 'done' || t.status === 'blocked') {
            var d = t.date ? new Date(t.date) : new Date(t.updatedAt || 0);
            d.setHours(0, 0, 0, 0);
            if (t.status === 'done' && d >= startW && d <= endW) { closedN++; weekTotal++; }
            return;
        }
        openN++;
        weekTotal++;
        if (t.date) {
            var td = new Date(t.date); td.setHours(0, 0, 0, 0);
            if (td < today) overdueN++;
        }
    });
    var progText = document.getElementById('rbi-tasks-progress-text');
    var progBar = document.getElementById('rbi-tasks-progress-bar');
    if (progText) progText.innerText = closedN + '/' + weekTotal;
    if (progBar) progBar.style.width = weekTotal > 0 ? ((closedN / weekTotal) * 100) + '%' : '0%';
    var openEl = document.getElementById('rbi-tasks-open');
    var overdueEl = document.getElementById('rbi-tasks-overdue');
    var closedEl = document.getElementById('rbi-tasks-closed-week');
    if (openEl) openEl.textContent = String(openN);
    if (overdueEl) overdueEl.textContent = String(overdueN);
    if (closedEl) closedEl.textContent = String(closedN);
    return patched >= 0;
}

function _filterTaskHub(category, btnElement) {
    window._rbiTaskHubCategory = category || 'all';
    window._rbiTasksFiltersOpen = true;
    _renderTasksList(true);
}

function _toggleCriticalOnlyFilter(btnElement) {
    window._rbiTaskCriticalOnly = !window._rbiTaskCriticalOnly;
    window._rbiTasksFiltersOpen = true;
    _renderTasksList(true);
}

// =========================================================================
// 5. ДЕТАЛИЗАЦИЯ И УПРАВЛЕНИЕ СТАТУСАМИ
// =========================================================================

async function _openTaskAction(taskId) {
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (!task) return;

    currentTaskContext = task;
    document.getElementById('task-details-header-title').innerHTML = '\n        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2"></path></svg>\n        Детали Задачи\n    ';

    var body = document.getElementById('task-details-body');
    var footer = document.getElementById('task-details-footer');

    var logicTitle = "", logicColor = "", logicDesc = "";
    if (task.taskType === 'Эталон') {
        logicTitle = "Новый вид работ / Подрядчик"; logicColor = "text-blue-600 bg-blue-50 border-blue-200";
        logicDesc = "Перед началом массового контроля требуется провести совместную приемку и зафиксировать эталонный образец работ.";
    } else if (task.priorityLvl === 4) {
        logicTitle = "Красная зона (Высокий риск)"; logicColor = "text-red-600 bg-red-50 border-red-200";
        logicDesc = "Подрядчик допускает много брака или недавно совершил критический дефект (B3). Требуется жесткий контроль и остановка приемки.";
    } else if (task.priorityLvl === 3 && task.taskType === 'Аудит') {
        logicTitle = "Сбор данных (Новичок)"; logicColor = "text-indigo-600 bg-indigo-50 border-indigo-200";
        logicDesc = "В базе менее 7 проверок по этому подрядчику. Необходимо набрать базу для расчета достоверного рейтинга надежности.";
    } else if (task.priorityLvl === 2) {
        logicTitle = "Желтая зона (Нестабильно)"; logicColor = "text-orange-600 bg-orange-50 border-orange-200";
        logicDesc = "Выявлен систематический брак категории B2. Качество нестабильно. Требуется усиление операционного контроля.";
    } else if (task.priorityLvl === 1) {
        logicTitle = "Зеленая зона (Стабильно)"; logicColor = "text-green-600 bg-green-50 border-green-200";
        logicDesc = "Высокое качество работ (УрК > 85%). Назначен плановый профилактический осмотр.";
    } else {
        logicTitle = "Системная задача"; logicColor = "text-slate-600 bg-slate-100 border-slate-300";
        logicDesc = "Регламентное мероприятие (Отчетность, Совещание, База Знаний).";
    }

    var safeContractor  = (task.contractor || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    var safeStatusKeyForHtml = (task.statusKey || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    var safeProject     = (task.project || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    var safeWorkTitle   = (task.workTitle || task.templateTitle || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

    body.innerHTML = '\n        <div class="mb-4">\n            <div class="text-[16px] font-black text-slate-800 dark:text-white leading-tight mb-1">' + (task.contractor || 'Без подрядчика') + '</div>\n            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-widest">' + (task.templateTitle || task.workTitle || task.taskType || 'Поручение') + '</div>\n        </div>\n        <div class="bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-2xl p-4 mb-4 shadow-sm">\n            <div class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Суть задачи</div>\n            <div class="text-[12px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">' + (task.prompt || 'Описание отсутствует') + '</div>\n        </div>\n        <div class="flex gap-2 mb-4">\n            <div class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm text-center">\n                <div class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Прогресс</div>\n                <div class="text-[16px] font-black text-slate-800 dark:text-white"><span class="' + ((task.done || 0) >= (task.target || 1) ? 'text-green-500' : 'text-indigo-600') + '">' + (task.done || 0) + '</span> из ' + (task.target || 1) + '</div>\n            </div>\n            <div class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm text-center">\n                <div class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Дедлайн</div>\n                <div class="text-[16px] font-black ' + (new Date(task.date) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-slate-800 dark:text-white') + '">' + (task.date ? new Date(task.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Без срока') + '</div>\n            </div>\n        </div>\n        ' + (task.type === 'manual' ? '' : '<div class="border border-[var(--card-border)] bg-[var(--card-bg)] rounded-2xl p-4 mb-2 shadow-sm"><div class="text-[10px] font-black px-2 py-1 rounded border uppercase w-fit mb-2 ' + logicColor + '">' + logicTitle + '</div><div class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">' + logicDesc + '</div></div>') + '\n    ';

    var actionButtonsHtml = '';

    if (task.status !== 'pending') {
        var historyHtml = task.history ? '<div class="text-[10px] text-slate-500 mt-2 text-left bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-24 overflow-y-auto font-medium">' + task.history.join('<br>') + '</div>' : '';
        actionButtonsHtml = '\n            <div class="text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-2 text-center w-full uppercase tracking-widest">Статус: <span class="' + (task.status === 'done' ? 'text-green-600' : 'text-orange-500') + '">' + task.status + '</span></div>\n            <div class="text-[10px] text-slate-500 text-center mb-3">' + (task.resultComment || '') + '</div>\n            ' + historyHtml + '\n            <button onclick="rbi_resumeTask(\'' + task.id + '\')" class="w-full mt-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform border border-slate-300 dark:border-slate-600 shadow-sm flex justify-center items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Возобновить задачу</button>\n        ';
    } else {
        if (task.type === 'manual') {
            var photoPreviewHtml = task.completionPhoto
                ? '<div class="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm"><img ' + ((typeof window.rbiBuildPhotoImgAttrs === 'function') ? window.rbiBuildPhotoImgAttrs(task.completionPhoto, { preferThumb: true }) : ('src="' + window.getPhotoSrc(task.completionPhoto) + '"')) + ' class="w-full h-full object-cover"></div>'
                : '<div id="task-photo-preview" class="hidden mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div>';
            actionButtonsHtml += '\n                <div class="mb-3"><button onclick="document.getElementById(\'task-photo-upload\').click(); window.currentTaskPhotoId=\'' + task.id + '\';" class="w-full bg-indigo-50 dark:bg-slate-800 border border-dashed border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg> Прикрепить фото (Опционально)</button>' + photoPreviewHtml + '</div>\n                <button onclick="rbi_markTaskDone(\'' + task.id + '\');" class="w-full bg-green-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Отметить выполненной</button>';
        } else if (task.taskType === 'ППР') {
            actionButtonsHtml += '<div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-xl mb-3 text-center"><div class="text-[10px] font-black text-blue-700 uppercase mb-2">Проверка нормативной базы</div><button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); rbi_markTaskDone(\'' + task.id + '\', true); if (window.AppRouter) AppRouter.navigate(\'#/quality/reference/docs\'); setTimeout(() => { const s = document.getElementById(\'doc-search-input\'); if(s) {s.value=\'' + safeWorkTitle + '\'; window.RBI.services.knowledge.renderDocsList();} }, 300);" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Открыть базу НД</button></div>';
        } else if (task.taskType === 'Инструктаж') {
            actionButtonsHtml += '<div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-xl mb-3"><div class="flex justify-between items-center mb-2"><div class="text-[10px] font-black text-blue-700 uppercase">Подготовка материалов</div><button onclick="rbi_generateIntroBriefing(\'' + task.id + '\')" id="btn-gen-intro" class="bg-blue-600 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Собрать базу (AI)</button></div><div id="intro-result-box" class="hidden"><div class="text-[10px] text-blue-800 dark:text-blue-300 mb-2 font-medium">Система сформировала речь, собрала допуски и подтянула TWI-карты.</div><div class="flex gap-2 mb-2"><button onclick="rbi_printIntroBriefing(\'' + task.id + '\')" class="w-1/2 bg-white text-blue-700 border border-blue-200 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> В PDF</button><button onclick="rbi_markTaskDone(\'' + task.id + '\');" class="w-1/2 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Проведено</button></div></div></div>';
        } else if (task.taskType === 'Финал') {
            actionButtonsHtml += '<div class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-3 rounded-xl mb-3"><div class="flex justify-between items-center mb-2"><div class="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Справка для КС-2</div><button onclick="rbi_generateFinalAcceptance(\'' + task.id + '\')" id="btn-gen-final" class="bg-slate-700 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Анализ (AI)</button></div><div id="final-result-box" class="hidden"><textarea id="final-ai-text" class="w-full h-40 text-[11px] p-2 rounded-lg border border-slate-300 dark:border-slate-600 resize-none outline-none leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-slate-900 shadow-inner mb-2" placeholder="Здесь будет справка..."></textarea><div class="flex gap-2"><button onclick="rbi_printFinalAcceptance(\'' + task.id + '\')" class="w-1/2 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-500 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Скачать</button><button onclick="rbi_saveFinalAndClose(\'' + task.id + '\')" class="w-1/2 bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> Сохранить</button></div></div></div>';
        } else if (task.taskType === 'Воркшоп') {
            actionButtonsHtml += '<div class="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-3 rounded-xl mb-3"><div class="flex justify-between items-center mb-2"><div class="text-[10px] font-black text-purple-700 uppercase">AI-Сценарий Воркшопа</div><button onclick="window.RBI.services.ai.rbi_generateWorkshop(\'' + task.id + '\')" id="btn-gen-workshop" class="bg-purple-600 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сгенерировать</button></div><textarea id="workshop-ai-scenario" class="hidden w-full min-h-[200px] max-h-[50vh] overflow-y-auto custom-scrollbar text-[11px] p-2 rounded-lg border border-purple-200 resize-none outline-none leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-slate-800 shadow-inner mb-2" placeholder="..."></textarea><div id="workshop-actions" class="hidden"><div class="mb-3"><button onclick="document.getElementById(\'task-photo-upload\').click(); window.currentTaskPhotoId=\'' + task.id + '\';" class="w-full bg-white dark:bg-slate-800 border border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg> Добавить фото (для отчета)</button><div id="task-photo-preview" class="hidden mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div></div><div class="flex gap-2"><button onclick="rbi_printWorkshop(\'' + task.id + '\', \'script\')" class="w-1/2 bg-white text-purple-700 border border-purple-200 py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> PDF</button><button onclick="rbi_printWorkshop(\'' + task.id + '\', \'browser\')" class="w-1/2 bg-white text-purple-700 border border-purple-200 py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button><button onclick="rbi_finishWorkshop(\'' + task.id + '\')" class="w-full bg-purple-600 text-white py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Завершить</button></div></div></div>';
        } else if (task.taskType === 'Эталон') {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; openEtalonVersionChooserFromTask(\'' + task.id + '\');" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg> Снять Эталон</button>';
        } else if (task.taskType === 'Совещание' || task.title.includes('Еженедельный разбор')) {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openReportSettingsModal(\'full_report\', \'browser\', \'' + task.id + '\', false);" class="w-full bg-blue-50 text-blue-700 border border-blue-200 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> 1. Подготовить отчет (PDF)</button><button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openMeetingSetupModal(\'' + task.id + '\');" class="w-full bg-orange-500 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> 2. Открыть Протокол (Мемо)</button><div class="text-[9px] text-slate-500 text-center mb-2 leading-tight">Сначала скачайте отчет, затем проведите встречу и зафиксируйте протокол.</div>';
        } else if (task.title.includes('Разбор критического брака')) {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_createMeeting([{contractorName: \'' + safeContractor + '\'}]);" class="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Открыть Протокол (Мемо)</button><div class="text-[9px] text-slate-500 text-center mb-2 leading-tight">Откроется протокол только по этому подрядчику.</div>';
        } else if (task.taskType === 'Аналитика СК') {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_createMeeting();" class="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Провести разбор (Протокол)</button>';
        } else if (task.taskType === 'Отчет' && task.title.includes('День Качества')) {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); rbi_openQualityDaySettings(\'' + task.id + '\');" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Собрать Отчет (AI)</button>';
        } else if (task.taskType === 'Отчет' && task.title.includes('Плакат')) {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openReportSettingsModal(\'poster\', \'browser\', \'' + task.id + '\', true);" class="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Сгенерировать Плакат</button>';
        } else if (task.taskType === 'Отчет' && task.title.includes('One-Pager')) {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openReportSettingsModal(\'global_onepager\', \'script\', \'' + task.id + '\', true);" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Скачать One-Pager</button>';
        } else if (task.taskType === 'Отчет' && task.title.includes('Загрузить выгрузку')) {
            actionButtonsHtml += '<div class="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-3 text-center"><div class="text-[10px] font-black text-blue-700 uppercase mb-2">Сверка с базой</div><button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); if (window.AppRouter) AppRouter.navigate(\'#/quality/analytics/sk\'); else { switchTab(\'tab-analytics\'); setTimeout(() => { switchAnalyticsSubTab(\'sub-sk\'); }, 300); }" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Открыть модуль ПК СК</button><div class="text-[9px] text-slate-500 mt-2">Задача закроется автоматически при импорте файла.</div></div>';
        } else if (task.taskType === 'Отчет' && task.title.includes('FMEA')) {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); if (window.AppRouter) AppRouter.navigate(\'#/quality/engineer/fmea\'); else { switchTab(\'tab-engineer\'); setTimeout(function(){ rbi_switchEngineerSubTab(\'eng-sub-fmea\'); }, 300); }" class="w-full bg-slate-700 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Перейти к FMEA</button>';
        } else if (task.taskType === 'Аудит' || task.taskType === 'Плановая' || task.taskType === 'Старт') {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; window.RBI.services.game.startInspection(\'' + safeContractor + '\', \'' + task.templateKey + '\', null, \'' + safeProject + '\');" class="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"></path></svg> Провести аудит</button>';
        } else if (task.taskType === 'Магия TWI') {
            actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); if (window.AppRouter) AppRouter.navigate(\'#/quality/reference/twi\'); setTimeout(() => { const magicBlock = document.getElementById(\'twi-magic-block\'); if(magicBlock) magicBlock.classList.remove(\'magic-collapsed\'); }, 300);" class="w-full bg-purple-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сделать сейчас</button>';
        } else {
            actionButtonsHtml += '<button onclick="rbi_markTaskDone(\'' + task.id + '\');" class="w-full bg-green-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Отметить выполненной</button>';
        }

        var postponeCountHtml = task.postponeCount > 0 ? '<span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black">' + task.postponeCount + '</span>' : '';
        var _permSvc4 = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
        var canDeleteForever = _permSvc4 ? _permSvc4.canDelete(task.engineerName || task.inspectorName || '') : false;
        var deleteForeverBtnHtml = canDeleteForever ? '<button onclick="rbi_deleteTaskForever(\'' + task.id + '\')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-[var(--card-bg)] text-red-600 dark:text-red-400 font-bold text-[9px] uppercase active:scale-95 border border-[var(--card-border)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Удалить</button>' : '';
        actionButtonsHtml += '\n            <div class="grid ' + (canDeleteForever ? 'grid-cols-4' : 'grid-cols-3') + ' gap-2 w-full mt-2 pt-2 border-t border-[var(--card-border)]">\n                <button onclick="rbi_postponeTask(\'' + task.id + '\')" class="relative flex flex-col justify-center items-center p-2 rounded-xl bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 font-bold text-[9px] uppercase active:scale-95 border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors"><svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg> Сдвинуть' + postponeCountHtml + '</button>\n                <button onclick="rbi_pauseTask(\'' + task.id + '\')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 font-bold text-[9px] uppercase active:scale-95 border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors"><svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Пауза</button>\n                <button onclick="rbi_cancelTask(\'' + task.id + '\')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-[var(--card-bg)] text-orange-500 dark:text-orange-400 font-bold text-[9px] uppercase active:scale-95 border border-[var(--card-border)] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"><svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> Отменить</button>\n                ' + deleteForeverBtnHtml + '\n            </div>\n        ';
    }

    var _permSvc5 = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
    var canEditTasks = _permSvc5 ? _permSvc5.canCreate() : true;
    if (!canEditTasks) {
        actionButtonsHtml = '<div class="text-[11px] text-slate-500 font-bold text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">У вашей роли нет прав для выполнения и изменения задач.</div>';
    }

    footer.innerHTML = actionButtonsHtml;
    document.getElementById('task-details-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
}

// =========================================================================
// 6. СМЕНА СТАТУСОВ
// =========================================================================

async function _markTaskDone(taskId, silent) {
    if (typeof silent === 'undefined') silent = false;
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (task) {
        var wasPending = task.status === 'pending' || task.status === 'paused';
        task.status = 'done';
        task.resultComment = 'Выполнено инженером вручную';
        _touchTaskForSync(task);
        await _storage().put(_storage().stores().TASKS, task);
        if (!_isDemoMode()) {
            _syncEnqueue('UPDATE_TASK_STATUS', { taskId: task.id, status: 'done' });
        }
        // XP за закрытие задачи (если ещё не логировали по этому id)
        if (wasPending && typeof window.gameLogAction === 'function') {
            var logs = window.gameActionLogs || [];
            var already = logs.some(function (l) {
                return l.action === 'task_completed_on_time' && l.target === task.id;
            });
            if (!already) {
                var due = task.dueDate || task.deadline || task.planDate;
                var onTime = !due || new Date(task.updatedAt) <= new Date(due);
                if (onTime) window.gameLogAction('task_completed_on_time', task.id);
            }
        }
        document.getElementById('task-details-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
        if (!silent) {
            showToast("✅ Задача выполнена и перенесена в Архив!");
            _renderTasksList(true);
        }
    }
}

async function _resumeTask(taskId) {
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (!task) return;
    task.status = 'pending'; task.resultComment = '';
    if (!task.history) task.history = [];
    task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Возобновлена инженером.');
    _touchTaskForSync(task);
    await _storage().put(_storage().stores().TASKS, task);
    localStorage.setItem('rbi_cloud_dirty', '1');
    showToast("🔄 Задача снова активна");
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    _renderTasksList(true);
}

async function _pauseTask(taskId) {
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (!task) return;
    var reason = prompt("Укажите причину паузы:");
    if (reason === null) return;
    if (reason.trim() === "") return showToast("⚠️ Причина обязательна!");
    task.status = 'paused'; task.resultComment = 'На паузе: ' + reason;
    if (!task.history) task.history = [];
    task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Пауза: ' + reason);
    _touchTaskForSync(task);
    await _storage().put(_storage().stores().TASKS, task);
    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
    showToast("⏸ Задача скрыта в архив (Пауза)");
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    _renderTasksList(true);
}

async function _cancelTask(taskId) {
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (!task) return;
    var _permSvc6 = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
    if (!_permSvc6.canDelete(task.engineerName || task.inspectorName || '')) {
        return showToast("⚠️ Нет прав на отмену чужой задачи!");
    }
    var reason = prompt("Укажите причину отмены задачи:");
    if (reason === null) return;
    if (reason.trim() === "") return showToast("⚠️ Причина обязательна!");
    task.status = 'blocked'; task.resultComment = 'Отменена: ' + reason;
    if (!task.history) task.history = [];
    task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Отменена: ' + reason);
    _touchTaskForSync(task);
    await _storage().put(_storage().stores().TASKS, task);
    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
    showToast("🚫 Задача отменена");
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    _renderTasksList(true);
}

async function _deleteTaskForever(taskId) {
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (!task) return;
    var _permSvc7 = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
    if (!_permSvc7 || !_permSvc7.canDelete(task.engineerName || task.inspectorName || '')) {
        return showToast("⚠️ Нет прав на удаление этой задачи!");
    }
    if (!confirm("Удалить задачу навсегда? Это действие необратимо.")) return;
    task._deleted = true;
    task.updatedAt = new Date().toISOString();
    await _storage().put(_storage().stores().TASKS, task);
    if (!_isDemoMode()) {
        _syncEnqueue('DELETE_TASK', { taskId: task.id });
    }
    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
    showToast("🗑 Задача удалена навсегда");
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    _renderTasksList(true);
}

async function _postponeTask(taskId) {
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (!task) return;
    var days = prompt("На сколько дней перенести задачу? (введите число)", "1");
    if (days === null) return;
    var daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0) return showToast("⚠️ Введите корректное число дней!");
    var oldDateStr = new Date(task.date).toLocaleDateString('ru-RU');
    var newDate = new Date(task.date);
    newDate.setDate(newDate.getDate() + daysNum);
    task.date = newDate.toISOString();
    task.postponeCount = (task.postponeCount || 0) + 1;
    if (!task.history) task.history = [];
    task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Перенос с ' + oldDateStr + ' на ' + daysNum + ' дн.');
    if (task.postponeCount > 2) {
        task.priorityLvl = 4;
        task.history.unshift('[СИСТЕМА] Приоритет повышен до критического из-за частых переносов!');
        showToast("⚠️ Приоритет повышен до Критического!");
    } else {
        showToast('➡️ Задача перенесена на ' + newDate.toLocaleDateString('ru-RU'));
    }
    task.updatedAt = new Date().toISOString();
    await _storage().put(_storage().stores().TASKS, task);
    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    _renderTasksList(true);
}

// =========================================================================
// 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================================================================

async function _generateTaskScenario() {
    if (!_getSetting('aiEnabled')) return showToast("Включите AI-ассистента!");
    var t = currentTaskContext;
    var txtArea = document.getElementById('task-ai-scenario');
    txtArea.classList.remove('hidden');
    txtArea.value = "⏳ ИИ пишет сценарий...";
    var relatedTwi = typeof customTwiCards !== 'undefined' ? _getTwiCards().find(function(c){ return c.checklistKey === t.templateKey; }) : null;
    var twiContext = relatedTwi ? 'Упомяни, что мы разберем TWI-инструкцию "' + relatedTwi.title + '".' : '';
    var promptSystem = 'Ты — старший инженер стройконтроля. Напиши сценарий для жесткой 5-минутной планерки с бригадой (toolbox talk) СТРОГО по виду работ "' + t.templateTitle + '". \n    ЗАПРЕЩЕНО писать про каски, СИЗ и ТБ! Говорим ТОЛЬКО про технологию работ и качество!\n    ЗАПРЕЩЕНО упоминать материалы, операции или инструменты, не относящиеся к виду работ "' + t.templateTitle + '" — весь текст должен быть привязан только к этому виду работ.\n    1. 🎯 Цель: [Обозначить проблему качества].\n    2. ⚠️ Суть ошибки: [Как они косячат технологически].\n    3. 🛠 Как правильно: [Допуски из ГОСТ/СНиП].\n    4. 💡 Итог: Мотивация.';
    try {
        var res = await _callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: 'Подрядчик: ' + t.contractor + '. Работа: ' + t.templateTitle + '. ' + twiContext }], { temperature: 0.3, max_tokens: 500 });
        txtArea.value = res;
    } catch (e) { txtArea.value = "❌ Ошибка ИИ."; }
}

function _printTaskScenario() {
    var scenario = document.getElementById('task-ai-scenario') ? document.getElementById('task-ai-scenario').value : null;
    if (!scenario || scenario.includes('⏳')) return showToast("Сгенерируйте сценарий!");
    var t = currentTaskContext;
    var relatedTwi = typeof customTwiCards !== 'undefined' ? _getTwiCards().find(function(c){ return c.checklistKey === t.templateKey; }) : null;
    var content = '<div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;"><h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">Сценарий планерки (Toolbox Talk)</h2><div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Подрядчик: ' + t.contractor + ' | Вид работ: ' + t.templateTitle + '</div><div style="font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">' + scenario.replace(/\n/g, '<br>') + '</div></div>';
    if (relatedTwi && relatedTwi.type === 'INSPECTOR') {
        content += '<div style="page-break-before: always; margin-top: 20px;"><h2 style="font-size: 18px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ' + relatedTwi.title + '</h2><table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;"><tr><td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;"><h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>' + (relatedTwi.photoGood ? '<img src="' + window.getPhotoSrc(relatedTwi.photoGood) + '" style="width: 100%; height: 250px; object-fit: contain;">' : 'Нет фото') + '</td><td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;"><h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>' + (relatedTwi.photoBad ? '<img src="' + window.getPhotoSrc(relatedTwi.photoBad) + '" style="width: 100%; height: 250px; object-fit: contain;">' : 'Нет фото') + '</td></tr></table></div>';
    }
    if (typeof printPdfShell === 'function') printPdfShell('Воркшоп: ' + t.contractor, content, "A4", "portrait", "browser");
}

async function _saveFinalAndClose(taskId) {
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    var text = document.getElementById('final-ai-text').value;
    task.aiData = { finalReport: text };
    task.status = 'done';
    task.resultComment = 'Справка КС-2 сохранена';
    task.updatedAt = new Date().toISOString();
    await _storage().put(_storage().stores().TASKS, task);
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    showToast("✅ Задача финальной приемки закрыта!");
    _renderTasksList(true);
}

function _handleTaskCompletionPhoto(event) {
    var file = event.target.files[0];
    if (!file) return;
    showToast("⚙️ Прикрепляю фото факта проведения...");
    window.compressImageToBase64(file, 1000, 0.8, async function(base64) {
        var localUrl = await PhotoManager.saveLocal(base64, 'task');
        var taskId = window.currentTaskPhotoId;
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (task) {
            task.completionPhoto = localUrl;
            await _storage().put(_storage().stores().TASKS, task);
        }
        var box = document.getElementById('task-photo-preview');
        box.dataset.photo = localUrl;
        box.classList.remove('hidden');
        box.innerHTML = '<img ' + ((typeof window.rbiBuildPhotoImgAttrs === 'function') ? window.rbiBuildPhotoImgAttrs(localUrl) : ('src="' + window.getPhotoSrc(localUrl) + '"')) + ' class="w-full h-full object-cover"><div onclick="event.stopPropagation(); document.getElementById(\'task-photo-preview\').dataset.photo=\'\'; document.getElementById(\'task-photo-preview\').classList.add(\'hidden\');" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black shadow-md cursor-pointer">✕</div>';
        if (typeof window.rbiHydrateLocalImages === 'function') window.rbiHydrateLocalImages(box);
        event.target.value = '';
    });
}

async function _finishWorkshop(taskId) {
    const _allInspections = _inspections();
    var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
    if (!task) return;
    var cChecks = _allInspections.filter(function(c){ return c.contractorName === task.contractor && c.templateKey === task.templateKey; });
    var m = cChecks.length > 0 ? getContractorMetrics(cChecks, _templates().getUserTemplates()) : null;
    var baseUrkVal = m ? m.finalC : 0;
    var myName = document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : '';
    if (typeof window.rbi_interventionsData !== 'undefined') {
        var item = {
            id: 'int_' + Date.now().toString(36),
            date: new Date().toISOString(),
            inspector: myName,
            contractor: task.contractor,
            templateKey: task.templateKey,
            templateTitle: task.templateTitle || 'Вид работ',
            typeText: 'Разбор с бригадой (TWI-сессия)',
            typeCoef: 1.5,
            comment: 'Проведен воркшоп из планировщика задач',
            baseUrk: baseUrkVal
        };
        window.rbi_interventionsData.push(item);
        await _storage().put(_storage().stores().INTERVENTIONS, item);
    }
    _markTaskDone(taskId);
}

// =========================================================================
// 8. ОТЧЁТ ИЗ ЗАДАЧИ
// =========================================================================

function _openReportSettingsModal(actionType, mode, taskId, closeTask) {
    const _allInspections = _inspections();
    if (typeof closeTask === 'undefined') closeTask = true;
    var modal = document.getElementById('modal-overlay');
    var uniqueProjects = Array.from(new Set(_allInspections.map(function(c){ return c.projectName; }).filter(Boolean))).sort();
    var projOptions = '<option value="ALL">Все объекты компании (Глобально)</option>';
    uniqueProjects.forEach(function(p) { projOptions += '<option value="' + p.replace(/"/g, '&quot;') + '">' + p + '</option>'; });
    document.getElementById('modal-icon').innerHTML = '<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200">⚙️</div>';
    document.getElementById('modal-title').innerHTML = '<div class="text-center font-black uppercase text-lg">Настройки Отчета</div>';
    var taskInfoText = closeTask
        ? "Выберите параметры для формирования выгрузки. Система автоматически закроет эту задачу после скачивания файла."
        : "Выберите объект и период для формирования презентации. После скачивания вернитесь в задачу для заполнения протокола.";
    document.getElementById('modal-body').innerHTML = '<div class="text-center text-[12px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">' + taskInfoText + '</div><div class="space-y-3 mb-6"><div><label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Объект</label><select id="task-rep-project" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none">' + projOptions + '</select></div><div><label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Период Анализа</label><select id="task-rep-period" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none"><option value="WEEK">За последние 7 дней (Неделя)</option><option value="MONTH">За последние 30 дней (Месяц)</option><option value="ALL">За всё время</option></select></div></div><div class="flex gap-2"><button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700">Отмена</button><button onclick="closeModal(); rbi_executeTaskReport(\'' + actionType + '\', \'' + mode + '\', \'' + taskId + '\', ' + closeTask + ')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">🚀 Скачать PDF</button></div>';
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

function _executeTaskReport(actionType, mode, taskId, closeTask) {
    var proj = document.getElementById('task-rep-project').value;
    var period = document.getElementById('task-rep-period').value;
    if (proj === 'ALL') {
        _analyticsFilters().project = [];
    } else {
        _analyticsFilters().project = [proj];
    }
    var periodSelect = document.getElementById('global-filter-period');
    if (periodSelect) {
        periodSelect.value = period;
        var periodLabel = document.getElementById('btn-ana-period-label');
        if (periodLabel) {
            periodLabel.querySelector('.truncate').innerText = periodSelect.options[periodSelect.selectedIndex].text;
        }
    }
    setTimeout(function() { handleFabExportAction(actionType, mode); }, 300);
}

// =========================================================================
// 9. ГЕНЕРАТОР АВТОЗАДАЧ ИЗ ГРАФИКА (SMART SYNC)
// =========================================================================

async function _generateAutoTasks(silent) {
    if (typeof silent === 'undefined') silent = false;
    if (!silent) showToast("🧠 Синхронизация задач с графиком...");

    var generatedCount = 0, updatedCount = 0, deletedCount = 0;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var scheduleTasks = window.rbi_tasksData.filter(function(t){ return t.source === 'schedule' && !t._deleted; });

    window.rbi_scheduleData.forEach(function(stage) {
        if (stage._deleted) return;
        var startD = new Date(stage.startDate);
        var endD = new Date(stage.endDate);

        var addTaskOrUpdate = function(daysOffset, typeName, title, desc, iconName, catName) {
            var tDate = new Date(startD);
            tDate.setDate(tDate.getDate() + daysOffset);
            if (tDate < now && typeName !== 'Финал') return;

            var existingTask = scheduleTasks.find(function(t){ return t.stageId === stage.id && t.taskType === typeName; });
            if (!existingTask) {
                existingTask = scheduleTasks.find(function(t){ return t.contractor === stage.contractor && t.templateKey === stage.templateKey && t.taskType === typeName; });
            }

            if (existingTask) {
                existingTask.stageId = stage.id;
                if (existingTask.status === 'pending' || existingTask.status === 'paused') {
                    var oldDate = new Date(existingTask.date).getTime();
                    if (oldDate !== tDate.getTime()) {
                        existingTask.date = tDate.toISOString();
                        existingTask.updatedAt = new Date().toISOString();
                        updatedCount++;
                    }
                }
            } else {
                if (typeName === 'Эталон') {
                    var hasEtalonInDb = _getEtalonActs().some(function(e){ return e.contractorName === stage.contractor && e.templateKey === stage.templateKey; });
                    if (hasEtalonInDb) return;
                }
                var task = {
                    id: 'tsk_sch_' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
                    source: 'schedule',
                    engineerName: document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : 'Инженер',
                    stageId: stage.id,
                    type: 'auto', category: catName, icon: iconName, taskType: typeName,
                    title: title, prompt: desc,
                    workTitle: stage.workTitle, templateKey: stage.templateKey, contractor: stage.contractor,
                    date: tDate.toISOString(), status: 'pending', priorityLvl: 3, target: 1, done: 0, carryOverCount: 0,
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                };
                window.rbi_tasksData.push(task);
                generatedCount++;
            }
        };

        addTaskOrUpdate(-14, 'ППР', 'Проверить ППР и ТК', 'Проверить наличие и утверждение технологической карты до выхода подрядчика.', 'ППР', 'method');
        addTaskOrUpdate(-7, 'Инструктаж', 'Вводный инструктаж', 'Собрать бригадиров, провести инструктаж по допускам и качеству.', 'Инструктаж', 'method');
        addTaskOrUpdate(-3, 'Эталон', 'Приемка Эталона', 'Зафиксировать эталонный участок работ с фотофиксацией.', 'Эталон', 'control');
        addTaskOrUpdate(0, 'Старт', 'Контроль старта работ', 'Первая проверка на объекте в день начала этапа.', 'Контроль', 'control');

        var finalDiff = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) - 3;
        if (finalDiff > 0) addTaskOrUpdate(finalDiff, 'Финал', 'Финальная приемка', 'Итоговая проверка перед подписанием КС.', 'Отчет', 'report');
    });

    var activeStageIds = window.rbi_scheduleData.filter(function(s){ return !s._deleted; }).map(function(s){ return s.id; });
    window.rbi_tasksData.forEach(function(t) {
        if (t.source === 'schedule' && t.stageId && !t._deleted) {
            if (!activeStageIds.includes(t.stageId)) {
                if (t.status === 'pending' || t.status === 'paused') {
                    t._deleted = true; t.updatedAt = new Date().toISOString(); deletedCount++;
                }
            }
        }
    });

    for (var i = 0; i < window.rbi_tasksData.length; i++) {
        await _storage().put(_storage().stores().TASKS, window.rbi_tasksData[i]);
    }

    if (generatedCount > 0 || updatedCount > 0 || deletedCount > 0) {
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
    }

    setTimeout(function() {
        if (!silent && (generatedCount > 0 || updatedCount > 0 || deletedCount > 0)) {
            showToast('✅ Задачи обновлены! Новых: ' + generatedCount + ', Сдвинуто: ' + updatedCount + ', Удалено: ' + deletedCount);
            if (typeof rbi_renderScheduleTab === 'function') rbi_renderScheduleTab(true);
        } else if (!silent) {
            showToast('✅ Задачи синхронизированы с графиком');
            if (typeof rbi_renderScheduleTab === 'function') rbi_renderScheduleTab(true);
        }
        _renderTasksList();
    }, 500);
}

// =========================================================================
// 10. КАЛЕНДАРЬ ЗАДАЧ
// =========================================================================

function _openCalendarModal() {
    var modal = document.getElementById('task-calendar-modal');
    currentCalendarDate = new Date();
    _renderCalendarGrid();
    document.getElementById('calendar-tasks-list').innerHTML = '<div class="text-center py-6 text-slate-400 text-[11px] font-bold uppercase border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm">Кликните на число в календаре</div>';
    document.getElementById('calendar-selected-date-label').innerText = 'Выберите дату';
    _renderNoDateTasks();
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(function(){ modal.classList.remove('opacity-0'); }, 10);
}

function _closeCalendarModal() {
    var modal = document.getElementById('task-calendar-modal');
    modal.classList.add('opacity-0');
    setTimeout(function() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

function _changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    _renderCalendarGrid();
}

function _renderCalendarGrid() {
    var year = currentCalendarDate.getFullYear();
    var month = currentCalendarDate.getMonth();
    var monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
    document.getElementById('calendar-month-label').innerText = monthNames[month] + ' ' + year;
    var grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    var firstDay = new Date(year, month, 1).getDay();
    var startOffset = firstDay === 0 ? 6 : firstDay - 1;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var taskDates = {};
    window.rbi_tasksData.forEach(function(t) {
        if (!t._deleted && t.status !== 'done' && t.status !== 'blocked' && t.date) {
            var dateStr = t.date.split('T')[0];
            taskDates[dateStr] = (taskDates[dateStr] || 0) + 1;
        }
    });
    var todayStr = new Date().toISOString().split('T')[0];
    var html = '';
    for (var i = 0; i < startOffset; i++) html += '<div></div>';
    for (var d = 1; d <= daysInMonth; d++) {
        var dIso = new Date(Date.UTC(year, month, d)).toISOString().split('T')[0];
        var isToday = dIso === todayStr;
        var taskCount = taskDates[dIso] || 0;
        var bgClass = isToday ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700';
        var dotHtml = taskCount > 0 ? '<div class="w-1.5 h-1.5 rounded-full ' + (isToday ? 'bg-white' : 'bg-red-500') + ' absolute bottom-1.5 left-1/2 -translate-x-1/2"></div>' : '';
        html += '<div onclick="rbi_showTasksForDate(\'' + dIso + '\')" class="relative flex flex-col items-center justify-center h-12 sm:h-14 rounded-xl cursor-pointer active:scale-90 transition-transform ' + bgClass + '"><div class="text-[14px] sm:text-[16px] font-black leading-none">' + d + '</div>' + dotHtml + '</div>';
    }
    grid.innerHTML = html;
}

function _renderCalendarTaskCard(t) {
    var icon = t.icon ? (RBI_TASK_ICONS[t.icon] || RBI_TASK_ICONS['Контроль']) : RBI_TASK_ICONS['Контроль'];
    var priorityColor = t.priorityLvl === 4 ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200';
    var priorityText = t.priorityLvl === 4 ? 'Крит.' : 'Обычная';
    return '<div onclick="rbi_closeCalendarModal(); setTimeout(()=>rbi_openTaskAction(\'' + t.id + '\'),300)" class="cursor-pointer w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col relative shadow-sm active:scale-[0.98] hover:border-indigo-400 transition-all"><div class="flex items-start justify-between gap-3 mb-2"><div class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] text-slate-500 flex items-center justify-center border border-[var(--card-border)] shrink-0">' + icon + '</div><div class="flex-1 min-w-0"><div class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">' + (t.taskType || t.title) + '</div><div class="text-[13px] font-black text-slate-800 dark:text-white leading-tight truncate">' + (t.contractor || 'Без подрядчика') + '</div></div></div><div class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 font-medium mb-3">' + (t.prompt || 'Без описания') + '</div><div class="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between items-center"><span class="text-[8px] font-black uppercase px-2 py-1 rounded border ' + priorityColor + '">' + priorityText + '</span><span class="text-[10px] font-bold text-slate-400">' + (t.engineerName || 'Инженер') + '</span></div></div>';
}

function _showTasksForDate(dateStr) {
    document.getElementById('calendar-selected-date-label').innerText = 'Задачи на: ' + new Date(dateStr).toLocaleDateString('ru-RU');
    var list = document.getElementById('calendar-tasks-list');
    var tasks = window.rbi_tasksData.filter(function(t){ return !t._deleted && t.status !== 'done' && t.status !== 'blocked' && t.date && t.date.split('T')[0] === dateStr; });
    if (tasks.length === 0) {
        list.innerHTML = '<div class="text-center py-6 text-slate-400 text-[11px] font-bold uppercase border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">На этот день задач нет</div>';
    } else {
        list.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + tasks.map(_renderCalendarTaskCard).join('') + '</div>';
    }
}

function _renderNoDateTasks() {
    var list = document.getElementById('calendar-nodate-list');
    var tasks = window.rbi_tasksData.filter(function(t){ return !t._deleted && t.status !== 'done' && t.status !== 'blocked' && !t.date; });
    if (tasks.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-slate-400 text-[10px] font-bold uppercase">Все задачи привязаны к датам</div>';
    } else {
        list.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + tasks.map(_renderCalendarTaskCard).join('') + '</div>';
    }
}

// =========================================================================
// РОУТЕР ВКЛАДОК ИНЖЕНЕРА (перенесён из app.js Tasks-блока)
// =========================================================================

var _engineerDataLoaded = false;
var currentActiveEngineerTab = 'eng-sub-tasks';

async function _switchEngineerSubTab(tabId, btnElement, opts) {
    var fromRouter = !!(opts && opts.fromRouter);
    currentActiveEngineerTab = tabId;
    document.querySelectorAll('.eng-sub-section').forEach(function(el) { el.classList.add('hidden'); });
    document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn').forEach(function(el) {
        el.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
        el.classList.add('text-[var(--text-muted)]');
    });

    var targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    if (!btnElement) {
        btnElement = document.querySelector('#engineer-subtabs-block .sub-tab-btn[data-action-arg="' + tabId + '"]');
    }
    if (btnElement) {
        btnElement.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
        btnElement.classList.remove('text-[var(--text-muted)]');
    }

    await _renderEngineerTab();

    if (!fromRouter && window.AppRouter && typeof window.AppRouter.navigateSub === 'function') {
        window.AppRouter.navigateSub('#/quality/engineer', tabId);
    }
}

async function _renderEngineerTab() {
    if (!_engineerDataLoaded || (window.syncDirtyFlags && window.syncDirtyFlags.tasks)) {
        await _loadData();
        _engineerDataLoaded = true;
        if (window.syncDirtyFlags) window.syncDirtyFlags.tasks = false;
    }

    if (typeof gameGenerateWeeklyPlan === 'function') {
        await gameGenerateWeeklyPlan(false);
    }

    if (currentActiveEngineerTab === 'eng-sub-tasks') {
        _renderTasksList(true);
    } else if (currentActiveEngineerTab === 'eng-sub-meetings') {
        if (typeof rbi_renderMeetingTab === 'function') rbi_renderMeetingTab();
    } else if (currentActiveEngineerTab === 'eng-sub-impact') {
        if (typeof rbi_renderImpactTab === 'function') rbi_renderImpactTab();
    } else if (currentActiveEngineerTab === 'eng-sub-badges') {
        var _gameSvc4 = (_ctx && _ctx.game) || window.RBI.services.game;
        _gameSvc4.renderDashboard();
    } else if (currentActiveEngineerTab === 'eng-sub-fmea') {
        if (typeof rbi_renderFmeaHistory === 'function') rbi_renderFmeaHistory();
    }
}

async function _loadData() {
    try {
        var s = _storage();
        var st = s.stores();
        var scheduleObj = await s.getAll(st.SCHEDULE);
        if (scheduleObj) window.rbi_scheduleData = scheduleObj;

        var tasksObj = await s.getAll(st.TASKS);
        if (tasksObj) window.rbi_tasksData = tasksObj.filter(function(t){ return !t._deleted; });

        var intObj = await s.getAll(st.INTERVENTIONS);
        if (intObj) window.rbi_interventionsData = intObj;

        var meetObj = await s.getAll(st.MEETINGS);
        if (meetObj) window.rbi_meetingsData = meetObj;

        var fmeaObj = await s.getAll(st.FMEA);
        if (fmeaObj) window.rbi_fmeaRecords = fmeaObj;
    } catch (e) { console.error("Ошибка загрузки баз Инженера", e); }
}

// =========================================================================
// ES-МОДУЛЬ: TasksModule (платформенный контракт)
// =========================================================================

// Паттерн делегирования событий для инициативы «Разбор inline onclick/onchange»
// (см. _ai/INDEX_HTML_HANDLERS_MAP.md), namespace-per-module (data-tasks-action).
function bindTasksActionDelegation() {
    if (window.__tasksActionDelegationBound) return;
    window.__tasksActionDelegationBound = true;

    var readArg = function (el, valType, evt) {
        switch (valType) {
            case 'element': return el;
            case 'event': return evt;
            case 'checked': return el.checked;
            case 'int': return el.dataset.actionArg !== undefined ? parseInt(el.dataset.actionArg, 10) : parseInt(el.value, 10);
            case 'value': return el.value;
            default: return undefined;
        }
    };

    var dispatch = function (el, evt) {
        var action = el.dataset.tasksAction;
        var fn = window[action];
        if (typeof fn !== 'function') return;
        var valType = el.dataset.tasksActionValType;
        var arg = valType ? readArg(el, valType, evt) : el.dataset.actionArg;
        var arg2Type = el.dataset.tasksActionArg2Type;
        var arg2 = arg2Type ? readArg(el, arg2Type, evt) : undefined;

        if (arg === undefined) {
            fn();
        } else if (arg2 === undefined) {
            fn(arg);
        } else {
            fn(arg, arg2);
        }
    };

    var resolveActionElement = function (target, wantsChange) {
        var el = target;
        while (el && el.nodeType === 1) {
            if (el.dataset && el.dataset.tasksAction) {
                if (!!(el.dataset.actionEvent === 'change') === wantsChange) return el;
            }
            var inlineOnclick = el.getAttribute && el.getAttribute('onclick');
            if (!wantsChange && inlineOnclick && inlineOnclick.includes('stopPropagation')) return null;
            el = el.parentElement;
        }
        return null;
    };

    document.addEventListener('click', function (e) {
        var el = resolveActionElement(e.target, false);
        if (el) dispatch(el, e);
    }, true);

    document.addEventListener('change', function (e) {
        var el = resolveActionElement(e.target, true);
        if (el) dispatch(el, e);
    }, true);
}

// =========================================================================
// РАЗМЕТКА МОДАЛОК TASKS (перенос из index.html:1313-1358/1613-1638/1952-2002,
// перенос 30 modal/overlay-блоков #app-modals в JS-рендер). HTML-строки 1:1
// идентичны прежней статичной разметке.
// =========================================================================
function renderTaskCalendarModalMarkup() {
    return `
    <div id="task-calendar-modal" class="fixed inset-0 bg-slate-900/90 z-[9000] hidden flex-col transition-opacity duration-300 opacity-0" data-tasks-action="rbi_closeCalendarModal">
        <div class="bg-[var(--bg-main)] w-full h-full max-w-3xl mx-auto flex flex-col shadow-2xl overflow-hidden relative" onclick="event.stopPropagation()">
            
            <!-- Шапка календаря -->
            <div class="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
                <div class="font-black text-[14px] uppercase tracking-widest flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Календарь задач
                </div>
                <button data-tasks-action="rbi_closeCalendarModal" class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center font-black active:scale-90 border border-indigo-400">✕</button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900">
                <!-- Управление месяцами и сетка -->
                <div class="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex justify-between items-center mb-4">
                        <button data-tasks-action="rbi_changeCalendarMonth" data-tasks-action-val-type="int" data-action-arg="-1" class="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-300 active:scale-90">←</button>
                        <div id="calendar-month-label" class="font-black text-[16px] text-slate-800 dark:text-white uppercase tracking-widest">Май 2024</div>
                        <button data-tasks-action="rbi_changeCalendarMonth" data-tasks-action-val-type="int" data-action-arg="1" class="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-300 active:scale-90">→</button>
                    </div>
                    
                    <!-- Дни недели -->
                    <div class="grid grid-cols-7 gap-1 text-center mb-2">
                        <div class="text-[10px] font-black text-slate-400 uppercase">Пн</div><div class="text-[10px] font-black text-slate-400 uppercase">Вт</div><div class="text-[10px] font-black text-slate-400 uppercase">Ср</div><div class="text-[10px] font-black text-slate-400 uppercase">Чт</div><div class="text-[10px] font-black text-slate-400 uppercase">Пт</div><div class="text-[10px] font-black text-red-400 uppercase">Сб</div><div class="text-[10px] font-black text-red-400 uppercase">Вс</div>
                    </div>
                    <!-- Сетка дат -->
                    <div id="calendar-grid" class="grid grid-cols-7 gap-1 sm:gap-2">
                        <!-- Генерируется JS -->
                    </div>
                </div>

                <!-- Список задач под календарем -->
                <div class="p-4">
                    <div id="calendar-selected-date-label" class="text-[12px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-3 tracking-widest border-b border-slate-200 dark:border-slate-700 pb-2">Выберите дату</div>
                    <div id="calendar-tasks-list" class="space-y-3">
                        <div class="text-center py-6 text-slate-400 text-[11px] font-bold uppercase border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">Кликните на число в календаре</div>
                    </div>
                    
                    <!-- Задачи без даты -->
                    <div class="text-[12px] font-black uppercase text-slate-500 mb-3 tracking-widest border-b border-slate-200 dark:border-slate-700 pb-2 mt-8">Задачи без дедлайна</div>
                    <div id="calendar-nodate-list" class="space-y-3 pb-8">
                    </div>
                </div>
            </div>
        </div>
    </div>
`;
}

function renderTaskDetailsModalMarkup() {
    return `
    <div id="task-details-modal"
        class="fixed inset-0 bg-slate-900/80 z-[6000] hidden items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
        onclick="this.style.display='none'; document.body.classList.remove('modal-open');">
        <div class="bg-[var(--card-bg)] w-full max-w-lg max-h-[95vh] rounded-2xl shadow-2xl transition-transform border border-[var(--card-border)] flex flex-col overflow-hidden"
            onclick="event.stopPropagation()">
            <div
                class="p-4 border-b border-[var(--card-border)] bg-[var(--hover-bg)] flex justify-between items-center shrink-0">
                <div class="font-black text-[13px] uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2"
                    id="task-details-header-title">
                    📋 Детализация задачи
                </div>
                <button
                    onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open');"
                    class="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 active:scale-90 shadow-sm border border-slate-200 dark:border-slate-700">✕</button>
            </div>

            <div id="task-details-body" class="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <!-- Контент генерируется через JS -->
            </div>

            <div id="task-details-footer"
                class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 shrink-0 flex flex-col gap-2">
                <!-- Кнопки действий генерируются через JS -->
            </div>
        </div>
    </div>
`;
}

function renderManualTaskModalMarkup() {
    return `
    <div id="manual-task-modal"
        class="fixed inset-0 bg-slate-900/80 z-[7000] hidden items-center justify-center p-4 backdrop-blur-sm"
        data-tasks-action="rbi_closeTaskModal">
        <div class="bg-[var(--card-bg)] w-full max-w-sm rounded-3xl shadow-2xl transition-transform border border-[var(--card-border)] overflow-hidden flex flex-col"
            onclick="event.stopPropagation()">
            <div
                class="p-4 border-b border-[var(--card-border)] bg-[var(--hover-bg)] flex justify-between items-center shrink-0">
                <div
                    class="font-black text-[13px] uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                    <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path>
                    </svg> Новое поручение
                </div>
                <button data-tasks-action="rbi_closeTaskModal"
                    class="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 active:scale-90 shadow-sm border border-slate-200 dark:border-slate-700">✕</button>
            </div>

            <div class="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Название задачи *</label>
                    <input type="text" id="manual-task-title" class="input-base" placeholder="Краткая суть...">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Описание (Подробно)</label>
                    <textarea id="manual-task-prompt" class="input-base h-16 resize-none text-[12px]" placeholder="Что именно нужно сделать..."></textarea>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Категория (Где отображать)</label>
                    <select id="manual-task-urgency" class="input-base font-bold">
                        <option value="planned">Плановые (На эту неделю)</option>
                        <option value="future">Будущие (Отложенные)</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Срок (Дедлайн)</label>
                        <input type="date" id="manual-task-date" class="input-base !py-2 text-[12px]">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-indigo-600 uppercase mb-1 block">Исполнитель</label>
                        <select id="manual-task-engineer" class="input-base font-bold text-slate-800 dark:text-white bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"></select>
                    </div>
                </div>
                <button data-tasks-action="rbi_saveManualTask"
                    class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 flex items-center justify-center gap-2 mt-2">
                    Создать поручение
                </button>
            </div>
        </div>
    </div>
`;
}

(function mountTasksModalsMarkup() {
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals');
    if (!root) return;
    if (!document.getElementById('task-calendar-modal')) {
        root.insertAdjacentHTML('beforeend', renderTaskCalendarModalMarkup());
    }
    if (!document.getElementById('task-details-modal')) {
        root.insertAdjacentHTML('beforeend', renderTaskDetailsModalMarkup());
    }
    if (!document.getElementById('manual-task-modal')) {
        root.insertAdjacentHTML('beforeend', renderManualTaskModalMarkup());
    }
}());

export const TasksModule = {
    id: 'tasks',
    routes: ['/tasks', '/tasks/calendar', '/tasks/schedule'],
    dependencies: ['storage', 'tasks'],

    _syncUnsubscribe: null,

    async init(ctx) {
        _ctx = ctx;
        if (window.TasksActions) window.TasksActions.bindCtx(ctx);
        bindTasksActionDelegation();
        var svc = ctx && ctx.tasks;
        var events = ctx && ctx.events;

        if (svc) {
            try {
                var allTasks = await svc.getAllTasks().catch(function(){ return []; });
                var allSchedule = await svc.getAllSchedule().catch(function(){ return []; });
                window.rbi_tasksData = (allTasks || []).filter(function(t){ return !t._deleted && !t.is_deleted; });
                window.rbi_scheduleData = allSchedule || [];
            } catch(e) {
                console.error('[TasksModule] ошибка загрузки через svc:', e);
            }
        }

        if (events && typeof events.on === 'function') {
            // §5 via sync-ui-defer: на активных Задачах — без full-render;
            // допускаем точечный refresh только если сигнатура списка изменилась.
            var handler = async function () {
                var tasksOnScreen = _isTasksViewActive();
                var beforeStruct = tasksOnScreen ? _tasksStructureSignature() : null;
                var beforeSig = tasksOnScreen ? _tasksListSignature() : null;
                await _loadData();
                window._rbiSuppressTasksRefresh = true;
                try {
                    if (typeof window.gameUpdatePlanProgress === 'function') {
                        window.gameUpdatePlanProgress();
                    } else if (window.RBI && window.RBI.services && window.RBI.services.game &&
                        typeof window.RBI.services.game.updatePlanProgress === 'function') {
                        window.RBI.services.game.updatePlanProgress();
                    }
                } finally {
                    window._rbiSuppressTasksRefresh = false;
                }
                if (!tasksOnScreen) {
                    if (window.RBI && window.RBI.utils && window.RBI.utils.syncUi && window.RBI.utils.syncUi.markDirty) {
                        window.RBI.utils.syncUi.markDirty('tasks');
                    } else if (window.syncDirtyFlags) {
                        window.syncDirtyFlags.tasks = true;
                    }
                    return;
                }
                var afterStruct = _tasksStructureSignature();
                var afterSig = _tasksListSignature();
                // Тот же набор задач (id+status) — только цифры в DOM, свёртки не трогаем
                if (beforeStruct && beforeStruct === afterStruct) {
                    _patchTasksListDom();
                    if (window.syncDirtyFlags) window.syncDirtyFlags.tasks = false;
                    return;
                }
                // Активный экран + sync-defer: не full-render; пометим dirty если состав изменился
                if (typeof window.shouldDeferFullRender === 'function' && window.shouldDeferFullRender('tasks')) {
                    _patchTasksListDom();
                    if (beforeSig !== afterSig) {
                        if (window.RBI && window.RBI.utils && window.RBI.utils.syncUi && window.RBI.utils.syncUi.markDirty) {
                            window.RBI.utils.syncUi.markDirty('tasks');
                        } else if (window.syncDirtyFlags) {
                            window.syncDirtyFlags.tasks = true;
                        }
                    } else if (window.syncDirtyFlags) {
                        window.syncDirtyFlags.tasks = false;
                    }
                    return;
                }
                if (beforeSig === afterSig) {
                    _patchTasksListDom();
                    if (window.syncDirtyFlags) window.syncDirtyFlags.tasks = false;
                    return;
                }
                var uiState = _captureTasksUiState();
                await _renderTasksList(true);
                _restoreTasksUiState(uiState);
                if (window.syncDirtyFlags) window.syncDirtyFlags.tasks = false;
            };
            events.on('sync:completed', handler);
            TasksModule._syncUnsubscribe = function() { events.off && events.off('sync:completed', handler); };

            var refreshHandler = function() {
                if (window._rbiSuppressTasksRefresh) return;
                _renderTasksList();
            };
            events.on('tasks:refresh', refreshHandler);
            TasksModule._refreshUnsubscribe = function() { events.off && events.off('tasks:refresh', refreshHandler); };
        }

        if (events && typeof events.emit === 'function') {
            events.emit('tasks:loaded', { tasks: window.rbi_tasksData, schedule: window.rbi_scheduleData });
        }

        console.log('[TasksModule] init complete');
    },

    mount(container, ctx) {
        var tab = (ctx && ctx.tab) || 'list';
        _renderTasksList();
    },

    unmount() {
        if (typeof TasksModule._syncUnsubscribe === 'function') {
            TasksModule._syncUnsubscribe();
            TasksModule._syncUnsubscribe = null;
        }
        if (typeof TasksModule._refreshUnsubscribe === 'function') {
            TasksModule._refreshUnsubscribe();
            TasksModule._refreshUnsubscribe = null;
        }
    }
};

// =========================================================================
// РЕГИСТРАЦИЯ window.rbi_* (accessor-паттерн, как в meetings.module.js)
// =========================================================================

window.rbi_tasksData       = window.rbi_tasksData       || [];
window.rbi_scheduleData    = window.rbi_scheduleData    || [];
window.rbi_interventionsData = window.rbi_interventionsData || [];
window.rbi_meetingsData    = window.rbi_meetingsData    || [];
window.rbi_fmeaRecords     = window.rbi_fmeaRecords     || [];

window.rbi_openTaskModal        = function() { return _openTaskModal.apply(this, arguments); };
window.rbi_closeTaskModal       = function() { return _closeTaskModal.apply(this, arguments); };
window.rbi_saveManualTask       = function() { return _saveManualTask.apply(this, arguments); };

window.gameForceUpdatePlan      = function() { return _gameForceUpdatePlan.apply(this, arguments); };
window.gameGenerateWeeklyPlan   = function() { return _gameGenerateWeeklyPlan.apply(this, arguments); };

window.rbi_renderTasksList      = function() { return _renderTasksList.apply(this, arguments); };
window.rbi_getCurrentEngineerRef = function() { return _getCurrentEngineerRef.apply(this, arguments); };
window.rbi_taskBelongsTo        = function() { return _taskBelongsTo.apply(this, arguments); };
window.rbi_countOpenTasksFor    = function() { return _countOpenTasksFor.apply(this, arguments); };
window.rbi_filterTaskHub        = function() { return _filterTaskHub.apply(this, arguments); };
window.rbi_toggleCriticalOnlyFilter = function() { return _toggleCriticalOnlyFilter.apply(this, arguments); };
window.rbi_openTaskAction       = function() { return _openTaskAction.apply(this, arguments); };

window.rbi_markTaskDone         = function() { return _markTaskDone.apply(this, arguments); };
window.rbi_resumeTask           = function() { return _resumeTask.apply(this, arguments); };
window.rbi_pauseTask            = function() { return _pauseTask.apply(this, arguments); };
window.rbi_cancelTask           = function() { return _cancelTask.apply(this, arguments); };
window.rbi_deleteTaskForever    = function() { return _deleteTaskForever.apply(this, arguments); };
window.rbi_postponeTask         = function() { return _postponeTask.apply(this, arguments); };

window.rbi_saveFinalAndClose    = function() { return _saveFinalAndClose.apply(this, arguments); };
window.rbi_finishWorkshop       = function() { return _finishWorkshop.apply(this, arguments); };
window.rbi_handleTaskCompletionPhoto = function() { return _handleTaskCompletionPhoto.apply(this, arguments); };
window.rbi_generateTaskScenario = function() { return _generateTaskScenario.apply(this, arguments); };
window.rbi_printTaskScenario    = function() { return _printTaskScenario.apply(this, arguments); };
window.rbi_openReportSettingsModal = function() { return _openReportSettingsModal.apply(this, arguments); };
window.rbi_executeTaskReport    = function() { return _executeTaskReport.apply(this, arguments); };

window.rbi_generateAutoTasks    = function() { return _generateAutoTasks.apply(this, arguments); };

window.rbi_openCalendarModal    = function() { return _openCalendarModal.apply(this, arguments); };
window.rbi_closeCalendarModal   = function() { return _closeCalendarModal.apply(this, arguments); };
window.rbi_changeCalendarMonth  = function() { return _changeCalendarMonth.apply(this, arguments); };
window.rbi_renderCalendarGrid   = function() { return _renderCalendarGrid.apply(this, arguments); };
window.rbi_showTasksForDate     = function() { return _showTasksForDate.apply(this, arguments); };
window.rbi_renderNoDateTasks    = function() { return _renderNoDateTasks.apply(this, arguments); };

window.rbi_switchEngineerSubTab = function() { return _switchEngineerSubTab.apply(this, arguments); };
window.rbi_renderEngineerTab    = function() { return _renderEngineerTab.apply(this, arguments); };
window.rbi_loadData             = function() { return _loadData.apply(this, arguments); };

window.executeRenderTasks = function() { return _renderTasksList(); };

// Регистрация в реестре платформы
if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.tasks', TasksModule);
}

console.log('[TasksModule] tasks.module.js loaded (ES module, Step 36)');
