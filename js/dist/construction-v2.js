const ConstructionV2Manifest = {
  id: "construction-v2",
  role: "module",
  title: "Стройконтроль (новый)",
  icon: "hard-hat",
  version: "0.1.0",
  status: "active",
  entry: "./index.js",
  menu: { section: "construction", label: "СК (новый)", order: 11 },
  company: { enabledByDefault: true },
  routes: ["/construction-v2", "/construction-v2/:subTab"],
  defaultRoute: "/construction-v2"
};
const DEFECT_CATEGORIES_V2 = ["B1", "B2", "B3"];
function _escape$6(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _contractors() {
  var _a, _b;
  const svc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.contractors;
  const rows = typeof (svc == null ? void 0 : svc.list) === "function" ? svc.list() : [];
  const fromSvc = (rows || []).filter((r) => r && r.id).map((r) => ({
    id: String(r.id),
    label: String(r.display_name || r.displayName || r.id)
  }));
  if (fromSvc.length) {
    return fromSvc.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }
  const dir = window.ContractorDirectory;
  const list = (dir == null ? void 0 : dir.contractors) || [];
  return list.filter((c) => c && (c.id || c.display_name)).map((c) => ({
    id: String(c.id || c.display_name),
    label: String(c.display_name || c.id)
  })).sort((a, b) => a.label.localeCompare(b.label, "ru"));
}
function _sysTemplates$1() {
  return window.SYSTEM_TEMPLATES || {};
}
function _userTemplates$1() {
  return window.userTemplates || {};
}
function _flatItems(groups) {
  const items = [];
  (groups || []).forEach((g) => {
    if (g == null ? void 0 : g.items) items.push(...g.items);
  });
  return items;
}
function _resolveTemplateGroups(tmplKey) {
  var _a, _b;
  if (!tmplKey) return [];
  const type = tmplKey.split("_")[0];
  const key = tmplKey.replace(type + "_", "");
  if (type === "sys") return ((_a = _sysTemplates$1()[key]) == null ? void 0 : _a.groups) || [];
  if (type === "user") return ((_b = _userTemplates$1()[key]) == null ? void 0 : _b.groups) || [];
  return [];
}
function _catLabel(c) {
  if (c === "B1" || c === "minor") return "B1 (Мелкий)";
  if (c === "B3" || c === "critical") return "B3 (Критика)";
  return "B2 (Значимый)";
}
function _statusLabel(s) {
  const map = {
    issued: "Выдано",
    in_progress: "В работе",
    fixed: "Устранено",
    closed: "Закрыто",
    rejected: "Отклонено",
    open: "Выдано",
    cancelled: "Отклонено"
  };
  return map[s] || s;
}
function _deadlineInputValue(v) {
  if (v == null || v === "") return "";
  const m = String(v).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}
function _roleInfo$1() {
  var _a, _b, _c, _d;
  const perms = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.permissions;
  const role = ((_c = perms == null ? void 0 : perms.getCurrentRole) == null ? void 0 : _c.call(perms)) || "guest";
  const isEngineer = ((_d = perms == null ? void 0 : perms.isEngineerOrAdmin) == null ? void 0 : _d.call(perms)) ?? ["engineer", "manager", "deputy_manager", "admin"].includes(role);
  const isContractor = role === "contractor";
  return { role, isEngineer, isContractor };
}
function _photoSrc(ref) {
  if (!ref) return "";
  const pm = window.PhotoManager;
  if (pm == null ? void 0 : pm.getDisplaySrc) return pm.getDisplaySrc(ref) || ref;
  if (pm == null ? void 0 : pm.getSrc) return pm.getSrc(ref) || ref;
  const g = window.getPhotoThumbSrc || window.getPhotoSrc;
  return (typeof g === "function" ? g(ref) : null) || ref;
}
function _openPhoto(ref) {
  const fn = window.openPhotoViewer;
  if (typeof fn === "function") fn(ref);
}
async function _fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Не удалось прочитать файл"));
    r.readAsDataURL(file);
  });
}
async function _savePhotoFiles(files) {
  const list = Array.from(files || []).filter((f) => f && f.type && f.type.startsWith("image/"));
  if (!list.length) return [];
  const pm = window.PhotoManager;
  const out = [];
  for (const file of list) {
    const dataUrl = await _fileToDataUrl(file);
    if (!dataUrl.startsWith("data:")) continue;
    if (pm == null ? void 0 : pm.saveLocal) {
      const id = await pm.saveLocal(dataUrl, "cdef", { entityType: "construction_defect_v2" });
      if (id) out.push(id);
    } else {
      out.push(dataUrl);
    }
  }
  return out;
}
function _ensureOverlay() {
  let el = document.getElementById("c2-defect-modal");
  if (el) return el;
  el = document.createElement("div");
  el.id = "c2-defect-modal";
  el.className = "fixed inset-0 z-[600] hidden items-center justify-center bg-black/40 p-3";
  el.innerHTML = `<div class="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-xl p-4" data-c2-defect-panel></div>`;
  document.body.appendChild(el);
  return el;
}
function closeDefectForm() {
  const el = document.getElementById("c2-defect-modal");
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
}
function _templateOptionsHtml(selected) {
  let html = '<option value="">— вид работ —</option>';
  const st = _sysTemplates$1();
  Object.keys(st).sort().forEach((k) => {
    const sel = selected === `sys_${k}` ? " selected" : "";
    html += `<option value="sys_${_escape$6(k)}"${sel}>[СИС] ${_escape$6(st[k].title || k)}</option>`;
  });
  const ut = _userTemplates$1();
  Object.keys(ut).sort().forEach((k) => {
    const sel = selected === `user_${k}` ? " selected" : "";
    html += `<option value="user_${_escape$6(k)}"${sel}>[МОЙ] ${_escape$6(ut[k].title || k)}</option>`;
  });
  return html;
}
function _contractorOptionsHtml(selected) {
  const opts = _contractors();
  return `<option value="">— без подрядчика —</option>` + opts.map((o) => {
    const sel = selected === o.id ? " selected" : "";
    return `<option value="${_escape$6(o.id)}"${sel}>${_escape$6(o.label)}</option>`;
  }).join("");
}
function _renderGallery(photos) {
  if (!photos.length) {
    return `<div class="text-[10px] text-slate-400 mb-2" data-c2-photo-empty>Нет фото</div>`;
  }
  return `<div class="grid grid-cols-3 gap-2 mb-2" data-c2-photo-grid>
    ${photos.map(
    (p, i) => `<div class="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" data-c2-photo-idx="${i}">
      <img src="${_escape$6(_photoSrc(p))}" alt="" class="w-full h-full object-cover cursor-pointer" data-c2-photo-view="${_escape$6(p)}" />
      <button type="button" data-c2-photo-remove="${i}"
        class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-black">✕</button>
    </div>`
  ).join("")}
  </div>`;
}
function _bindGallery(panel, photosRef, onChange) {
  const refresh = () => {
    const host = panel.querySelector("[data-c2-photo-host]");
    if (host) host.innerHTML = _renderGallery(photosRef.current);
    _bindGallery(panel, photosRef, onChange);
  };
  panel.querySelectorAll("[data-c2-photo-view]").forEach((el) => {
    el.addEventListener("click", () => {
      const ref = el.getAttribute("data-c2-photo-view") || "";
      if (ref) _openPhoto(ref);
    });
  });
  panel.querySelectorAll("[data-c2-photo-remove]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      const idx = Number(el.getAttribute("data-c2-photo-remove"));
      if (!Number.isFinite(idx)) return;
      photosRef.current = photosRef.current.filter((_, i) => i !== idx);
      refresh();
      onChange();
    });
  });
  const input = panel.querySelector("[data-c2-photo-input]");
  if (input && !input._c2Bound) {
    input._c2Bound = true;
    input.addEventListener("change", async () => {
      var _a;
      try {
        const added = await _savePhotoFiles(input.files || []);
        if (added.length) {
          photosRef.current = photosRef.current.concat(added);
          refresh();
          onChange();
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        (_a = window.showToast) == null ? void 0 : _a.call(window, "❌ " + msg);
      } finally {
        input.value = "";
      }
    });
  }
}
function _bindItemSearch(panel) {
  const search = panel.querySelector("[data-c2-item-search]");
  const dd = panel.querySelector("[data-c2-item-dd]");
  const tmpl = panel.querySelector("[data-c2-template]");
  const itemIdEl = panel.querySelector("[data-c2-item-id]");
  const itemNameEl = panel.querySelector("[data-c2-item-name]");
  const normBlock = panel.querySelector("[data-c2-norm-block]");
  const normText = panel.querySelector("[data-c2-norm-text]");
  const desc = panel.querySelector("[data-c2-defect-desc]");
  const cat = panel.querySelector("[data-c2-defect-cat]");
  const hideDd = () => dd == null ? void 0 : dd.classList.add("hidden");
  tmpl == null ? void 0 : tmpl.addEventListener("change", () => {
    if (itemIdEl) itemIdEl.value = "";
    if (itemNameEl) itemNameEl.value = "";
    if (search) search.value = "";
    normBlock == null ? void 0 : normBlock.classList.add("hidden");
    hideDd();
  });
  const runSearch = (query) => {
    if (!dd) return;
    const tmplKey = (tmpl == null ? void 0 : tmpl.value) || "";
    if (!tmplKey) {
      dd.innerHTML = '<div class="p-3 text-[10px] text-slate-500 font-bold text-center">Сначала выберите вид работ</div>';
      dd.classList.remove("hidden");
      return;
    }
    const flat = _flatItems(_resolveTemplateGroups(tmplKey));
    const q = query.toLowerCase().trim();
    const matched = flat.filter(
      (i) => {
        var _a;
        return ((_a = i.n) == null ? void 0 : _a.toLowerCase().includes(q)) || i.t && i.t.toLowerCase().includes(q);
      }
    );
    if (!matched.length) {
      dd.innerHTML = '<div class="p-3 text-[10px] text-slate-500 font-bold text-center">Ничего не найдено</div>';
      dd.classList.remove("hidden");
      return;
    }
    dd.innerHTML = matched.map((i) => {
      const w = Number(i.w) || 2;
      return `<button type="button" class="w-full text-left p-2 border-b border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
          data-c2-pick-item data-id="${_escape$6(i.id)}" data-name="${_escape$6(i.n)}" data-w="${w}" data-norm="${_escape$6(i.t || "")}">
          <div class="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
            <span class="text-[9px] font-black text-white bg-slate-400 px-1 rounded mr-1">B${w}</span>${_escape$6(i.n)}
          </div>
        </button>`;
    }).join("");
    dd.classList.remove("hidden");
    dd.querySelectorAll("[data-c2-pick-item]").forEach((btn) => {
      btn.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        const el = btn;
        const id = el.getAttribute("data-id") || "";
        const name = el.getAttribute("data-name") || "";
        const w = Number(el.getAttribute("data-w") || 2);
        const norm = el.getAttribute("data-norm") || "";
        if (itemIdEl) itemIdEl.value = id;
        if (itemNameEl) itemNameEl.value = name;
        if (search) search.value = name;
        if (norm && normText && normBlock) {
          normText.textContent = norm;
          normBlock.classList.remove("hidden");
        } else {
          normBlock == null ? void 0 : normBlock.classList.add("hidden");
        }
        if (desc) {
          let auto = `Нарушение: ${name}.`;
          if (norm && norm !== "Без норматива") auto += ` Требования: ${norm}`;
          desc.value = auto;
        }
        if (cat) {
          if (w === 1) cat.value = "B1";
          else if (w === 3) cat.value = "B3";
          else cat.value = "B2";
        }
        hideDd();
      });
    });
  };
  search == null ? void 0 : search.addEventListener("input", () => runSearch(search.value));
  search == null ? void 0 : search.addEventListener("focus", () => runSearch(search.value));
  search == null ? void 0 : search.addEventListener("blur", () => setTimeout(hideDd, 150));
}
function _readCommonFields(panel) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const description = ((_b = (_a = panel.querySelector("[data-c2-defect-desc]")) == null ? void 0 : _a.value) == null ? void 0 : _b.trim()) || "";
  const category = ((_c = panel.querySelector("[data-c2-defect-cat]")) == null ? void 0 : _c.value) || "B2";
  const contractorId = ((_d = panel.querySelector("[data-c2-defect-contractor]")) == null ? void 0 : _d.value) || "";
  const deadlineRaw = ((_e = panel.querySelector("[data-c2-defect-deadline]")) == null ? void 0 : _e.value) || "";
  const template_key = ((_f = panel.querySelector("[data-c2-template]")) == null ? void 0 : _f.value) || "";
  const item_id = ((_g = panel.querySelector("[data-c2-item-id]")) == null ? void 0 : _g.value) || "";
  const item_name = ((_h = panel.querySelector("[data-c2-item-name]")) == null ? void 0 : _h.value) || ((_i = panel.querySelector("[data-c2-item-search]")) == null ? void 0 : _i.value) || "";
  const norm_text = ((_k = (_j = panel.querySelector("[data-c2-norm-text]")) == null ? void 0 : _j.textContent) == null ? void 0 : _k.trim()) || "";
  return {
    description,
    category,
    contractorId: contractorId || null,
    deadline: deadlineRaw || null,
    template_key: template_key || null,
    item_id: item_id || null,
    item_name: item_name || null,
    norm_text: norm_text || null
  };
}
function _historyHtml(history) {
  const list = Array.isArray(history) ? history : [];
  if (!list.length) return "";
  const rows = [...list].reverse().map((h) => {
    const stName = _statusLabel(String(h.status || ""));
    let dDate = "";
    try {
      dDate = new Date(h.date).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      dDate = String(h.date || "");
    }
    const photos = Array.isArray(h.photos) && h.photos.length ? h.photos : h.photo ? [h.photo] : [];
    const photosHtml = photos.map(
      (p) => `<img src="${_escape$6(_photoSrc(String(p)))}" class="w-10 h-10 object-cover rounded border cursor-pointer mt-1" data-c2-photo-view="${_escape$6(String(p))}" alt="" />`
    ).join("");
    return `<div class="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
      <div class="flex justify-between font-bold mb-1"><span class="text-indigo-600">${_escape$6(stName)}</span><span class="text-slate-400">${_escape$6(dDate)}</span></div>
      <div class="text-slate-600 dark:text-slate-300">${_escape$6(h.user || "")}${h.comment ? ` — <i>${_escape$6(String(h.comment))}</i>` : ""}</div>
      <div class="flex gap-1 flex-wrap">${photosHtml}</div>
    </div>`;
  });
  return `<div class="w-full mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2 max-h-36 overflow-y-auto" data-c2-history>
    ${rows.join("")}
  </div>`;
}
function openCreateDefectForm(coords, onSave, onCancel) {
  var _a, _b;
  const root = _ensureOverlay();
  const panel = root.querySelector("[data-c2-defect-panel]");
  const photosRef = { current: [] };
  const catOpts = DEFECT_CATEGORIES_V2.map(
    (c) => `<option value="${c}"${c === "B2" ? " selected" : ""}>${_escape$6(_catLabel(c))}</option>`
  ).join("");
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[13px] font-black uppercase tracking-tight">Новое замечание</h3>
      <button type="button" data-c2-defect-close class="text-slate-400 text-[11px] font-bold uppercase">Закрыть</button>
    </div>
    <p class="text-[10px] text-slate-400 mb-3">Координаты: ${coords.x.toFixed(1)}% × ${coords.y.toFixed(1)}%</p>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Вид работ (чек-лист) *</label>
    <select data-c2-template class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3">
      ${_templateOptionsHtml()}
    </select>
    <div class="relative mb-3">
      <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Нарушение *</label>
      <input type="text" data-c2-item-search autocomplete="off" placeholder="Начните вводить нарушение..."
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]" />
      <input type="hidden" data-c2-item-id />
      <input type="hidden" data-c2-item-name />
      <div data-c2-item-dd class="absolute top-[48px] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl z-[150] hidden max-h-48 overflow-y-auto"></div>
    </div>
    <div data-c2-norm-block class="hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl mb-3">
      <div class="text-[9px] font-black uppercase text-indigo-500 mb-1">Справочно (Норматив)</div>
      <div data-c2-norm-text class="text-[10px] text-slate-600 dark:text-slate-400 font-medium"></div>
    </div>
    <div class="grid grid-cols-2 gap-2 mb-3">
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Категория</label>
        <select data-c2-defect-cat class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]">
          ${catOpts}
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Срок</label>
        <input type="date" data-c2-defect-deadline
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]" />
      </div>
    </div>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Подрядчик</label>
    <select data-c2-defect-contractor class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3">
      ${_contractorOptionsHtml()}
    </select>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Описание</label>
    <textarea data-c2-defect-desc rows="3"
      class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"></textarea>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Фото</label>
    <div data-c2-photo-host>${_renderGallery([])}</div>
    <input type="file" accept="image/*" multiple class="hidden" data-c2-photo-input />
    <button type="button" data-c2-photo-add
      class="w-full mb-4 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 py-3 rounded-xl text-[10px] font-bold uppercase">
      + Добавить фото
    </button>
    <div class="flex gap-2 justify-end">
      <button type="button" data-c2-defect-close class="px-3 py-2 rounded-xl text-[11px] font-bold uppercase text-slate-500">Отмена</button>
      <button type="button" data-c2-defect-save class="px-4 py-2 rounded-xl text-[11px] font-black uppercase bg-indigo-600 text-white">Сохранить</button>
    </div>`;
  root.classList.remove("hidden");
  root.classList.add("flex");
  _bindItemSearch(panel);
  _bindGallery(panel, photosRef, () => {
  });
  (_a = panel.querySelector("[data-c2-photo-add]")) == null ? void 0 : _a.addEventListener("click", () => {
    var _a2;
    (_a2 = panel.querySelector("[data-c2-photo-input]")) == null ? void 0 : _a2.click();
  });
  const cancel = () => {
    closeDefectForm();
    onCancel == null ? void 0 : onCancel();
  };
  panel.querySelectorAll("[data-c2-defect-close]").forEach((btn) => {
    btn.addEventListener("click", cancel);
  });
  root.onclick = (ev) => {
    if (ev.target === root) cancel();
  };
  (_b = panel.querySelector("[data-c2-defect-save]")) == null ? void 0 : _b.addEventListener("click", async () => {
    var _a2, _b2, _c, _d;
    const fields = _readCommonFields(panel);
    if (!fields.template_key) {
      (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "Выберите вид работ (чек-лист)");
      return;
    }
    if (!fields.item_id && !fields.item_name) {
      (_b2 = window.showToast) == null ? void 0 : _b2.call(window, "Выберите нарушение из списка");
      return;
    }
    const description = fields.description || fields.item_name || "";
    if (!description) {
      (_c = window.showToast) == null ? void 0 : _c.call(window, "Укажите описание замечания");
      return;
    }
    try {
      await onSave({
        locationId: coords.locationId,
        x: coords.x,
        y: coords.y,
        description,
        category: fields.category,
        contractorId: fields.contractorId,
        deadline: fields.deadline,
        template_key: fields.template_key,
        item_id: fields.item_id,
        item_name: fields.item_name,
        norm_text: fields.norm_text,
        photos: photosRef.current.slice()
      });
      closeDefectForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (_d = window.showToast) == null ? void 0 : _d.call(window, "❌ " + msg);
    }
  });
}
function _actionButtonsHtml(defect) {
  const { isEngineer, isContractor } = _roleInfo$1();
  const st = String(defect.status || "issued");
  if (st === "issued") {
    if (isContractor) {
      return `<button type="button" data-c2-status="in_progress" class="flex-1 bg-blue-50 text-blue-600 border border-blue-200 py-2.5 rounded-xl text-[11px] font-bold uppercase">В работу</button>
        <button type="button" data-c2-status="fixed" class="flex-[1.5] bg-green-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase">Устранено (Фото)</button>`;
    }
    if (isEngineer) {
      return `<button type="button" data-c2-defect-delete class="bg-red-50 text-red-600 py-2.5 px-3 rounded-xl text-[11px] font-bold uppercase border border-red-200">🗑️</button>
        <button type="button" data-c2-defect-save class="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase">💾 Обновить</button>`;
    }
  } else if (st === "in_progress") {
    if (isContractor) {
      return `<button type="button" data-c2-status="fixed" class="w-full bg-green-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase">Устранено (Приложить фото)</button>`;
    }
    return `<div class="text-center w-full text-[11px] font-bold text-blue-500 py-2">Подрядчик взял в работу</div>`;
  } else if (st === "fixed") {
    if (isEngineer) {
      return `<button type="button" data-c2-status="rejected" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-[11px] font-bold uppercase">❌ Отклонить</button>
        <button type="button" data-c2-status="closed" class="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase">✅ Принять</button>`;
    }
    return `<div class="text-center w-full text-[11px] font-bold text-green-500 py-2">Ожидает проверки инженером</div>`;
  } else if (st === "closed") {
    return `<div class="text-center w-full text-[11px] font-black text-green-600 py-2">Дефект закрыт</div>`;
  } else if (st === "rejected") {
    if (isContractor) {
      return `<button type="button" data-c2-status="fixed" class="w-full bg-orange-500 text-white py-2.5 rounded-xl text-[11px] font-black uppercase">Повторно предъявить (Фото)</button>`;
    }
    if (isEngineer) {
      return `<button type="button" data-c2-defect-save class="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase">💾 Обновить</button>`;
    }
  }
  return `<button type="button" data-c2-defect-close class="px-3 py-2 rounded-xl text-[11px] font-bold uppercase text-slate-500">Закрыть</button>`;
}
function openViewDefectForm(defect, onDelete, onSave, onChangeStatus) {
  var _a, _b, _c;
  const root = _ensureOverlay();
  const panel = root.querySelector("[data-c2-defect-panel]");
  const photosRef = {
    current: Array.isArray(defect.photos) ? defect.photos.slice() : defect.photo ? [String(defect.photo)] : []
  };
  const { isEngineer } = _roleInfo$1();
  const catOpts = DEFECT_CATEGORIES_V2.map((c) => {
    const sel = String(defect.category).toUpperCase() === c ? " selected" : "";
    return `<option value="${c}"${sel}>${_escape$6(_catLabel(c))}</option>`;
  }).join("");
  const deadlineVal = _deadlineInputValue(defect.deadline);
  const canEditFields = isEngineer;
  const disabled = canEditFields ? "" : " disabled";
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[13px] font-black uppercase tracking-tight">Замечание</h3>
      <button type="button" data-c2-defect-close class="text-slate-400 text-[11px] font-bold uppercase">Закрыть</button>
    </div>
    <p class="text-[10px] text-slate-400 mb-1">Статус: <b>${_escape$6(_statusLabel(String(defect.status)))}</b></p>
    <p class="text-[10px] text-slate-400 mb-3">Координаты: ${Number(defect.x).toFixed(1)}% × ${Number(defect.y).toFixed(1)}%</p>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Вид работ</label>
    <select data-c2-template class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"${disabled}>
      ${_templateOptionsHtml(defect.template_key)}
    </select>
    <div class="relative mb-3">
      <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Нарушение</label>
      <input type="text" data-c2-item-search autocomplete="off" value="${_escape$6(defect.item_name || "")}"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]"${disabled} />
      <input type="hidden" data-c2-item-id value="${_escape$6(defect.item_id || "")}" />
      <input type="hidden" data-c2-item-name value="${_escape$6(defect.item_name || "")}" />
      <div data-c2-item-dd class="absolute top-[48px] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl z-[150] hidden max-h-48 overflow-y-auto"></div>
    </div>
    <div data-c2-norm-block class="${defect.norm_text ? "" : "hidden"} bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl mb-3">
      <div class="text-[9px] font-black uppercase text-indigo-500 mb-1">Справочно (Норматив)</div>
      <div data-c2-norm-text class="text-[10px] text-slate-600 dark:text-slate-400 font-medium">${_escape$6(defect.norm_text || "")}</div>
    </div>
    <div class="grid grid-cols-2 gap-2 mb-3">
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Категория</label>
        <select data-c2-defect-cat class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]"${disabled}>
          ${catOpts}
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Срок</label>
        <input type="date" data-c2-defect-deadline value="${_escape$6(deadlineVal)}"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]"${disabled} />
      </div>
    </div>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Подрядчик</label>
    <select data-c2-defect-contractor class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"${disabled}>
      ${_contractorOptionsHtml(defect.contractorId)}
    </select>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Описание</label>
    <textarea data-c2-defect-desc rows="3"
      class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"${disabled}>${_escape$6(defect.description)}</textarea>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Фото</label>
    <div data-c2-photo-host>${_renderGallery(photosRef.current)}</div>
    ${canEditFields ? `<input type="file" accept="image/*" multiple class="hidden" data-c2-photo-input />
    <button type="button" data-c2-photo-add
      class="w-full mb-3 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 py-3 rounded-xl text-[10px] font-bold uppercase">
      + Добавить фото
    </button>` : `<div class="mb-3"></div>`}
    ${_historyHtml(defect.history)}
    <div class="flex gap-2 justify-between mt-3 flex-wrap" data-c2-actions>
      ${_actionButtonsHtml(defect)}
    </div>`;
  root.classList.remove("hidden");
  root.classList.add("flex");
  if (canEditFields) {
    _bindItemSearch(panel);
    _bindGallery(panel, photosRef, () => {
    });
    (_a = panel.querySelector("[data-c2-photo-add]")) == null ? void 0 : _a.addEventListener("click", () => {
      var _a2;
      (_a2 = panel.querySelector("[data-c2-photo-input]")) == null ? void 0 : _a2.click();
    });
  } else {
    panel.querySelectorAll("[data-c2-photo-view]").forEach((el) => {
      el.addEventListener("click", () => {
        const ref = el.getAttribute("data-c2-photo-view") || "";
        if (ref) _openPhoto(ref);
      });
    });
  }
  panel.querySelectorAll("[data-c2-history] [data-c2-photo-view]").forEach((el) => {
    el.addEventListener("click", () => {
      const ref = el.getAttribute("data-c2-photo-view") || "";
      if (ref) _openPhoto(ref);
    });
  });
  panel.querySelectorAll("[data-c2-defect-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeDefectForm());
  });
  root.onclick = (ev) => {
    if (ev.target === root) closeDefectForm();
  };
  (_b = panel.querySelector("[data-c2-defect-save]")) == null ? void 0 : _b.addEventListener("click", async () => {
    var _a2, _b2;
    if (!onSave) {
      closeDefectForm();
      return;
    }
    const fields = _readCommonFields(panel);
    const description = fields.description || fields.item_name || defect.description;
    if (!description) {
      (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "Укажите описание замечания");
      return;
    }
    try {
      await onSave(defect.id, {
        description,
        category: fields.category,
        contractorId: fields.contractorId,
        deadline: fields.deadline,
        template_key: fields.template_key,
        item_id: fields.item_id,
        item_name: fields.item_name,
        norm_text: fields.norm_text,
        photos: photosRef.current.slice()
      });
      closeDefectForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (_b2 = window.showToast) == null ? void 0 : _b2.call(window, "❌ " + msg);
    }
  });
  (_c = panel.querySelector("[data-c2-defect-delete]")) == null ? void 0 : _c.addEventListener("click", async () => {
    var _a2;
    if (!confirm("Удалить замечание?")) return;
    try {
      await onDelete(defect.id);
      closeDefectForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "❌ " + msg);
    }
  });
  panel.querySelectorAll("[data-c2-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      var _a2, _b2, _c2, _d, _e;
      if (!onChangeStatus) return;
      const status = btn.getAttribute("data-c2-status");
      let comment = null;
      let fixPhotos = [];
      if (status === "rejected") {
        comment = prompt("Укажите причину отклонения:") || "";
        if (!comment) {
          (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "⚠️ Для отклонения нужен комментарий");
          return;
        }
      }
      if (status === "fixed") {
        comment = prompt("Краткий комментарий об устранении:");
        if (comment === null) return;
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = "image/*";
        picker.multiple = true;
        const picked = await new Promise((resolve) => {
          picker.onchange = () => resolve(picker.files);
          picker.oncancel = () => resolve(null);
          picker.click();
        });
        if (!picked || !picked.length) {
          (_b2 = window.showToast) == null ? void 0 : _b2.call(window, "⚠️ Для статуса «Устранено» нужно фото");
          return;
        }
        try {
          fixPhotos = await _savePhotoFiles(picked);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          (_c2 = window.showToast) == null ? void 0 : _c2.call(window, "❌ " + msg);
          return;
        }
        if (!fixPhotos.length) {
          (_d = window.showToast) == null ? void 0 : _d.call(window, "⚠️ Не удалось сохранить фото");
          return;
        }
      }
      try {
        await onChangeStatus(defect.id, { status, comment, photos: fixPhotos });
        closeDefectForm();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        (_e = window.showToast) == null ? void 0 : _e.call(window, "❌ " + msg);
      }
    });
  });
}
function _pdfjs() {
  return window.pdfjsLib || null;
}
function _pinBg(category, status) {
  const st = String(status || "").toLowerCase();
  if (st === "closed" || st === "fixed") return "bg-green-500";
  const c = String(category || "").toLowerCase();
  if (c === "critical" || c === "b3") return "bg-red-600";
  if (c === "major" || c === "b2") return "bg-orange-500";
  return "bg-blue-500";
}
function _zoneColors(status) {
  const st = String(status || "").toLowerCase();
  if (st === "rejected") return { box: "bg-red-500/20 border-red-500", label: "bg-red-600" };
  if (st === "accepted") return { box: "bg-green-500/20 border-green-500", label: "bg-green-600" };
  return { box: "bg-blue-500/20 border-blue-500", label: "bg-blue-600" };
}
function _escapeAttr(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
class PlanViewer {
  constructor(host, handlers = {}) {
    this.wrap = null;
    this.stage = null;
    this.canvas = null;
    this.pins = null;
    this.zonesEl = null;
    this.addMode = false;
    this.zoneMode = false;
    this.zoneClick1 = null;
    this.focusZoneId = null;
    this.destroyed = false;
    this.pdfUrl = "";
    this.host = host;
    this.handlers = handlers;
  }
  setAddMode(on) {
    this.addMode = !!on;
    if (on) this.setZoneMode(false);
    this._syncCursor();
  }
  isAddMode() {
    return this.addMode;
  }
  setZoneMode(on) {
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
  isZoneMode() {
    return this.zoneMode;
  }
  setFocusZone(id) {
    var _a;
    this.focusZoneId = id;
    const zones = (_a = this.zonesEl) == null ? void 0 : _a.querySelectorAll("[data-c2-zone]");
    zones == null ? void 0 : zones.forEach((el) => {
      const hid = el;
      const match = hid.getAttribute("data-c2-zone") === id;
      hid.classList.toggle("ring-4", match);
      hid.classList.toggle("ring-indigo-400", match);
      hid.style.zIndex = match ? "25" : "10";
    });
  }
  destroy() {
    this.destroyed = true;
    this.host.innerHTML = "";
    this.wrap = null;
    this.stage = null;
    this.canvas = null;
    this.pins = null;
    this.zonesEl = null;
  }
  async load(pdfUrl) {
    var _a;
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
    this.wrap = this.host.querySelector("[data-c2-plan-wrap]");
    this.stage = this.host.querySelector("[data-c2-plan-stage]");
    this.canvas = this.host.querySelector("[data-c2-plan-canvas]");
    this.pins = this.host.querySelector("[data-c2-plan-pins]");
    this.zonesEl = this.host.querySelector("[data-c2-plan-zones]");
    const loader = this.host.querySelector("[data-c2-plan-loader]");
    if (!this.canvas || !this.stage || !this.wrap) throw new Error("plan-viewer DOM broken");
    this.wrap.addEventListener("click", (ev) => this._onClick(ev));
    const pdfjs = _pdfjs();
    if (!(pdfjs == null ? void 0 : pdfjs.getDocument)) throw new Error("pdfjsLib недоступен");
    let buf = null;
    if ((_a = window.PhotoManager) == null ? void 0 : _a.getAsyncUrl) {
      try {
        const cached = await window.PhotoManager.getAsyncUrl(pdfUrl);
        if (cached && cached.startsWith("blob:")) {
          const res = await fetch(cached);
          buf = await res.arrayBuffer();
        }
      } catch {
      }
    }
    if (!buf) {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Не удалось скачать PDF");
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
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d недоступен");
    await page.render({ canvasContext: ctx, viewport }).promise;
    if (loader) loader.remove();
    this._syncCursor();
  }
  setMarkers(defects) {
    if (!this.pins) return;
    const html = defects.map((d, i) => {
      const x = Number(d.x);
      const y = Number(d.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
      const bg = _pinBg(String(d.category), String(d.status));
      const title = _escapeAttr(String(d.description || "").slice(0, 80));
      const num = i + 1;
      return `<button type="button" data-c2-pin="${_escapeAttr(d.id)}"
          class="absolute w-6 h-6 ${bg} rounded-full border-2 border-white shadow-md
                 flex items-center justify-center text-white text-[10px] font-black
                 cursor-pointer hover:scale-125 transition-transform z-20
                 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style="left:${x}%;top:${y}%;" title="${title}">${num}</button>`;
    }).join("");
    this.pins.innerHTML = html;
  }
  setZones(items) {
    if (!this.zonesEl) return;
    const html = items.map((a) => {
      const z = a.zone;
      if (!z) return "";
      const x = Number(z.x);
      const y = Number(z.y);
      const w = Number(z.w);
      const h = Number(z.h);
      if (![x, y, w, h].every(Number.isFinite)) return "";
      const colors = _zoneColors(String(a.status));
      const title = _escapeAttr(String(a.work_type || "Приёмка").slice(0, 60));
      const focus = this.focusZoneId === a.id ? "ring-4 ring-indigo-400" : "";
      const zIndex = this.focusZoneId === a.id ? 25 : 10;
      return `<button type="button" data-c2-zone="${_escapeAttr(a.id)}"
          class="absolute border-2 ${colors.box} ${focus} shadow-inner flex items-center justify-center
                 cursor-pointer hover:bg-black/10 transition-colors pointer-events-auto"
          style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${zIndex}" title="${title}">
          <span class="${colors.label} text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase">зона</span>
        </button>`;
    }).join("");
    this.zonesEl.innerHTML = html;
  }
  /** Временный пин «+» в режиме выдачи — как legacy drawTempPin. */
  drawTempPin(xPercent, yPercent) {
    if (!this.pins) return;
    this.clearTempPin();
    this.pins.insertAdjacentHTML(
      "beforeend",
      `<div id="c2-temp-pin"
        class="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg
               flex items-center justify-center text-white text-[10px] font-black z-30
               transform -translate-x-1/2 -translate-y-1/2 animate-bounce pointer-events-none"
        style="left:${xPercent}%;top:${yPercent}%;">+</div>`
    );
  }
  clearTempPin() {
    var _a, _b;
    (_b = (_a = this.pins) == null ? void 0 : _a.querySelector("#c2-temp-pin")) == null ? void 0 : _b.remove();
  }
  clearTempZone() {
    var _a, _b, _c, _d;
    (_b = (_a = this.zonesEl) == null ? void 0 : _a.querySelector("#c2-temp-zone")) == null ? void 0 : _b.remove();
    (_d = (_c = this.zonesEl) == null ? void 0 : _c.querySelector("#c2-temp-zone-dot")) == null ? void 0 : _d.remove();
  }
  _drawTempZone(zone) {
    if (!this.zonesEl) return;
    this.clearTempZone();
    this.zonesEl.insertAdjacentHTML(
      "beforeend",
      `<div id="c2-temp-zone"
        class="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/20 z-30 pointer-events-none"
        style="left:${zone.x}%;top:${zone.y}%;width:${zone.w}%;height:${zone.h}%;"></div>`
    );
  }
  _syncCursor() {
    if (!this.wrap) return;
    const cross = this.addMode || this.zoneMode;
    this.wrap.classList.toggle("cursor-crosshair", cross);
    this.wrap.classList.toggle("cursor-default", !cross);
  }
  _onClick(ev) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const t = ev.target;
    const zoneBtn = (_a = t == null ? void 0 : t.closest) == null ? void 0 : _a.call(t, "[data-c2-zone]");
    if (zoneBtn && !this.zoneMode && !this.addMode) {
      const id = zoneBtn.getAttribute("data-c2-zone");
      if (id) (_c = (_b = this.handlers).onZoneClick) == null ? void 0 : _c.call(_b, id);
      return;
    }
    const pin = (_d = t == null ? void 0 : t.closest) == null ? void 0 : _d.call(t, "[data-c2-pin]");
    if (pin && !this.zoneMode) {
      const id = pin.getAttribute("data-c2-pin");
      if (id) (_f = (_e = this.handlers).onMarkerClick) == null ? void 0 : _f.call(_e, id);
      return;
    }
    if (!this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPercent = (ev.clientX - rect.left) / rect.width * 100;
    const yPercent = (ev.clientY - rect.top) / rect.height * 100;
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;
    if (this.zoneMode) {
      if (!this.zoneClick1) {
        this.zoneClick1 = { x: xPercent, y: yPercent };
        this.clearTempZone();
        (_g = this.zonesEl) == null ? void 0 : _g.insertAdjacentHTML(
          "beforeend",
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
      const zone = { x, y, w, h };
      this._drawTempZone(zone);
      this.zoneClick1 = null;
      (_i = (_h = this.handlers).onZoneDrawn) == null ? void 0 : _i.call(_h, zone);
      return;
    }
    if (!this.addMode) return;
    (_k = (_j = this.handlers).onPlanClick) == null ? void 0 : _k.call(_j, xPercent, yPercent);
  }
  getPdfUrl() {
    return this.pdfUrl;
  }
}
let _viewer$1 = null;
let _openUnitId = null;
let _apartmentId = null;
let _addMode$1 = false;
function _escape$5(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _defects$1() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionDefects) || null;
}
function _units$1() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionUnits) || null;
}
function _loc$3() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations) || null;
}
function _listForApartment(dSvc, apartmentId) {
  if (typeof dSvc.listForLocation === "function") return dSvc.listForLocation(apartmentId);
  return dSvc.list({ locationId: apartmentId });
}
function _pathLabel$1(apartmentId) {
  const loc = _loc$3();
  if (!(loc == null ? void 0 : loc.getPath) || !apartmentId) return apartmentId || "—";
  try {
    const path = loc.getPath(apartmentId) || [];
    if (!path.length) return apartmentId;
    return path.map((n) => n.displayName || n.id).join(" / ");
  } catch {
    return apartmentId;
  }
}
function _syncAddBtn() {
  const btn = document.querySelector("[data-c2-apt-add-mode]");
  if (!btn) return;
  btn.textContent = _addMode$1 ? "Кликни на план…" : "+ Замечание";
  btn.className = _addMode$1 ? "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-indigo-600 text-white border-indigo-600" : "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200";
}
async function _refreshPins() {
  const dSvc = _defects$1();
  if (!_viewer$1 || !_apartmentId || !dSvc) return;
  await dSvc.init();
  const defects = _listForApartment(dSvc, _apartmentId);
  _viewer$1.setMarkers(defects);
  const countEl = document.getElementById("c2-apt-overlay-count");
  if (countEl) countEl.textContent = `Замечаний: ${defects.length}`;
}
async function _maybeMarkHasDefects(unitId) {
  const uSvc = _units$1();
  if (!uSvc) return;
  const u = uSvc.get(unitId);
  if (!u) return;
  const st = String(u.status || "not_inspected");
  if (st !== "not_inspected" && st !== "none") return;
  try {
    await uSvc.changeStatus(unitId, "has_defects");
  } catch (e) {
    console.warn("[apartment-plan] changeStatus has_defects", e);
  }
}
function closeApartmentPlan() {
  var _a;
  _viewer$1 == null ? void 0 : _viewer$1.destroy();
  _viewer$1 = null;
  _openUnitId = null;
  _apartmentId = null;
  _addMode$1 = false;
  (_a = document.getElementById("c2-apartment-plan")) == null ? void 0 : _a.remove();
}
async function refreshApartmentPlanMarkers() {
  if (!_openUnitId || !_apartmentId) return;
  await _refreshPins();
}
async function openApartmentPlan(unit, cb) {
  var _a, _b, _c;
  closeApartmentPlan();
  const pdfUrl = String(unit.pdf_url || "");
  if (!pdfUrl.startsWith("http")) {
    cb.toast("Сначала загрузите PDF плана квартиры");
    return;
  }
  const uSvc = _units$1();
  const dSvc = _defects$1();
  if (!dSvc) {
    cb.toast("service.constructionDefects не загружен");
    return;
  }
  if (!uSvc) {
    cb.toast("service.constructionUnits не загружен");
    return;
  }
  let fresh = unit;
  try {
    if (typeof uSvc.ensureApartmentForUnit === "function") {
      fresh = await uSvc.ensureApartmentForUnit(unit.id);
    }
  } catch (e) {
    cb.toast(`Нужна миграция квартиры: ${(e == null ? void 0 : e.message) || e}`);
    return;
  }
  const loc = _loc$3();
  const node = (_a = loc == null ? void 0 : loc.getNode) == null ? void 0 : _a.call(loc, fresh.locationId);
  if (node && node.nodeType && node.nodeType !== "apartment") {
    cb.toast("Сначала откройте Передачу — нужна привязка к квартире");
    return;
  }
  const apartmentId = fresh.locationId;
  if (!apartmentId) {
    cb.toast("У помещения нет locationId");
    return;
  }
  _openUnitId = fresh.id;
  _apartmentId = apartmentId;
  _addMode$1 = false;
  const guest = cb.isGuest();
  const title = `${fresh.type || "КВ"} ${fresh.name || ""}`.trim();
  const path = _pathLabel$1(apartmentId);
  const wrap = document.createElement("div");
  wrap.id = "c2-apartment-plan";
  wrap.className = "fixed inset-0 z-[95] flex flex-col bg-slate-100 dark:bg-slate-900";
  wrap.innerHTML = `
    <div class="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div class="min-w-0">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Замечания на плане</div>
        <div class="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">${_escape$5(title)}</div>
        <div class="text-[10px] font-bold text-slate-400 truncate">${_escape$5(path)}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span id="c2-apt-overlay-count" class="text-[10px] font-bold text-slate-400 hidden sm:inline">Замечаний: 0</span>
        ${guest ? "" : `<button type="button" data-c2-apt-add-mode
                class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200">+ Замечание</button>`}
        <button type="button" data-c2-apt-close
          class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-600">Закрыть</button>
      </div>
    </div>
    <div id="c2-apt-plan-host" class="relative flex-1 min-h-0 overflow-hidden"></div>`;
  document.body.appendChild(wrap);
  (_b = wrap.querySelector("[data-c2-apt-close]")) == null ? void 0 : _b.addEventListener("click", (ev) => {
    var _a2;
    ev.preventDefault();
    closeApartmentPlan();
    void ((_a2 = cb.onChanged) == null ? void 0 : _a2.call(cb));
  });
  (_c = wrap.querySelector("[data-c2-apt-add-mode]")) == null ? void 0 : _c.addEventListener("click", (ev) => {
    ev.preventDefault();
    if (guest) return;
    _addMode$1 = !_addMode$1;
    _viewer$1 == null ? void 0 : _viewer$1.setAddMode(_addMode$1);
    _syncAddBtn();
  });
  const host = wrap.querySelector("#c2-apt-plan-host");
  _viewer$1 = new PlanViewer(host, {
    onPlanClick: (x, y) => {
      if (!_apartmentId || guest) return;
      _viewer$1 == null ? void 0 : _viewer$1.drawTempPin(x, y);
      openCreateDefectForm(
        { locationId: _apartmentId, x, y },
        async (input) => {
          var _a2;
          await dSvc.create({
            locationId: input.locationId,
            x: input.x,
            y: input.y,
            description: input.description,
            category: input.category,
            contractorId: input.contractorId,
            deadline: input.deadline,
            template_key: input.template_key,
            item_id: input.item_id,
            item_name: input.item_name,
            norm_text: input.norm_text,
            photos: input.photos,
            status: "issued"
          });
          if (_openUnitId) await _maybeMarkHasDefects(_openUnitId);
          _addMode$1 = false;
          _viewer$1 == null ? void 0 : _viewer$1.setAddMode(false);
          _viewer$1 == null ? void 0 : _viewer$1.clearTempPin();
          _syncAddBtn();
          cb.toast("Замечание сохранено");
          await _refreshPins();
          await ((_a2 = cb.onChanged) == null ? void 0 : _a2.call(cb));
        },
        () => _viewer$1 == null ? void 0 : _viewer$1.clearTempPin()
      );
    },
    onMarkerClick: (id) => {
      const d = dSvc.get(id);
      if (!d) return;
      openViewDefectForm(
        d,
        async (defectId) => {
          var _a2;
          await dSvc.softDelete(defectId);
          cb.toast("Замечание удалено");
          await _refreshPins();
          await ((_a2 = cb.onChanged) == null ? void 0 : _a2.call(cb));
        },
        async (defectId, patch) => {
          await dSvc.update(defectId, patch);
          cb.toast("Замечание обновлено");
          await _refreshPins();
        },
        async (defectId, input) => {
          await dSvc.changeStatus(defectId, input.status, {
            comment: input.comment,
            photos: input.photos
          });
          cb.toast("✅ Статус обновлён");
          await _refreshPins();
        }
      );
    }
  });
  try {
    await dSvc.init();
    await _viewer$1.load(pdfUrl);
    await _refreshPins();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    host.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">Ошибка плана: ${_escape$5(msg)}</div>`;
    _viewer$1 = null;
  }
}
function _escape$4(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _roleInfo() {
  var _a, _b, _c, _d;
  const perms = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.permissions;
  const role = ((_c = perms == null ? void 0 : perms.getCurrentRole) == null ? void 0 : _c.call(perms)) || "guest";
  const isEngineer = ((_d = perms == null ? void 0 : perms.isEngineerOrAdmin) == null ? void 0 : _d.call(perms)) ?? ["engineer", "manager", "deputy_manager", "admin"].includes(role);
  return { role, isEngineer };
}
function _sysTemplates() {
  return window.SYSTEM_TEMPLATES || {};
}
function _userTemplates() {
  return window.userTemplates || {};
}
function _tmplOptions(selected) {
  let html = '<option value="">-- Выберите вид работ --</option>';
  const st = _sysTemplates();
  Object.keys(st).sort().forEach((k) => {
    const v = `sys_${k}`;
    html += `<option value="${_escape$4(v)}" ${selected === v ? "selected" : ""}>[СИС] ${_escape$4(st[k].title || k)}</option>`;
  });
  const ut = _userTemplates();
  Object.keys(ut).sort().forEach((k) => {
    const v = `user_${k}`;
    html += `<option value="${_escape$4(v)}" ${selected === v ? "selected" : ""}>[МОЙ] ${_escape$4(ut[k].title || k)}</option>`;
  });
  return html;
}
function _workTitle(key) {
  var _a, _b;
  if (!key) return "";
  if (key.startsWith("sys_")) {
    const k = key.slice(4);
    return ((_a = _sysTemplates()[k]) == null ? void 0 : _a.title) || k;
  }
  if (key.startsWith("user_")) {
    const k = key.slice(5);
    return ((_b = _userTemplates()[k]) == null ? void 0 : _b.title) || k;
  }
  return key;
}
function _resolveContractorId(displayName) {
  var _a, _b;
  const contractorsSvc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.contractors;
  if (contractorsSvc && typeof contractorsSvc.resolveIdFromNormalized === "function") {
    return contractorsSvc.resolveIdFromNormalized({
      display_name: displayName,
      contractor_name: displayName
    }) || null;
  }
  return null;
}
function _floorLabel(locationId) {
  var _a, _b, _c, _d;
  const loc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations;
  if (loc == null ? void 0 : loc.getPath) {
    return loc.getPath(locationId).map((n) => n.displayName).join(" / ");
  }
  return ((_d = (_c = loc == null ? void 0 : loc.getNode) == null ? void 0 : _c.call(loc, locationId)) == null ? void 0 : _d.displayName) || locationId;
}
function _today() {
  const d = /* @__PURE__ */ new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function openCreateAcceptanceForm(ctx, onSave, onCancel) {
  var _a, _b, _c;
  const { role } = _roleInfo();
  if (role === "guest") {
    (_a = window.showToast) == null ? void 0 : _a.call(window, "⚠️ Гости не могут предъявлять работы");
    onCancel == null ? void 0 : onCancel();
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
            <div class="text-[12px] font-bold text-slate-700 dark:text-slate-200">${_escape$4(path)}</div>
          </div>
          <div>
            <label class="text-[10px] font-black text-indigo-500 uppercase mb-1 block">Вид работ *</label>
            <select id="c2-acc-work" class="input-base text-[12px] font-bold mb-2 border-indigo-300 w-full">
              ${_tmplOptions()}
            </select>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Оси / Захватка</label>
                <input type="text" id="c2-acc-room" class="input-base text-[12px] w-full" placeholder="Напр: Оси А-Б" value="${_escape$4(ctx.zone.room || "")}">
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
  (_b = document.getElementById("c2-acc-request-modal")) == null ? void 0 : _b.remove();
  document.body.insertAdjacentHTML("beforeend", html);
  const modal = document.getElementById("c2-acc-request-modal");
  if (!modal) return;
  const close = () => {
    modal.remove();
    onCancel == null ? void 0 : onCancel();
  };
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) close();
  });
  modal.querySelectorAll("[data-c2-acc-close]").forEach((btn) => btn.addEventListener("click", close));
  (_c = modal.querySelector("[data-c2-acc-save]")) == null ? void 0 : _c.addEventListener("click", () => {
    var _a2, _b2, _c2, _d, _e, _f, _g, _h, _i;
    const workKey = ((_a2 = document.getElementById("c2-acc-work")) == null ? void 0 : _a2.value) || "";
    const room = ((_c2 = (_b2 = document.getElementById("c2-acc-room")) == null ? void 0 : _b2.value) == null ? void 0 : _c2.trim()) || "";
    const vol = ((_e = (_d = document.getElementById("c2-acc-vol")) == null ? void 0 : _d.value) == null ? void 0 : _e.trim()) || "";
    const dateStr = ((_f = document.getElementById("c2-acc-date")) == null ? void 0 : _f.value) || "";
    const timeStr = ((_g = document.getElementById("c2-acc-time")) == null ? void 0 : _g.value) || "";
    if (!workKey || !dateStr) {
      (_h = window.showToast) == null ? void 0 : _h.call(window, "⚠️ Заполните вид работ и дату");
      return;
    }
    const engineerName = ((_i = window.syncConfig) == null ? void 0 : _i.engineerName) || "";
    const zone = { ...ctx.zone, room: room || null };
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
function openAcceptanceDetails(item, handlers) {
  var _a, _b, _c, _d, _e;
  const { isEngineer, role } = _roleInfo();
  const path = _floorLabel(item.locationId);
  const status = String(item.status || "pending");
  let actions = "";
  if (status === "pending") {
    if (isEngineer) {
      actions = `
        <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-[var(--card-border)]">
          <button type="button" data-c2-acc-focus class="w-full bg-slate-100 text-slate-700 border border-slate-300 py-3 rounded-xl font-black text-[11px] uppercase">🗺️ Показать на плане</button>
          <div class="flex gap-2">
            <button type="button" data-c2-acc-status="accepted" class="flex-1 bg-green-50 text-green-600 border border-green-200 py-3 rounded-xl font-bold text-[10px] uppercase">✅ Принять</button>
            <button type="button" data-c2-acc-status="rejected" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold text-[10px] uppercase">❌ Отклонить</button>
          </div>
        </div>`;
    } else if (role !== "guest") {
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
          <h3 class="font-black text-[13px] uppercase">Заявка · ${_escape$4(status)}</h3>
          <button type="button" data-c2-acc-dclose class="text-slate-400 font-black text-lg">✕</button>
        </div>
        <div class="p-4 text-[12px] space-y-2">
          <div><span class="text-[10px] font-black uppercase text-slate-400">Локация</span><div class="font-bold">${_escape$4(path)}</div></div>
          <div><span class="text-[10px] font-black uppercase text-slate-400">Вид работ</span><div class="font-bold">${_escape$4(item.work_type || "—")}</div></div>
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-[10px] font-black uppercase text-slate-400">Объем</span><div class="font-bold">${_escape$4(item.volume || "—")}</div></div>
            <div><span class="text-[10px] font-black uppercase text-slate-400">Оси</span><div class="font-bold">${_escape$4(((_a = item.zone) == null ? void 0 : _a.room) || "—")}</div></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-[10px] font-black uppercase text-slate-400">Дата</span><div class="font-bold">${_escape$4(item.requested_date || "—")}</div></div>
            <div><span class="text-[10px] font-black uppercase text-slate-400">Время</span><div class="font-bold">${_escape$4(item.requested_time || "—")}</div></div>
          </div>
          ${actions}
        </div>
      </div>
    </div>`;
  (_b = document.getElementById("c2-acc-details-modal")) == null ? void 0 : _b.remove();
  document.body.insertAdjacentHTML("beforeend", html);
  const modal = document.getElementById("c2-acc-details-modal");
  if (!modal) return;
  const close = () => modal.remove();
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) close();
  });
  (_c = modal.querySelector("[data-c2-acc-dclose]")) == null ? void 0 : _c.addEventListener("click", close);
  (_d = modal.querySelector("[data-c2-acc-focus]")) == null ? void 0 : _d.addEventListener("click", () => {
    var _a2;
    close();
    (_a2 = handlers.onFocusPlan) == null ? void 0 : _a2.call(handlers, item.id);
  });
  modal.querySelectorAll("[data-c2-acc-status]").forEach((btn) => {
    btn.addEventListener("click", () => {
      var _a2;
      const st = btn.getAttribute("data-c2-acc-status");
      void Promise.resolve((_a2 = handlers.onChangeStatus) == null ? void 0 : _a2.call(handlers, item.id, st)).then(() => close());
    });
  });
  (_e = modal.querySelector("[data-c2-acc-revoke]")) == null ? void 0 : _e.addEventListener("click", () => {
    var _a2;
    void Promise.resolve((_a2 = handlers.onSoftDelete) == null ? void 0 : _a2.call(handlers, item.id)).then(() => close());
  });
}
function _escape$3(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _acc$1() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionAcceptance) || null;
}
function _loc$2() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations) || null;
}
let _filterObjectId = null;
let _bound$2 = false;
function _objectIdForFloor(loc, floorId) {
  var _a;
  const path = loc.getPath(floorId);
  const obj = path.find((n) => n.nodeType === "object");
  return (obj == null ? void 0 : obj.id) || ((_a = path[0]) == null ? void 0 : _a.id) || null;
}
function _cardHtml(r, loc) {
  const path = loc.getPath(r.locationId).map((n) => n.displayName).join(" · ");
  const overdue = r.status === "pending" && r.requested_date && new Date(r.requested_date).setHours(0, 0, 0, 0) < (/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0);
  return `
    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 mb-3 shadow-sm cursor-pointer hover:border-indigo-400 transition-colors"
         data-c2-acc-card="${_escape$3(r.id)}">
      <div class="flex justify-between items-start gap-2 mb-1">
        <div class="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight">${_escape$3(r.work_type || "Без вида работ")}</div>
        ${overdue ? '<span class="text-[8px] font-black uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded">просрочено</span>' : ""}
      </div>
      <div class="text-[10px] text-slate-500 font-bold mb-2">${_escape$3(path || r.locationId)}</div>
      <div class="flex justify-between items-center text-[10px]">
        <span class="font-bold text-slate-600">${_escape$3(r.requested_date || "—")} ${_escape$3(r.requested_time || "")}</span>
        <button type="button" data-c2-acc-plan="${_escape$3(r.id)}"
          class="text-indigo-600 bg-white border border-indigo-200 px-2 py-1 rounded text-[9px] font-bold">План</button>
      </div>
      ${r.volume ? `<div class="mt-1 text-[9px] text-slate-400 font-bold">${_escape$3(r.volume)}</div>` : ""}
    </div>`;
}
function _column(title, color, items, loc) {
  return `
    <div class="flex-1 min-w-[220px] bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-2">
      <div class="flex items-center justify-between px-1 mb-2">
        <span class="text-[10px] font-black uppercase tracking-widest ${color}">${_escape$3(title)}</span>
        <span class="bg-white dark:bg-slate-800 text-slate-600 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 text-[10px] font-bold">${items.length}</span>
      </div>
      <div class="max-h-[55vh] overflow-y-auto">
        ${items.length ? items.map((r) => _cardHtml(r, loc)).join("") : '<div class="text-center py-4 text-[10px] font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">Заявок нет</div>'}
      </div>
    </div>`;
}
async function renderAcceptanceKanban(root) {
  const acc = _acc$1();
  const loc = _loc$2();
  if (!acc || !loc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">constructionAcceptance / locations не загружены</div>`;
    return;
  }
  await loc.init();
  await acc.init();
  const objects = loc.listNodes({ nodeType: "object", parentId: null });
  const objOpts = `<option value="">Все объекты</option>` + objects.map(
    (o) => `<option value="${_escape$3(o.id)}" ${_filterObjectId === o.id ? "selected" : ""}>${_escape$3(o.displayName)}</option>`
  ).join("");
  let all = acc.list();
  if (_filterObjectId) {
    all = all.filter((r) => _objectIdForFloor(loc, r.locationId) === _filterObjectId);
  }
  const pending = all.filter((r) => r.status === "pending");
  const rejected = all.filter((r) => r.status === "rejected");
  const accepted = all.filter((r) => r.status === "accepted");
  root.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Канбан приёмки (v2)</div>
        <select id="c2-acc-obj-filter" class="input-base text-[11px] font-bold max-w-[220px]">${objOpts}</select>
      </div>
      <div class="flex flex-col lg:flex-row gap-3">
        ${_column("Ожидают", "text-blue-600", pending, loc)}
        ${_column("Отклонены", "text-red-600", rejected, loc)}
        ${_column("Приняты", "text-green-600", accepted, loc)}
      </div>
    </div>`;
  _bindOnce$2();
}
function _bindOnce$2() {
  if (_bound$2) return;
  _bound$2 = true;
  document.addEventListener(
    "change",
    (ev) => {
      const t = ev.target;
      if ((t == null ? void 0 : t.id) === "c2-acc-obj-filter") {
        _filterObjectId = t.value || null;
        const root = document.getElementById("construction-v2-root");
        if (root) renderAcceptanceKanban(root).catch(() => {
        });
      }
    },
    true
  );
  document.addEventListener(
    "click",
    (ev) => {
      var _a, _b;
      const t = ev.target;
      const planBtn = (_a = t == null ? void 0 : t.closest) == null ? void 0 : _a.call(t, "[data-c2-acc-plan]");
      if (planBtn) {
        ev.stopPropagation();
        const id = planBtn.getAttribute("data-c2-acc-plan");
        if (id) focusAcceptanceOnPlan(id);
        return;
      }
      const card = (_b = t == null ? void 0 : t.closest) == null ? void 0 : _b.call(t, "[data-c2-acc-card]");
      if (card) {
        const id = card.getAttribute("data-c2-acc-card");
        if (!id) return;
        const acc = _acc$1();
        const item = acc == null ? void 0 : acc.get(id);
        if (!item || !acc) return;
        openAcceptanceDetails(item, {
          onFocusPlan: (rid) => focusAcceptanceOnPlan(rid),
          onChangeStatus: async (rid, status) => {
            var _a2;
            await acc.changeStatus(rid, status);
            (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "✅ Статус обновлён");
            const root = document.getElementById("construction-v2-root");
            if (root) await renderAcceptanceKanban(root);
          },
          onSoftDelete: async (rid) => {
            var _a2;
            await acc.softDelete(rid);
            (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "Заявка отозвана");
            const root = document.getElementById("construction-v2-root");
            if (root) await renderAcceptanceKanban(root);
          }
        });
      }
    },
    true
  );
}
function focusAcceptanceOnPlan(id) {
  var _a, _b, _c, _d;
  const acc = _acc$1();
  const item = acc == null ? void 0 : acc.get(id);
  if (!(item == null ? void 0 : item.locationId) || !item.zone) {
    (_a = window.showToast) == null ? void 0 : _a.call(window, "⚠️ Для этой заявки не была выделена зона на плане");
    return;
  }
  (_d = (_c = (_b = window.RBI) == null ? void 0 : _b.events) == null ? void 0 : _c.emit) == null ? void 0 : _d.call(_c, "construction-acceptance:focus", {
    id,
    locationId: item.locationId
  });
  if ((location.hash || "").replace(/^#/, "") !== "/construction-v2") {
    location.hash = "#/construction-v2";
  }
}
const UNIT_STATUSES_V2 = [
  "not_inspected",
  "finishing",
  "has_defects",
  "ready_for_transfer",
  "transferred",
  "shareholder_defects"
];
const UNIT_STATUS_LABELS_RU = {
  not_inspected: "Не осматривалась",
  finishing: "В отделке",
  has_defects: "Есть замечания",
  ready_for_transfer: "Готова к передаче",
  transferred: "Передана",
  shareholder_defects: "Замечания дольщика"
};
function _escape$2(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _pathLabel(loc, locationId) {
  if (!(loc == null ? void 0 : loc.getPath) || !locationId) return locationId || "—";
  try {
    const path = loc.getPath(locationId) || [];
    if (!path.length) return locationId;
    return path.map((n) => n.displayName || n.id).join(" / ");
  } catch {
    return locationId;
  }
}
function closeUnitCard() {
  var _a;
  (_a = document.getElementById("c2-unit-card")) == null ? void 0 : _a.remove();
}
function openUnitCard(unit, deps) {
  var _a, _b;
  closeUnitCard();
  unit.id;
  const guest = deps.cb.isGuest();
  const canDel = !guest && deps.cb.canSoftDelete(unit);
  const path = _pathLabel(deps.loc, unit.locationId);
  const status = String(unit.status || "not_inspected");
  const hasPdf = !!(unit.pdf_url && String(unit.pdf_url).startsWith("http"));
  const statusOpts = UNIT_STATUSES_V2.map(
    (st) => `<option value="${st}" ${status === st ? "selected" : ""}>${_escape$2(UNIT_STATUS_LABELS_RU[st])}</option>`
  ).join("");
  const wrap = document.createElement("div");
  wrap.id = "c2-unit-card";
  wrap.className = "fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 p-3";
  wrap.innerHTML = `
    <div data-c2-unit-card-panel class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
      <div class="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div>
          <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Квартира</div>
          <div class="text-[18px] font-black text-slate-800 dark:text-slate-100">${_escape$2(unit.type || "КВ")} ${_escape$2(
    unit.name
  )}</div>
          <div class="text-[11px] font-bold text-slate-400 mt-0.5">${_escape$2(path)}</div>
        </div>
        <button type="button" data-c2-unit-card-close class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[20px] leading-none px-1" aria-label="Закрыть">×</button>
      </div>
      <div class="px-4 pb-4 space-y-3">
        <label class="block">
          <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Статус передачи</span>
          <select id="c2-unit-card-status" data-c2-unit-id="${_escape$2(unit.id)}"
            class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold"
            ${guest ? "disabled" : ""}>
            ${statusOpts}
          </select>
        </label>
        <div class="rounded-xl border border-slate-200 dark:border-slate-600 p-3 space-y-2">
          <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">План квартиры (PDF)</div>
          ${hasPdf ? `<div class="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">${_escape$2(
    unit.pdf_name || "plan.pdf"
  )}${unit.pdf_size ? ` · ${_escape$2(String(unit.pdf_size))} B` : ""}</div>
                 <div class="flex flex-wrap gap-2">
                   <a href="${_escape$2(String(unit.pdf_url))}" target="_blank" rel="noopener"
                     class="inline-flex items-center px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase border border-indigo-200">Открыть</a>
                   <button type="button" data-c2-unit-apt-plan="${_escape$2(unit.id)}"
                     class="inline-flex items-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase border border-indigo-600">Замечания на плане</button>
                 </div>` : `<div class="text-[11px] text-slate-400 font-bold">План не загружен</div>
                 <div class="text-[10px] text-slate-400 font-bold">Загрузка PDF — в Настройках → справочник локаций</div>
                 <button type="button" disabled
                   class="inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-black uppercase border border-slate-200 cursor-not-allowed opacity-70">Замечания на плане</button>`}
        </div>
        ${canDel ? `<button type="button" data-c2-unit-delete="${_escape$2(unit.id)}"
                class="w-full py-2.5 rounded-xl text-[11px] font-black uppercase text-red-600 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">Удалить помещение</button>` : ""}
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (ev) => {
    var _a2;
    const t = ev.target;
    if (t === wrap || ((_a2 = t.closest) == null ? void 0 : _a2.call(t, "[data-c2-unit-card-close]"))) {
      closeUnitCard();
    }
  });
  const sel = wrap.querySelector("#c2-unit-card-status");
  sel == null ? void 0 : sel.addEventListener("change", () => {
    if (guest || !sel) return;
    const id = sel.getAttribute("data-c2-unit-id");
    const st = sel.value;
    if (!id || !st) return;
    void (async () => {
      try {
        await deps.units.changeStatus(id, st);
        deps.cb.toast("Статус обновлён");
        await deps.cb.onChanged();
        const fresh = deps.units.get(id);
        if (fresh) openUnitCard(fresh, deps);
      } catch (e) {
        deps.cb.toast(`Ошибка: ${(e == null ? void 0 : e.message) || e}`);
      }
    })();
  });
  (_a = wrap.querySelector("[data-c2-unit-apt-plan]")) == null ? void 0 : _a.addEventListener("click", (ev) => {
    ev.preventDefault();
    const id = ev.currentTarget.getAttribute("data-c2-unit-apt-plan");
    if (!id) return;
    const fresh = deps.units.get(id) || unit;
    if (!deps.cb.onOpenApartmentPlan) {
      deps.cb.toast("Открытие плана недоступно");
      return;
    }
    void deps.cb.onOpenApartmentPlan(fresh);
  });
  (_b = wrap.querySelector("[data-c2-unit-delete]")) == null ? void 0 : _b.addEventListener("click", (ev) => {
    ev.preventDefault();
    if (guest) return;
    const id = ev.currentTarget.getAttribute("data-c2-unit-delete");
    if (!id || !confirm("Удалить помещение?")) return;
    void (async () => {
      try {
        await deps.units.softDelete(id);
        closeUnitCard();
        deps.cb.toast("Удалено");
        await deps.cb.onChanged();
      } catch (e) {
        deps.cb.toast(`Ошибка: ${(e == null ? void 0 : e.message) || e}`);
      }
    })();
  });
}
function _floorsForBuilding(buildingId, loc) {
  if (!buildingId) return [];
  const sections = loc.getChildren(buildingId) || [];
  const floors = [];
  for (const sec of sections) {
    if (!(sec == null ? void 0 : sec.id)) continue;
    for (const fl of loc.getChildren(sec.id) || []) {
      if (!(fl == null ? void 0 : fl.id)) continue;
      if (fl.nodeType && fl.nodeType !== "floor") continue;
      floors.push(fl);
    }
  }
  floors.sort((a, b) => Number(b.sort_order || 0) - Number(a.sort_order || 0));
  return floors;
}
function teardownTransferUi() {
  closeApartmentPlan();
  closeUnitCard();
}
function _loc$1() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations) || null;
}
function _units() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionUnits) || null;
}
function _permissions() {
  var _a, _b;
  return (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.permissions;
}
function _escape$1(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _toast(msg) {
  const fn = window.showToast;
  if (typeof fn === "function") fn(msg);
  else console.info("[transfer-board]", msg);
}
function _isGuest() {
  var _a, _b;
  const role = ((_b = (_a = _permissions()) == null ? void 0 : _a.getCurrentRole) == null ? void 0 : _b.call(_a)) || "guest";
  return role === "guest";
}
function _canManage() {
  var _a;
  const p = _permissions();
  if (p == null ? void 0 : p.canManageHierarchy) return !!p.canManageHierarchy();
  const role = ((_a = p == null ? void 0 : p.getCurrentRole) == null ? void 0 : _a.call(p)) || "";
  return ["manager", "deputy_manager", "director", "admin"].includes(role);
}
function _canSoftDelete(u) {
  var _a, _b;
  if (_canManage()) return true;
  const me = ((_b = (_a = _permissions()) == null ? void 0 : _a.getCurrentEngineerName) == null ? void 0 : _b.call(_a)) || "";
  return !!(me && u.created_by && me === u.created_by);
}
function _cellBg(status) {
  const st = String(status || "not_inspected");
  if (st === "transferred" || st === "accepted") {
    return "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:border-green-800";
  }
  if (st === "has_defects" || st === "defects") {
    return "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:border-red-800";
  }
  if (st === "shareholder_defects") {
    return "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:border-orange-800";
  }
  if (st === "ready_for_transfer") {
    return "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700";
  }
  if (st === "finishing" || st === "ready") {
    return "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:border-blue-800";
  }
  return "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}
let _objectId = null;
let _buildingId = null;
let _bound$1 = false;
function _renderLegend() {
  const items = [
    { st: "not_inspected", swatch: "bg-white border border-slate-300 dark:bg-slate-700 dark:border-slate-600" },
    { st: "finishing", swatch: "bg-blue-100 border border-blue-300" },
    { st: "has_defects", swatch: "bg-red-100 border border-red-300" },
    { st: "ready_for_transfer", swatch: "bg-amber-100 border border-amber-300" },
    { st: "transferred", swatch: "bg-green-100 border border-green-300" },
    { st: "shareholder_defects", swatch: "bg-orange-100 border border-orange-300" }
  ];
  return `
    <div class="flex flex-wrap gap-3 mb-4 justify-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      ${items.map(
    (it) => `<div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded ${it.swatch}"></span><span class="text-[9px] font-bold text-slate-500 uppercase">${_escape$1(
      UNIT_STATUS_LABELS_RU[it.st]
    )}</span></div>`
  ).join("")}
    </div>`;
}
function _renderGrid(uSvc, loc) {
  if (!_buildingId) {
    return `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">Выберите корпус для просмотра шахматки</div>`;
  }
  const floors = _floorsForBuilding(_buildingId, loc);
  if (!floors.length) {
    return `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">В этом корпусе ещё не созданы этажи</div>`;
  }
  const bldUnits = uSvc.listForBuilding(_buildingId);
  let html = _renderLegend();
  html += `<div class="overflow-x-auto pb-4 custom-scrollbar"><div class="min-w-max flex flex-col gap-1.5">`;
  for (const floor of floors) {
    const floorUnits = uSvc.listForFloor(floor.id).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const floorLabel = floor.displayName || floor.id;
    html += `
      <div class="flex items-center gap-2">
        <div class="w-12 shrink-0 text-center font-black text-[10px] text-slate-400 bg-[var(--hover-bg)] py-3 rounded-lg border border-[var(--card-border)] uppercase tracking-tight">${_escape$1(
      floorLabel
    )}</div>
        <div class="flex gap-1.5 flex-1">`;
    if (!floorUnits.length) {
      html += `<div class="text-[9px] text-slate-300 italic py-3">Помещений нет</div>`;
    } else {
      for (const u of floorUnits) {
        const bg = _cellBg(String(u.status || "not_inspected"));
        const pdfDot = u.pdf_url ? `<span class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500"></span>` : "";
        html += `
          <button type="button" data-c2-unit-cell="${_escape$1(u.id)}"
            class="relative ${bg} border rounded-lg w-[46px] h-[46px] flex flex-col items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform active:scale-95">
            ${pdfDot}
            <span class="text-[12px] font-black">${_escape$1(u.name)}</span>
            <span class="text-[8px] opacity-60 font-bold">${_escape$1(u.type || "КВ")}</span>
          </button>`;
      }
    }
    html += `</div></div>`;
  }
  html += `</div></div>`;
  if (_canManage() && bldUnits.length === 0) {
    html += `
      <button type="button" data-c2-generate-grid
        class="mt-4 w-full bg-indigo-50 text-indigo-600 border border-indigo-200 py-3.5 rounded-xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
        Сгенерировать сетку квартир (8 на этаж)
      </button>`;
  }
  return html;
}
function _selectorsHtml(loc) {
  const objects = loc.listNodes({ nodeType: "object", parentId: null });
  let objOpts = `<option value="">— объект —</option>`;
  for (const o of objects) {
    objOpts += `<option value="${_escape$1(o.id)}" ${_objectId === o.id ? "selected" : ""}>${_escape$1(
      o.displayName
    )}</option>`;
  }
  let bldOpts = `<option value="">— корпус —</option>`;
  if (_objectId) {
    const buildings = loc.getChildren(_objectId).filter((b) => !b.nodeType || b.nodeType === "building");
    for (const b of buildings) {
      bldOpts += `<option value="${_escape$1(b.id)}" ${_buildingId === b.id ? "selected" : ""}>${_escape$1(
        b.displayName
      )}</option>`;
    }
  }
  return `
    <div class="flex flex-col sm:flex-row gap-2 mb-4">
      <select id="c2-transfer-object" class="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-[12px] font-bold">
        ${objOpts}
      </select>
      <select id="c2-transfer-building" class="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-[12px] font-bold" ${_objectId ? "" : "disabled"}>
        ${bldOpts}
      </select>
    </div>`;
}
async function _refreshBoard() {
  const root = document.getElementById("construction-v2-root");
  if (root) await renderTransferBoard(root);
}
async function renderTransferBoard(root) {
  const loc = _loc$1();
  const uSvc = _units();
  if (!loc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">service.locations не загружен</div>`;
    return;
  }
  if (!uSvc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">service.constructionUnits не загружен</div>`;
    return;
  }
  await loc.init();
  await uSvc.init();
  if (_buildingId && typeof uSvc.migrateUnitsToApartmentNodes === "function") {
    try {
      await uSvc.migrateUnitsToApartmentNodes(_buildingId);
    } catch (e) {
      console.warn("[transfer-board] migrateUnitsToApartmentNodes", e);
    }
  }
  closeUnitCard();
  root.innerHTML = `
    <div class="max-w-5xl mx-auto">
      <div class="mb-3">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Передача · шахматка v2</div>
        <p class="text-[11px] text-slate-400 font-bold mt-0.5">Клик по клетке — карточка квартиры${_isGuest() ? " (только просмотр)" : ""}</p>
      </div>
      ${_selectorsHtml(loc)}
      <div id="c2-transfer-grid">${_renderGrid(uSvc, loc)}</div>
    </div>`;
  _bindOnce$1();
}
function _bindOnce$1() {
  if (_bound$1) return;
  _bound$1 = true;
  document.addEventListener(
    "change",
    (ev) => {
      const t = ev.target;
      if (!t) return;
      if (t.id === "c2-transfer-object") {
        _objectId = t.value || null;
        _buildingId = null;
        void _refreshBoard();
        return;
      }
      if (t.id === "c2-transfer-building") {
        _buildingId = t.value || null;
        void _refreshBoard();
      }
    },
    true
  );
  document.addEventListener(
    "click",
    (ev) => {
      var _a, _b;
      const t = ev.target;
      if (!t) return;
      const gen = (_a = t.closest) == null ? void 0 : _a.call(t, "[data-c2-generate-grid]");
      if (gen) {
        ev.preventDefault();
        void _onGenerate();
        return;
      }
      const cell = (_b = t.closest) == null ? void 0 : _b.call(t, "[data-c2-unit-cell]");
      if (cell) {
        ev.preventDefault();
        const id = cell.getAttribute("data-c2-unit-cell");
        const uSvc = _units();
        const loc = _loc$1();
        const u = id && uSvc ? uSvc.get(id) : null;
        if (u && uSvc) {
          openUnitCard(u, {
            loc,
            units: uSvc,
            cb: {
              onChanged: _refreshBoard,
              isGuest: _isGuest,
              canSoftDelete: _canSoftDelete,
              toast: _toast,
              onOpenApartmentPlan: async (unit) => {
                closeUnitCard();
                await openApartmentPlan(unit, {
                  isGuest: _isGuest,
                  toast: _toast,
                  onChanged: _refreshBoard
                });
              }
            }
          });
        }
      }
    },
    true
  );
}
async function _onGenerate() {
  if (!_buildingId || !_canManage()) return;
  if (!confirm("Сгенерировать по 8 квартир на каждом этаже? (статус — не осматривалась)")) return;
  const uSvc = _units();
  if (!uSvc) return;
  try {
    _toast("⏳ Генерируем помещения…");
    const created = await uSvc.generateGrid(_buildingId, 8);
    _toast(`✅ Создано: ${created.length}`);
    await _refreshBoard();
  } catch (e) {
    console.warn("[transfer-board] generateGrid", e);
    _toast(`Ошибка: ${(e == null ? void 0 : e.message) || e}`);
  }
}
function _loc() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations) || null;
}
function _defects() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionDefects) || null;
}
function _acc() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionAcceptance) || null;
}
function _escape(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
let _selectedFloorId = null;
let _bound = false;
let _viewer = null;
let _addMode = false;
let _zoneMode = false;
let _mountedPdfUrl = null;
let _subview = "plan";
let _pendingFocusAccId = null;
function _root() {
  return document.getElementById("construction-v2-root");
}
function _renderTree(svc) {
  const objects = svc.listNodes({ nodeType: "object", parentId: null });
  if (!objects.length) {
    return `<div class="p-6 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
      Нет объектов. Создайте иерархию в Настройках → «Объекты и планы».
    </div>`;
  }
  let html = '<ul class="space-y-1 text-[12px]">';
  for (const obj of objects) {
    html += `<li class="font-black text-slate-700 dark:text-slate-200">${_escape(obj.displayName)}`;
    const buildings = svc.getChildren(obj.id);
    html += '<ul class="ml-3 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">';
    for (const b of buildings) {
      html += `<li><span class="font-bold text-slate-600 dark:text-slate-300">${_escape(b.displayName)}</span>`;
      const sections = svc.getChildren(b.id);
      html += '<ul class="ml-2 mt-0.5 space-y-0.5">';
      for (const sec of sections) {
        html += `<li class="text-slate-500">${_escape(sec.displayName)}`;
        const floors = svc.getChildren(sec.id);
        html += '<ul class="ml-2">';
        for (const fl of floors) {
          const plan = svc.getPlanForFloor(fl.id);
          const active = _selectedFloorId === fl.id ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800" : "hover:bg-slate-100 dark:hover:bg-slate-800";
          const mark = (plan == null ? void 0 : plan.pdf_url) ? "📄" : "⚠️";
          html += `<li>
            <button type="button" data-c2-floor="${_escape(fl.id)}"
              class="w-full text-left px-2 py-1 rounded-lg ${active} transition-colors">
              ${mark} ${_escape(fl.displayName)}
            </button>
          </li>`;
        }
        html += "</ul></li>";
      }
      html += "</ul></li>";
    }
    html += "</ul></li>";
  }
  html += "</ul>";
  return html;
}
function _renderPlanChrome(svc) {
  if (!_selectedFloorId) {
    return `<div class="flex items-center justify-center h-full min-h-[240px] text-slate-400 text-[11px] font-bold uppercase tracking-widest">
      Выберите этаж слева
    </div>`;
  }
  const floor = svc.getNode(_selectedFloorId);
  const plan = svc.getPlanForFloor(_selectedFloorId);
  const path = svc.getPath(_selectedFloorId).map((n) => n.displayName).join(" / ");
  if (!(plan == null ? void 0 : plan.pdf_url)) {
    return `<div class="p-6">
      <div class="text-[11px] font-bold text-slate-500 mb-2">${_escape(path)}</div>
      <div class="text-amber-600 font-black text-[12px] uppercase">Нет PDF-плана на этом этаже</div>
      <p class="text-[11px] text-slate-500 mt-2">Загрузите план в Настройках → «Объекты и планы».</p>
    </div>`;
  }
  const addCls = _addMode ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-indigo-600 border-indigo-200";
  const zoneCls = _zoneMode ? "bg-emerald-600 text-white border-emerald-600" : "bg-transparent text-emerald-700 border-emerald-200";
  return `<div class="flex flex-col h-full min-h-[320px]">
    <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
      <div class="text-[11px] font-bold text-slate-600 min-w-0">
        ${_escape(path || (floor == null ? void 0 : floor.displayName) || "")}
        <span class="ml-2 text-slate-400 font-normal">${_escape(plan.pdf_name || "")}</span>
      </div>
      <div class="flex gap-2 shrink-0">
        <button type="button" data-c2-zone-mode
          class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase ${zoneCls}">
          ${_zoneMode ? "2 клика на план…" : "Зона приёмки"}
        </button>
        <button type="button" data-c2-add-mode
          class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase ${addCls}">
          ${_addMode ? "Кликни на план…" : "+ Замечание"}
        </button>
      </div>
    </div>
    <div class="flex-1 relative bg-slate-100 dark:bg-slate-900 min-h-[280px]" id="c2-plan-host"></div>
    <div class="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-2">
      <span>Маркеры — замечания; прямоугольники — зоны приёмки.</span>
      <span id="c2-overlay-count"></span>
    </div>
  </div>`;
}
async function _mountViewerIfNeeded(svc) {
  const host = document.getElementById("c2-plan-host");
  if (!host || !_selectedFloorId) {
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }
  const plan = svc.getPlanForFloor(_selectedFloorId);
  if (!(plan == null ? void 0 : plan.pdf_url)) {
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }
  const needReload = !_viewer || _mountedPdfUrl !== plan.pdf_url;
  if (needReload) {
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = new PlanViewer(host, {
      onPlanClick: (x, y) => {
        var _a;
        if (!_selectedFloorId) return;
        const dSvc = _defects();
        if (!dSvc) {
          (_a = window.showToast) == null ? void 0 : _a.call(window, "service.constructionDefects не загружен");
          return;
        }
        _viewer == null ? void 0 : _viewer.drawTempPin(x, y);
        openCreateDefectForm(
          { locationId: _selectedFloorId, x, y },
          async (input) => {
            var _a2;
            await dSvc.create({
              locationId: input.locationId,
              x: input.x,
              y: input.y,
              description: input.description,
              category: input.category,
              contractorId: input.contractorId,
              deadline: input.deadline,
              template_key: input.template_key,
              item_id: input.item_id,
              item_name: input.item_name,
              norm_text: input.norm_text,
              photos: input.photos,
              status: "issued"
            });
            _addMode = false;
            _viewer == null ? void 0 : _viewer.setAddMode(false);
            _viewer == null ? void 0 : _viewer.clearTempPin();
            (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "Замечание сохранено");
            await _refreshOverlaysOnly();
            _syncModeButtons();
          },
          () => _viewer == null ? void 0 : _viewer.clearTempPin()
        );
      },
      onMarkerClick: (id) => {
        const dSvc = _defects();
        const d = dSvc == null ? void 0 : dSvc.get(id);
        if (!d || !dSvc) return;
        openViewDefectForm(
          d,
          async (defectId) => {
            var _a;
            await dSvc.softDelete(defectId);
            (_a = window.showToast) == null ? void 0 : _a.call(window, "Замечание удалено");
            await _refreshOverlaysOnly();
          },
          async (defectId, patch) => {
            var _a;
            await dSvc.update(defectId, patch);
            (_a = window.showToast) == null ? void 0 : _a.call(window, "Замечание обновлено");
            await _refreshOverlaysOnly();
          },
          async (defectId, input) => {
            var _a;
            await dSvc.changeStatus(defectId, input.status, {
              comment: input.comment,
              photos: input.photos
            });
            (_a = window.showToast) == null ? void 0 : _a.call(window, "✅ Статус обновлён");
            await _refreshOverlaysOnly();
          }
        );
      },
      onZoneDrawn: (zone) => {
        var _a;
        if (!_selectedFloorId) return;
        const aSvc = _acc();
        if (!aSvc) {
          (_a = window.showToast) == null ? void 0 : _a.call(window, "service.constructionAcceptance не загружен");
          return;
        }
        openCreateAcceptanceForm(
          { locationId: _selectedFloorId, zone },
          async (input) => {
            var _a2;
            await aSvc.create(input);
            _zoneMode = false;
            _viewer == null ? void 0 : _viewer.setZoneMode(false);
            (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "✅ Заявка отправлена");
            await _refreshOverlaysOnly();
            _syncModeButtons();
          },
          () => {
            _viewer == null ? void 0 : _viewer.clearTempZone();
          }
        );
      },
      onZoneClick: (id) => {
        const aSvc = _acc();
        const item = aSvc == null ? void 0 : aSvc.get(id);
        if (!item || !aSvc) return;
        openAcceptanceDetails(item, {
          onFocusPlan: (rid) => {
            _viewer == null ? void 0 : _viewer.setFocusZone(rid);
          },
          onChangeStatus: async (rid, status) => {
            var _a;
            await aSvc.changeStatus(rid, status);
            (_a = window.showToast) == null ? void 0 : _a.call(window, "✅ Статус обновлён");
            await _refreshOverlaysOnly();
          },
          onSoftDelete: async (rid) => {
            var _a;
            await aSvc.softDelete(rid);
            (_a = window.showToast) == null ? void 0 : _a.call(window, "Заявка отозвана");
            await _refreshOverlaysOnly();
          }
        });
      }
    });
    try {
      await _viewer.load(plan.pdf_url);
      _mountedPdfUrl = plan.pdf_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      host.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">Ошибка плана: ${_escape(msg)}</div>`;
      _viewer = null;
      _mountedPdfUrl = null;
      return;
    }
  }
  if (_viewer) {
    _viewer.setAddMode(_addMode);
    _viewer.setZoneMode(_zoneMode);
  }
  await _refreshOverlaysOnly();
  if (_pendingFocusAccId && _viewer) {
    _viewer.setFocusZone(_pendingFocusAccId);
    _pendingFocusAccId = null;
  }
}
function _syncModeButtons() {
  const addBtn = document.querySelector("[data-c2-add-mode]");
  if (addBtn) {
    addBtn.textContent = _addMode ? "Кликни на план…" : "+ Замечание";
    addBtn.className = _addMode ? "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-indigo-600 text-white border-indigo-600" : "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200";
  }
  const zoneBtn = document.querySelector("[data-c2-zone-mode]");
  if (zoneBtn) {
    zoneBtn.textContent = _zoneMode ? "2 клика на план…" : "Зона приёмки";
    zoneBtn.className = _zoneMode ? "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-emerald-600 text-white border-emerald-600" : "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-emerald-700 border-emerald-200";
  }
}
async function _refreshOverlaysOnly() {
  const dSvc = _defects();
  const aSvc = _acc();
  if (!_viewer || !_selectedFloorId) return;
  if (dSvc) await dSvc.init();
  if (aSvc) await aSvc.init();
  const defects = dSvc ? dSvc.listForFloor(_selectedFloorId) : [];
  const zones = aSvc ? aSvc.listForFloor(_selectedFloorId) : [];
  _viewer.setMarkers(defects);
  _viewer.setZones(zones);
  const countEl = document.getElementById("c2-overlay-count");
  if (countEl) countEl.textContent = `Замечаний: ${defects.length} · Зон: ${zones.length}`;
}
function setConstructionV2Subview(view) {
  _subview = view;
}
function requestFocusAcceptance(id, locationId) {
  _subview = "plan";
  _selectedFloorId = locationId;
  _pendingFocusAccId = id;
  renderConstructionV2().catch(() => {
  });
}
async function renderConstructionV2() {
  const root = _root();
  if (!root) return;
  if (_subview === "acceptance") {
    teardownTransferUi();
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    await renderAcceptanceKanban(root);
    return;
  }
  if (_subview === "transfer") {
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    await renderTransferBoard(root);
    return;
  }
  teardownTransferUi();
  const svc = _loc();
  if (!svc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">service.locations не загружен</div>`;
    return;
  }
  const dSvc = _defects();
  const aSvc = _acc();
  await svc.init();
  if (dSvc) await dSvc.init();
  if (aSvc) await aSvc.init();
  const prevFloor = _selectedFloorId;
  _viewer == null ? void 0 : _viewer.destroy();
  _viewer = null;
  _mountedPdfUrl = null;
  root.innerHTML = `
    <div class="flex flex-col md:flex-row gap-3 h-full min-h-[420px]">
      <aside class="md:w-72 shrink-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 overflow-y-auto max-h-[70vh]">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Иерархия (v2)</div>
        <div id="c2-tree">${_renderTree(svc)}</div>
        ${!dSvc ? `<div class="mt-3 text-[10px] text-amber-600 font-bold">constructionDefects не загружен</div>` : ""}
        ${!aSvc ? `<div class="mt-1 text-[10px] text-amber-600 font-bold">constructionAcceptance не загружен</div>` : ""}
      </aside>
      <main class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative" id="c2-plan">
        ${_renderPlanChrome(svc)}
      </main>
    </div>`;
  _bindOnce();
  if (prevFloor) _selectedFloorId = prevFloor;
  await _mountViewerIfNeeded(svc);
}
function _bindOnce() {
  if (_bound) return;
  _bound = true;
  document.addEventListener(
    "click",
    (ev) => {
      var _a, _b, _c;
      const t = ev.target;
      const floorBtn = (_a = t == null ? void 0 : t.closest) == null ? void 0 : _a.call(t, "[data-c2-floor]");
      if (floorBtn) {
        const id = floorBtn.getAttribute("data-c2-floor");
        if (!id) return;
        _selectedFloorId = id;
        _addMode = false;
        _zoneMode = false;
        renderConstructionV2().catch((e) => console.warn("[construction-v2] render", e));
        return;
      }
      const addBtn = (_b = t == null ? void 0 : t.closest) == null ? void 0 : _b.call(t, "[data-c2-add-mode]");
      if (addBtn) {
        _addMode = !_addMode;
        if (_addMode) _zoneMode = false;
        _viewer == null ? void 0 : _viewer.setAddMode(_addMode);
        _viewer == null ? void 0 : _viewer.setZoneMode(_zoneMode);
        _syncModeButtons();
        return;
      }
      const zoneBtn = (_c = t == null ? void 0 : t.closest) == null ? void 0 : _c.call(t, "[data-c2-zone-mode]");
      if (zoneBtn) {
        _zoneMode = !_zoneMode;
        if (_zoneMode) _addMode = false;
        _viewer == null ? void 0 : _viewer.setZoneMode(_zoneMode);
        _viewer == null ? void 0 : _viewer.setAddMode(_addMode);
        _syncModeButtons();
      }
    },
    true
  );
}
function mountConstructionV2Shell() {
  var _a, _b, _c, _d;
  const content = ((_d = (_c = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.shell) == null ? void 0 : _c.getContentRoot) == null ? void 0 : _d.call(_c)) || document.getElementById("app-content") || document.getElementById("app-root");
  if (!content) return;
  if (document.getElementById("tab-construction-v2")) return;
  const section = document.createElement("div");
  section.id = "tab-construction-v2";
  section.className = "view-section hidden";
  section.innerHTML = `
    <div class="p-3 sm:p-4">
      <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <h2 class="text-[14px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Стройконтроль в2 (тест)</h2>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Тестовый контур · основной СК не затронут</p>
        </div>
        <a href="#/construction/defects" class="text-[10px] font-black uppercase text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-xl">Открыть старый СК</a>
      </div>
      <div id="construction-v2-root"></div>
    </div>`;
  content.appendChild(section);
}
async function refreshConstructionV2Markers() {
  const tab = document.getElementById("tab-construction-v2");
  if (!tab || tab.classList.contains("hidden")) return;
  if (_subview === "acceptance") {
    const root = _root();
    if (root) await renderAcceptanceKanban(root);
    return;
  }
  if (_subview === "transfer") {
    const root = _root();
    if (root) await renderTransferBoard(root);
    return;
  }
  await _refreshOverlaysOnly();
}
let _inited = false;
function _hashPath() {
  return (location.hash || "").replace(/^#/, "");
}
function _applyHashSubview() {
  const h = _hashPath();
  if (h.startsWith("/construction-v2/acceptance")) {
    setConstructionV2Subview("acceptance");
  } else if (h.startsWith("/construction-v2/transfer")) {
    setConstructionV2Subview("transfer");
  } else if (h.startsWith("/construction-v2")) {
    setConstructionV2Subview("plan");
  }
}
async function init(_ctx) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  if (_inited) {
    _applyHashSubview();
    await renderConstructionV2();
    return { ok: true, reentered: true };
  }
  mountConstructionV2Shell();
  _applyHashSubview();
  await renderConstructionV2();
  (_c = (_b = (_a = window.RBI) == null ? void 0 : _a.events) == null ? void 0 : _b.on) == null ? void 0 : _c.call(_b, "locations:changed", () => {
    const tab = document.getElementById("tab-construction-v2");
    if (tab && !tab.classList.contains("hidden")) {
      renderConstructionV2().catch(() => {
      });
    }
  });
  (_f = (_e = (_d = window.RBI) == null ? void 0 : _d.events) == null ? void 0 : _e.on) == null ? void 0 : _f.call(_e, "construction-defects:changed", () => {
    refreshConstructionV2Markers().catch(() => {
    });
    refreshApartmentPlanMarkers().catch(() => {
    });
  });
  (_i = (_h = (_g = window.RBI) == null ? void 0 : _g.events) == null ? void 0 : _h.on) == null ? void 0 : _i.call(_h, "construction-acceptance:changed", () => {
    refreshConstructionV2Markers().catch(() => {
    });
  });
  (_l = (_k = (_j = window.RBI) == null ? void 0 : _j.events) == null ? void 0 : _k.on) == null ? void 0 : _l.call(_k, "construction-units:changed", () => {
    refreshConstructionV2Markers().catch(() => {
    });
  });
  (_o = (_n = (_m = window.RBI) == null ? void 0 : _m.events) == null ? void 0 : _n.on) == null ? void 0 : _o.call(_n, "construction-acceptance:focus", (payload) => {
    const p = payload || {};
    if (p.id && p.locationId) requestFocusAcceptance(p.id, p.locationId);
  });
  _registerAppRouter();
  if (_hashPath().startsWith("/construction-v2")) {
    showTab();
  }
  _inited = true;
  console.info("[construction-v2] init ok");
  return { ok: true };
}
function showTab() {
  document.querySelectorAll(".view-section").forEach((el) => {
    el.classList.remove("active");
  });
  const tab = document.getElementById("tab-construction-v2");
  if (tab) {
    tab.classList.remove("hidden");
    tab.classList.add("active");
  }
  const modeMgr = window.AppModeManager;
  if (modeMgr == null ? void 0 : modeMgr.updateHeaderVisibility) {
    modeMgr.updateHeaderVisibility(true);
  } else {
    const header = document.getElementById("main-header");
    if (header) header.style.display = "block";
  }
  if ((modeMgr == null ? void 0 : modeMgr.currentMode) === "construction-v2" && typeof modeMgr.renderBottomNav === "function") {
    modeMgr.renderBottomNav();
  } else {
    const navEl = document.getElementById("main-bottom-nav");
    if (navEl && (modeMgr == null ? void 0 : modeMgr.currentMode) === "construction-v2") navEl.style.display = "flex";
  }
  if (typeof window.updateBodyPadding === "function") {
    setTimeout(() => {
      var _a;
      return (_a = window.updateBodyPadding) == null ? void 0 : _a.call(window);
    }, 50);
  }
  _applyHashSubview();
  renderConstructionV2().catch(() => {
  });
}
function _registerAppRouter() {
  const router = window.AppRouter;
  if (router && typeof router.addRoute === "function") {
    router.addRoute("#/construction-v2", () => showTab());
    router.addRoute("#/construction-v2/acceptance", () => showTab());
    router.addRoute("#/construction-v2/transfer", () => showTab());
  }
}
function registerModule() {
  var _a;
  window.RBI = window.RBI || { services: {} };
  const mod = { init, showTab, manifest: ConstructionV2Manifest, render: renderConstructionV2 };
  if ((_a = window.RBI.registry) == null ? void 0 : _a.register) {
    window.RBI.registry.register("module.construction-v2", mod);
  }
  window.ConstructionV2Module = mod;
  _registerAppRouter();
  window.addEventListener("hashchange", () => {
    const h = _hashPath();
    if (h.startsWith("/construction-v2")) showTab();
  });
  if (_hashPath().startsWith("/construction-v2")) {
    setTimeout(() => showTab(), 0);
  }
}
registerModule();
const index = { init, showTab, manifest: ConstructionV2Manifest };
export {
  ConstructionV2Manifest,
  index as default,
  init,
  showTab
};
//# sourceMappingURL=construction-v2.js.map
