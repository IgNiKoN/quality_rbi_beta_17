/**
 * history.desktop.content.js
 * Desktop-only History content builders (checks / reports / plans).
 * Mobile history.render / analytics.renderReportsList stay untouched.
 */

import { openHistoryPlanViewer } from '../audit/features/quality-plan-pin.js';
import { planPinOf } from '../shared/plan-pin-label.js';

const DESK_IDS = {
  checks: 'ana-desk-hist-checks',
  reports: 'ana-desk-hist-reports',
  plans: 'ana-desk-hist-plans'
};

let _deskReportsDocKind = 'ALL';
let _deskChecksProject = 'ALL';
let _deskReportsProject = 'ALL';
let _deskPlansProject = 'ALL';
let _deskChecksSort = { key: 'date', dir: 'desc' };
let _deskPlansFloorItems = new Map();
let _deskHistBound = false;

const CHECK_SORT_KEYS = ['place', 'date', 'tmpl', 'insp', 'urk'];
const RU_COLLATOR = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function histMulti() {
  return (window.activeMultiFilters && window.activeMultiFilters.history) || {};
}

function reportsSvc() {
  try {
    return window.RBI && window.RBI.services && window.RBI.services.reports;
  } catch (_) {
    return null;
  }
}

function locationsSvc() {
  try {
    return window.RBI && window.RBI.services && window.RBI.services.locations;
  } catch (_) {
    return null;
  }
}

function reportDocKind(r) {
  if (r && r.doc_kind) return String(r.doc_kind);
  const t = String((r && r.title) || '');
  if (/плакат/i.test(t)) return 'Плакат качества';
  if (/one.?pager|сводк/i.test(t)) return 'One-Pager';
  if (/день качества|quality day/i.test(t)) return 'День качества';
  if (/сводн|полный отчет|база проверок/i.test(t)) return 'Сводный отчёт';
  return 'Прочее';
}

function reportAuthor(r) {
  return String(r.created_by || r.engineer_name || (r.metadata && r.metadata.author) || 'Инженер').trim() || 'Инженер';
}

function reportPeriod(r) {
  const raw = (r.metadata && (r.metadata.period || r.metadata.periodLabel)) || '';
  return String(raw).trim() || 'Период не указан';
}

function reportProject(r) {
  return String((r.metadata && r.metadata.project) || 'Сводный Отчет').trim() || 'Сводный Отчет';
}

function filterHistoryRecords(allRecords) {
  const fSearch = (document.getElementById('hist-search-text')?.value || '').toLowerCase();
  const fPeriod = document.getElementById('hist-filter-period')?.value || 'D30';
  const fPhoto = document.getElementById('hist-filter-photo')?.checked;
  const fB3 = document.getElementById('hist-filter-b3')?.checked;
  const fPlan = document.getElementById('hist-filter-plan')?.checked;
  const mf = histMulti();
  const fProj = mf.project || [];
  const fContr = mf.contractor || [];
  const fInsp = mf.inspector || [];
  const fTmpl = mf.template || [];
  let arr = allRecords || [];
  const now = new Date();

  if (fSearch) {
    arr = arr.filter((i) => {
      const projectText = i.project_display_name || i.projectName || i.project_canonical_key || '';
      return (
        (i.location && String(i.location).toLowerCase().includes(fSearch))
        || (projectText && String(projectText).toLowerCase().includes(fSearch))
        || (i.inspectorName && String(i.inspectorName).toLowerCase().includes(fSearch))
        || (i.contractorName && String(i.contractorName).toLowerCase().includes(fSearch))
        || (i.templateTitle && String(i.templateTitle).toLowerCase().includes(fSearch))
      );
    });
  }
  if (fProj.length) {
    arr = arr.filter((i) => {
      const p = i.project_display_name || i.projectName || i.project_canonical_key || '';
      return fProj.includes(p) || fProj.includes(i.project_canonical_key);
    });
  }
  if (fContr.length) arr = arr.filter((i) => fContr.includes(i.contractorName));
  if (fInsp.length) arr = arr.filter((i) => fInsp.includes(i.inspectorName));
  if (fTmpl.length) arr = arr.filter((i) => fTmpl.includes(i.templateTitle || i.templateKey));
  if (fPeriod && fPeriod !== 'ALL') {
    const days = typeof window.getAnalyticsPeriodDays === 'function'
      ? window.getAnalyticsPeriodDays(fPeriod)
      : null;
    if (days) {
      const from = new Date(now);
      from.setDate(now.getDate() - days);
      arr = arr.filter((i) => new Date(i.date) >= from);
    }
  }
  if (fPhoto) arr = arr.filter((i) => i.photos && Object.keys(i.photos).length > 0);
  if (fB3) arr = arr.filter((i) => i.metrics && i.metrics.n_B3_fail > 0);
  if (fPlan) {
    arr = arr.filter((i) => {
      const pin = planPinOf(i);
      if (!pin) return false;
      return Number.isFinite(Number(pin.x)) && Number.isFinite(Number(pin.y)) && pin.locationId != null;
    });
  }
  return arr;
}

function filterReports(all) {
  const fSearch = (document.getElementById('hist-search-text')?.value || '').toLowerCase();
  const fPeriod = document.getElementById('hist-filter-period')?.value || 'D30';
  const mf = histMulti();
  const fProj = mf.project || [];
  const fContr = mf.contractor || [];
  const fInsp = mf.inspector || [];
  let arr = (all || []).filter((r) => !r.is_deleted);
  const now = new Date();

  if (fSearch) {
    arr = arr.filter((r) => (
      (r.title && String(r.title).toLowerCase().includes(fSearch))
      || (r.metadata?.project && String(r.metadata.project).toLowerCase().includes(fSearch))
    ));
  }
  if (fProj.length) {
    arr = arr.filter((r) => {
      const p = r.metadata?.project || '';
      return p.includes('Все объекты') || fProj.includes(p) || fProj.some((proj) => p.includes(proj));
    });
  }
  if (fContr.length) {
    arr = arr.filter((r) => fContr.some((c) => String(r.title || '').includes(c)));
  }
  if (fInsp.length) arr = arr.filter((r) => fInsp.includes(r.created_by));
  if (fPeriod !== 'ALL') {
    const days = typeof window.getAnalyticsPeriodDays === 'function'
      ? window.getAnalyticsPeriodDays(fPeriod)
      : null;
    if (days) {
      const from = new Date(now);
      from.setDate(now.getDate() - days);
      arr = arr.filter((i) => new Date(i.generated_at) >= from);
    }
  }
  return arr;
}

function ensureDeskStage(stage) {
  if (!stage) return null;
  Object.keys(DESK_IDS).forEach((mode) => {
    let el = document.getElementById(DESK_IDS[mode]);
    if (!el) {
      el = document.createElement('div');
      el.id = DESK_IDS[mode];
      el.className = 'ana-desk-hist-panel hidden';
      el.setAttribute('data-ana-desk-hist-mode', mode);
      stage.appendChild(el);
    } else if (el.parentElement !== stage) {
      stage.appendChild(el);
    }
  });
  return stage;
}

function showDeskMode(mode) {
  Object.keys(DESK_IDS).forEach((m) => {
    const el = document.getElementById(DESK_IDS[m]);
    if (el) el.classList.toggle('hidden', m !== mode);
  });
  // Hide mobile content views while desktop panels are active
  ['history-checks-view', 'history-reports-view', 'history-plans-view'].forEach((id) => {
    const v = document.getElementById(id);
    if (v) v.classList.add('hidden', 'ana-desk-hist-mobile-hide');
  });
}

function emptyHtml(title, hint) {
  return `<div class="ana-desk-hist-empty">`
    + `<p data-hist-empty-label="1">${esc(title)}</p>`
    + (hint ? `<span class="ana-desk-hist-empty-hint">${esc(hint)}</span>` : '')
    + `</div>`;
}

/* ─── Master–detail helpers ─────────────────────────────────────────── */

function groupByProject(items, nameOf) {
  const map = new Map();
  (items || []).forEach((item) => {
    const p = nameOf(item);
    if (!map.has(p)) map.set(p, []);
    map.get(p).push(item);
  });
  const names = Array.from(map.keys()).sort(RU_COLLATOR.compare);
  return { map, names };
}

function resolveSelectedProject(selected, names) {
  if (selected === 'ALL') return 'ALL';
  if (names.includes(selected)) return selected;
  return 'ALL';
}

function buildObjectRailHtml(kind, names, counts, selected, total) {
  const allOn = selected === 'ALL';
  const allBtn = `<button type="button" class="ana-desk-hist-obj${allOn ? ' is-on' : ''}" data-ana-desk-obj="${kind}" data-ana-desk-obj-id="ALL">`
    + `<span class="ana-desk-hist-obj-name">Все объекты</span>`
    + `<span class="ana-desk-hist-obj-count">${total}</span>`
    + `</button>`;
  const cards = names.map((name) => {
    const on = selected === name;
    return `<button type="button" class="ana-desk-hist-obj${on ? ' is-on' : ''}" data-ana-desk-obj="${kind}" data-ana-desk-obj-id="${esc(name)}">`
      + `<span class="ana-desk-hist-obj-name">${esc(name)}</span>`
      + `<span class="ana-desk-hist-obj-count">${counts.get(name) || 0}</span>`
      + `</button>`;
  }).join('');
  return `<aside class="ana-desk-hist-rail" aria-label="Объекты">`
    + `<div class="ana-desk-hist-rail-list">${allBtn}${cards}</div>`
    + `</aside>`;
}

function detailHeadHtml(title, count, unit) {
  return `<header class="ana-desk-hist-detail-head">`
    + `<h3 class="ana-desk-hist-detail-title">${esc(title)}</h3>`
    + `<span class="ana-desk-hist-detail-count">${count} ${unit}</span>`
    + `</header>`;
}

function checkProjectOf(item) {
  return item.project_display_name || item.projectName || 'Без объекта';
}

function checkSortValue(item, key) {
  if (key === 'place') return String(item.location || '');
  if (key === 'date') return new Date(item.date).getTime() || 0;
  if (key === 'tmpl') return String(item.templateTitle || '');
  if (key === 'insp') return String(item.inspectorName || '');
  if (key === 'urk') {
    const v = item.metrics && item.metrics.final;
    return (v == null || v === '') ? -1 : Number(v);
  }
  return '';
}

function sortChecks(items, sort) {
  const key = (sort && sort.key) || 'date';
  const dir = (sort && sort.dir) === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = checkSortValue(a, key);
    const vb = checkSortValue(b, key);
    let cmp = 0;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = RU_COLLATOR.compare(String(va), String(vb));
    if (cmp === 0) cmp = (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
    return cmp * dir;
  });
}

function sortMark(key) {
  if (_deskChecksSort.key !== key) return '';
  return _deskChecksSort.dir === 'asc' ? ' ↑' : ' ↓';
}

function buildChecksTableHtml(items) {
  const headCols = [
    ['place', 'Место'],
    ['date', 'Дата'],
    ['tmpl', 'Вид работ'],
    ['insp', 'Инспектор'],
    ['urk', 'УрК']
  ];
  const head = `<div class="ana-desk-hist-row-head" role="row">`
    + `<span></span>`
    + headCols.map(([key, label]) => (
      `<button type="button" class="ana-desk-hist-sort${_deskChecksSort.key === key ? ' is-on' : ''}" data-ana-desk-sort="${key}">`
      + `${esc(label)}${sortMark(key)}</button>`
    )).join('')
    + `</div>`;

  const rows = items.map((item) => {
    const id = String(item.id);
    const place = item.location || 'Без локации';
    const when = new Date(item.date).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const tmpl = item.templateTitle || '—';
    const insp = item.inspectorName || '—';
    const finalPct = (item.metrics && item.metrics.final != null) ? item.metrics.final : '—';
    const statusCls = (item.metrics && item.metrics.statusCls) || '';
    const hasPhoto = !!(item.photos && Object.keys(item.photos).length);
    return `<div class="ana-desk-hist-row" data-hist-id="${esc(id)}" role="row">`
      + `<input type="checkbox" class="hist-checkbox ana-desk-hist-row-cb" value="${esc(id)}">`
      + `<button type="button" class="ana-desk-hist-row-main" data-ana-desk-open-check="${esc(id)}">`
      + `<span class="ana-desk-hist-row-place">${esc(place)}${hasPhoto ? ' · фото' : ''}</span>`
      + `<span class="ana-desk-hist-row-when">${esc(when)}</span>`
      + `<span class="ana-desk-hist-row-tmpl">${esc(tmpl)}</span>`
      + `<span class="ana-desk-hist-row-insp">${esc(insp)}</span>`
      + `<span class="ana-desk-hist-row-urk status-tag ${esc(statusCls)}">${esc(String(finalPct))}${finalPct !== '—' ? '%' : ''}</span>`
      + `</button>`
      + `</div>`;
  }).join('');

  return `<div class="ana-desk-hist-journal" role="table">${head}${rows}</div>`;
}

function reportFileCard(r) {
  const isPptx = (r.mime_type && String(r.mime_type).includes('presentation'))
    || r.report_type === 'pptx'
    || /\.pptx$/i.test(String(r.title || ''));
  const type = isPptx ? 'PPTX' : 'PDF';
  const typeCls = isPptx ? 'is-pptx' : 'is-pdf';
  const kind = reportDocKind(r);
  const author = reportAuthor(r);
  const period = reportPeriod(r);
  const dateStr = new Date(r.generated_at).toLocaleDateString('ru-RU');
  const sizeStr = (((r.file_size || 0) / 1024 / 1024).toFixed(2)) + ' MB';
  const isOwner = !r.created_by || r.created_by === ((window.RBI?.services?.settings?.get?.('engineerName')) || 'Инженер');
  const safeTitle = String(r.title || '').replace(/'/g, "\\'");
  const project = reportProject(r);
  return `<article class="ana-desk-hist-file" data-report-id="${esc(r.id)}" role="button" tabindex="0">`
    + `<input type="checkbox" class="report-checkbox ana-desk-hist-file-cb" value="${esc(r.id)}">`
    + `<span class="ana-desk-hist-file-type ${typeCls}">${type}</span>`
    + `<div class="ana-desk-hist-file-body">`
    + `<div class="ana-desk-hist-file-title">${esc(r.title || 'Без названия')}</div>`
    + `<div class="ana-desk-hist-file-meta">${esc(kind !== 'Прочее' ? kind : 'Отчёт')}`
    + `${_deskReportsProject === 'ALL' ? ' · ' + esc(project) : ''}</div>`
    + `<div class="ana-desk-hist-file-sub">${esc(author)} · ${esc(period)} · ${esc(sizeStr)}</div>`
    + `</div>`
    + `<div class="ana-desk-hist-file-side">`
    + `<time class="ana-desk-hist-file-date">${esc(dateStr)}</time>`
    + `<button type="button" class="ana-desk-hist-file-more" data-ana-desk-report-more="${esc(r.id)}" data-owner="${isOwner ? '1' : '0'}" data-title="${esc(safeTitle)}" aria-label="Действия">⋮</button>`
    + `</div>`
    + `</article>`;
}

/* ─── Reports: object rail + file cards ─────────────────────────────── */

function paintDeskReports() {
  const host = document.getElementById(DESK_IDS.reports);
  if (!host) return;
  const svc = reportsSvc();
  const all = svc && typeof svc.getAllSync === 'function' ? svc.getAllSync() : [];
  const filtered = filterReports(all);

  if (!all.length) {
    host.innerHTML = emptyHtml('Сохранённых отчётов пока нет.', 'Сформируйте отчёт — он появится здесь.');
    return;
  }
  if (!filtered.length) {
    host.innerHTML = emptyHtml('По выбранным фильтрам отчётов не найдено.', 'Смягчите период или объект.');
    return;
  }

  const kindCounts = new Map();
  filtered.forEach((r) => {
    const k = reportDocKind(r);
    kindCounts.set(k, (kindCounts.get(k) || 0) + 1);
  });
  if (_deskReportsDocKind !== 'ALL' && !kindCounts.has(_deskReportsDocKind)) {
    _deskReportsDocKind = 'ALL';
  }
  let byKind = filtered;
  if (_deskReportsDocKind !== 'ALL') {
    byKind = filtered.filter((r) => reportDocKind(r) === _deskReportsDocKind);
  }

  const { map, names } = groupByProject(byKind, reportProject);
  _deskReportsProject = resolveSelectedProject(_deskReportsProject, names);
  const selectedItems = _deskReportsProject === 'ALL'
    ? byKind.slice().sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))
    : (map.get(_deskReportsProject) || []).slice()
      .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));

  const counts = new Map(names.map((n) => [n, (map.get(n) || []).length]));
  const rail = buildObjectRailHtml('reports', names, counts, _deskReportsProject, byKind.length);

  const kinds = Array.from(kindCounts.keys()).sort(RU_COLLATOR.compare);
  let chips = '';
  if (kinds.length > 1) {
    const chip = (label, value, count, on) => (
      `<button type="button" class="ana-desk-hist-chip${on ? ' is-on' : ''}" data-ana-desk-doc-kind="${esc(value)}">`
      + `${esc(label)} <span>${count}</span></button>`
    );
    chips = `<div class="ana-desk-hist-chips">`
      + chip('Все', 'ALL', filtered.length, _deskReportsDocKind === 'ALL')
      + kinds.map((k) => chip(k, k, kindCounts.get(k), _deskReportsDocKind === k)).join('')
      + `</div>`;
  }

  const actions = `<div class="ana-desk-hist-reports-actions">`
    + `<label class="ana-desk-hist-check-all"><input type="checkbox" id="ana-desk-reports-select-all" class="accent-indigo-600"> Выбрать всё</label>`
    + `<button type="button" class="ana-desk-hist-danger-btn" data-analytics-action="deleteSelectedReports">Удалить выбранные</button>`
    + `</div>`;

  const title = _deskReportsProject === 'ALL' ? 'Все объекты' : _deskReportsProject;
  let body = '';
  if (!selectedItems.length) {
    body = emptyHtml('В этом объекте нет отчётов.', 'Выберите другой объект или смягчите фильтр вида документа.');
  } else {
    body = `<div class="ana-desk-hist-files">${selectedItems.map(reportFileCard).join('')}</div>`;
  }

  const detail = `<div class="ana-desk-hist-detail">`
    + detailHeadHtml(title, selectedItems.length, selectedItems.length === 1 ? 'отчёт' : 'отчётов')
    + chips + actions + body
    + `</div>`;

  host.innerHTML = `<div class="ana-desk-hist-split">${rail}${detail}</div>`;
}

/* ─── Checks: object rail + sortable table ──────────────────────────── */

function paintDeskChecks() {
  const host = document.getElementById(DESK_IDS.checks);
  if (!host) return;
  const records = (window.HistoryState && window.HistoryState.allRecords) || [];
  const filtered = filterHistoryRecords(records);

  if (!records.length) {
    host.innerHTML = emptyHtml('История пуста.', 'Создайте проверку или смягчите фильтры.');
    return;
  }
  if (!filtered.length) {
    host.innerHTML = emptyHtml('Нет проверок по фильтрам.', 'Смягчите период, объект или другие условия.');
    return;
  }

  const { map, names } = groupByProject(filtered, checkProjectOf);
  _deskChecksProject = resolveSelectedProject(_deskChecksProject, names);
  const selectedItems = _deskChecksProject === 'ALL'
    ? filtered
    : (map.get(_deskChecksProject) || []);
  const sorted = sortChecks(selectedItems, _deskChecksSort);

  const counts = new Map(names.map((n) => [n, (map.get(n) || []).length]));
  const rail = buildObjectRailHtml('checks', names, counts, _deskChecksProject, filtered.length);
  const title = _deskChecksProject === 'ALL' ? 'Все объекты' : _deskChecksProject;

  let body = '';
  if (!sorted.length) {
    body = emptyHtml('В этом объекте нет проверок.', 'Выберите другой объект.');
  } else {
    body = buildChecksTableHtml(sorted);
  }

  let more = '';
  if (window.HistoryState && window.HistoryState.pageHasMore) {
    more = `<button type="button" class="ana-desk-hist-more" data-history-action="loadMoreHistoryPage">Загрузить ещё</button>`;
  }

  const detail = `<div class="ana-desk-hist-detail">`
    + detailHeadHtml(title, sorted.length, sorted.length === 1 ? 'проверка' : 'проверок')
    + body + more
    + `</div>`;

  host.innerHTML = `<div class="ana-desk-hist-split">${rail}${detail}</div>`;
}

/* ─── Plans: project cards with floors visible ──────────────────────── */

function resolveLocationObject(loc, projectName) {
  if (!loc || !projectName) return null;
  if (typeof loc.resolveObjectLink === 'function') {
    try {
      const link = loc.resolveObjectLink({ displayName: projectName });
      if (link && link.locationObject) return link.locationObject;
    } catch (_) { /* ignore */ }
  }
  const objects = (typeof loc.listNodes === 'function'
    ? loc.listNodes({ nodeType: 'object', parentId: null })
    : []) || [];
  const pn = String(projectName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return objects.find((o) => {
    const a = String(o.displayName || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const b = String(o.canonical_key || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return a === pn || b === pn;
  }) || null;
}

function pdfFloorsForObject(loc, objectNode) {
  if (!loc || !objectNode) return [];
  const buildings = (loc.getChildren(objectNode.id) || []).filter((n) => !n.nodeType || n.nodeType === 'building');
  const rows = [];
  buildings.forEach((b) => {
    const sections = (loc.getChildren(b.id) || []).filter((n) => !n.nodeType || n.nodeType === 'section');
    sections.forEach((s) => {
      (loc.getChildren(s.id) || []).forEach((f) => {
        if (f.nodeType !== 'floor') return;
        const plan = loc.getPlanForFloor(f.id);
        if (!plan || !plan.pdf_url) return;
        rows.push({
          id: String(f.id),
          name: f.displayName || f.id,
          buildingId: String(b.id),
          buildingName: b.displayName || '',
          buildingsCount: buildings.length,
          sectionId: String(s.id),
          sectionName: s.displayName || 'Секция',
          sectionsCount: sections.length
        });
      });
    });
  });
  return rows;
}

function pinItemsOnFloor(filteredArr, floorId) {
  const fid = String(floorId);
  return (filteredArr || []).filter((item) => {
    const pin = planPinOf(item);
    return !!(pin && String(pin.locationId) === fid
      && Number.isFinite(Number(pin.x)) && Number.isFinite(Number(pin.y)));
  });
}

function groupPdfFloors(floors) {
  const buildings = [];
  const bMap = new Map();
  (floors || []).forEach((row) => {
    const bKey = row.buildingId || row.buildingName || '_';
    let b = bMap.get(bKey);
    if (!b) {
      b = {
        buildingId: row.buildingId,
        buildingName: row.buildingName || '',
        sections: [],
        sMap: new Map()
      };
      bMap.set(bKey, b);
      buildings.push(b);
    }
    const sKey = row.sectionId || row.sectionName || '_';
    let s = b.sMap.get(sKey);
    if (!s) {
      s = { sectionId: row.sectionId, sectionName: row.sectionName || 'Секция', floors: [] };
      b.sMap.set(sKey, s);
      b.sections.push(s);
    }
    s.floors.push(row);
  });
  buildings.forEach((b) => { delete b.sMap; });
  return buildings;
}

function projectNameOf(item) {
  return (item && (item.project_display_name || item.projectName)) || 'Без объекта';
}

function buildPlanFloorsHtml(loc, pName, filtered) {
  const obj = resolveLocationObject(loc, pName);
  if (!obj) return null;
  const floors = pdfFloorsForObject(loc, obj);
  if (!floors.length) return null;
  let totalPins = 0;
  const groups = groupPdfFloors(floors);
  const showBuilding = groups.length > 1;
  const parts = [];
  groups.forEach((b) => {
    if (showBuilding && b.buildingName) {
      parts.push(`<div class="ana-desk-hist-plan-building">${esc(b.buildingName)}</div>`);
    }
    b.sections.forEach((s) => {
      parts.push(`<div class="ana-desk-hist-plan-section">${esc(s.sectionName)}</div>`);
      s.floors.forEach((row) => {
        const pins = pinItemsOnFloor(filtered, row.id);
        _deskPlansFloorItems.set(String(row.id), pins);
        totalPins += pins.length;
        const countCls = pins.length ? 'has-pins' : 'no-pins';
        parts.push(
          `<button type="button" class="ana-desk-hist-floor ${countCls}" data-ana-desk-floor="${esc(row.id)}">`
          + `<span class="ana-desk-hist-floor-name">${esc(row.name)}</span>`
          + `<span class="ana-desk-hist-floor-count">${pins.length} ${pins.length === 1 ? 'точка' : (pins.length > 1 && pins.length < 5 ? 'точки' : 'точек')}</span>`
          + `</button>`
        );
      });
    });
  });
  const floorsLabel = floors.length === 1
    ? '1 этаж'
    : (floors.length < 5 ? floors.length + ' этажа' : floors.length + ' этажей');
  return {
    html: `<div class="ana-desk-hist-plan-floors">${parts.join('')}</div>`,
    floors: floors.length,
    totalPins,
    floorsLabel
  };
}

function paintDeskPlans() {
  const host = document.getElementById(DESK_IDS.plans);
  if (!host) return;
  const loc = locationsSvc();
  const records = (window.HistoryState && window.HistoryState.allRecords) || [];
  // Plans: object rail owns project selection — ignore multifilter.project here
  const filtered = filterHistoryRecords(records);
  _deskPlansFloorItems = new Map();

  if (!loc || typeof loc.getPlanForFloor !== 'function') {
    host.innerHTML = emptyHtml('Справочник локаций недоступен.', '');
    return;
  }

  const candidateNames = [];
  const seen = new Set();
  filtered.forEach((item) => {
    const p = projectNameOf(item);
    if (!seen.has(p)) {
      seen.add(p);
      candidateNames.push(p);
    }
  });
  // Also include location objects that have PDF plans even if no checks in filter window
  try {
    const objects = (typeof loc.listNodes === 'function'
      ? loc.listNodes({ nodeType: 'object', parentId: null })
      : []) || [];
    objects.forEach((o) => {
      const name = o.displayName || o.canonical_key;
      if (!name || seen.has(name)) return;
      if (pdfFloorsForObject(loc, o).length) {
        seen.add(name);
        candidateNames.push(name);
      }
    });
  } catch (_) { /* ignore */ }
  candidateNames.sort(RU_COLLATOR.compare);

  const usable = [];
  const counts = new Map();
  candidateNames.forEach((pName) => {
    const built = buildPlanFloorsHtml(loc, pName, filtered);
    if (!built) return;
    usable.push({ pName, ...built });
    counts.set(pName, built.floors);
  });

  if (!usable.length) {
    host.innerHTML = emptyHtml(
      'Нет объектов с PDF-планами по фильтрам.',
      'Проверьте привязку планов этажей или смягчите фильтр.'
    );
    return;
  }

  const names = usable.map((u) => u.pName);
  _deskPlansProject = resolveSelectedProject(_deskPlansProject, names);
  const totalFloors = usable.reduce((s, u) => s + u.floors, 0);
  const rail = buildObjectRailHtml('plans', names, counts, _deskPlansProject, totalFloors);

  const selected = _deskPlansProject === 'ALL'
    ? usable
    : usable.filter((u) => u.pName === _deskPlansProject);

  const title = _deskPlansProject === 'ALL' ? 'Все объекты' : _deskPlansProject;
  const floorCount = selected.reduce((s, u) => s + u.floors, 0);
  const pinCount = selected.reduce((s, u) => s + u.totalPins, 0);

  let body = '';
  if (!selected.length) {
    body = emptyHtml('У этого объекта нет PDF-планов.', 'Выберите другой объект.');
  } else if (_deskPlansProject === 'ALL') {
    body = `<div class="ana-desk-hist-plans">${selected.map((u) => (
      `<section class="ana-desk-hist-plan-card">`
      + `<header class="ana-desk-hist-plan-head">`
      + `<div><h3 class="ana-desk-hist-plan-title">${esc(u.pName)}</h3>`
      + `<p class="ana-desk-hist-plan-sub">${esc(u.floorsLabel)} · ${u.totalPins} на планах</p></div>`
      + `</header>${u.html}</section>`
    )).join('')}</div>`;
  } else {
    const u = selected[0];
    body = `<div class="ana-desk-hist-plans"><section class="ana-desk-hist-plan-card ana-desk-hist-plan-card--bare">`
      + `<p class="ana-desk-hist-plan-sub">${esc(u.floorsLabel)} · ${pinCount} на планах</p>`
      + u.html
      + `</section></div>`;
  }

  const detail = `<div class="ana-desk-hist-detail">`
    + detailHeadHtml(title, floorCount, floorCount === 1 ? 'этаж' : (floorCount > 1 && floorCount < 5 ? 'этажа' : 'этажей'))
    + body
    + `</div>`;

  host.innerHTML = `<div class="ana-desk-hist-split">${rail}${detail}</div>`;
}

/* ─── Public paint API ──────────────────────────────────────────────── */

export function paintHistoryContent(mode) {
  const m = mode || window.currentHistoryViewMode || 'checks';
  showDeskMode(m);
  // Object rail owns project selection on desktop — drop multifilter duplicate
  try {
    if (window.activeMultiFilters && window.activeMultiFilters.history) {
      window.activeMultiFilters.history.project = [];
    }
    const projBtn = document.getElementById('btn-hist-project');
    const span = projBtn && projBtn.querySelector('span.truncate');
    if (span) span.textContent = 'Все объекты';
  } catch (_) { /* ignore */ }
  if (m === 'reports') paintDeskReports();
  else if (m === 'plans') paintDeskPlans();
  else paintDeskChecks();
}

export function ensureHistoryDeskContainers(stage) {
  return ensureDeskStage(stage);
}

export function clearHistoryDeskPanels() {
  Object.keys(DESK_IDS).forEach((m) => {
    const el = document.getElementById(DESK_IDS[m]);
    if (el) el.remove();
  });
  ['history-checks-view', 'history-reports-view', 'history-plans-view'].forEach((id) => {
    const v = document.getElementById(id);
    if (v) v.classList.remove('ana-desk-hist-mobile-hide');
  });
  _deskPlansFloorItems = new Map();
  _deskChecksProject = 'ALL';
  _deskReportsProject = 'ALL';
  _deskPlansProject = 'ALL';
  _deskChecksSort = { key: 'date', dir: 'desc' };
  _deskReportsDocKind = 'ALL';
}

export function bindHistoryDeskEvents() {
  if (_deskHistBound) return;
  _deskHistBound = true;

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;

    const objBtn = t.closest('[data-ana-desk-obj]');
    if (objBtn) {
      e.preventDefault();
      const kind = objBtn.getAttribute('data-ana-desk-obj');
      const id = objBtn.getAttribute('data-ana-desk-obj-id') || 'ALL';
      if (kind === 'checks') {
        _deskChecksProject = id;
        paintDeskChecks();
      } else if (kind === 'reports') {
        _deskReportsProject = id;
        paintDeskReports();
      } else if (kind === 'plans') {
        _deskPlansProject = id;
        paintDeskPlans();
      }
      return;
    }

    const sortBtn = t.closest('[data-ana-desk-sort]');
    if (sortBtn) {
      e.preventDefault();
      const key = sortBtn.getAttribute('data-ana-desk-sort');
      if (!CHECK_SORT_KEYS.includes(key)) return;
      if (_deskChecksSort.key === key) {
        _deskChecksSort = { key, dir: _deskChecksSort.dir === 'asc' ? 'desc' : 'asc' };
      } else {
        _deskChecksSort = { key, dir: key === 'date' || key === 'urk' ? 'desc' : 'asc' };
      }
      paintDeskChecks();
      return;
    }

    const chip = t.closest('[data-ana-desk-doc-kind]');
    if (chip) {
      e.preventDefault();
      _deskReportsDocKind = chip.getAttribute('data-ana-desk-doc-kind') || 'ALL';
      paintDeskReports();
      return;
    }

    const more = t.closest('[data-ana-desk-report-more]');
    if (more) {
      e.preventDefault();
      e.stopPropagation();
      const id = more.getAttribute('data-ana-desk-report-more');
      const title = more.getAttribute('data-title') || '';
      const isOwner = more.getAttribute('data-owner') === '1';
      if (typeof window.openUniversalActionSheet === 'function') {
        window.openUniversalActionSheet(id, 'report', title, isOwner);
      }
      return;
    }

    const file = t.closest('.ana-desk-hist-file');
    if (file && !t.closest('input, button')) {
      e.preventDefault();
      const id = file.getAttribute('data-report-id');
      if (id && typeof window.openReport === 'function') window.openReport(id);
      return;
    }

    const openCheck = t.closest('[data-ana-desk-open-check]');
    if (openCheck) {
      e.preventDefault();
      const id = openCheck.getAttribute('data-ana-desk-open-check');
      if (id && typeof window.showHistoryDetail === 'function') window.showHistoryDetail(id);
      return;
    }

    const floor = t.closest('[data-ana-desk-floor]');
    if (floor) {
      e.preventDefault();
      e.stopPropagation();
      const floorId = floor.getAttribute('data-ana-desk-floor');
      const items = _deskPlansFloorItems.get(String(floorId)) || [];
      openHistoryPlanViewer({ floorId: floorId, items: items });
      return;
    }

    if (t.id === 'ana-desk-reports-select-all') {
      return; // handled on change
    }
  }, true);

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t) return;
    if (t.id === 'ana-desk-reports-select-all') {
      const on = !!t.checked;
      document.querySelectorAll('#ana-desk-hist-reports .report-checkbox').forEach((el) => {
        el.checked = on;
      });
    }
  }, true);
}
