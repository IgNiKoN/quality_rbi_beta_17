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
function isContractorRole() {
  var _a, _b, _c;
  const perms = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.permissions;
  return (((_c = perms == null ? void 0 : perms.getCurrentRole) == null ? void 0 : _c.call(perms)) || "") === "contractor";
}
function resolveMyContractorId() {
  var _a, _b, _c, _d, _e;
  const perms = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.permissions;
  const name = String(((_c = perms == null ? void 0 : perms.getAssignedContractor) == null ? void 0 : _c.call(perms)) || "").trim();
  if (!name) return null;
  const contractors = (_e = (_d = window.RBI) == null ? void 0 : _d.services) == null ? void 0 : _e.contractors;
  if (!(contractors == null ? void 0 : contractors.resolveIdFromNormalized)) return null;
  const id = String(
    contractors.resolveIdFromNormalized({
      display_name: name,
      contractor_name: name
    }) || ""
  ).trim();
  if (!id || id === "pending") return null;
  return id;
}
function filterDefectsForRole(list) {
  if (!isContractorRole()) return list;
  const myId = resolveMyContractorId();
  if (!myId) return [];
  return (list || []).filter((d) => String(d.contractorId || "").trim() === myId);
}
function filterAcceptancesForRole(list) {
  if (!isContractorRole()) return list;
  const myId = resolveMyContractorId();
  if (!myId) return [];
  return (list || []).filter((a) => String(a.contractorId || "").trim() === myId);
}
function _escape$b(s) {
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
function _sysTemplates$2() {
  return window.SYSTEM_TEMPLATES || {};
}
function _userTemplates$2() {
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
  if (type === "sys") return ((_a = _sysTemplates$2()[key]) == null ? void 0 : _a.groups) || [];
  if (type === "user") return ((_b = _userTemplates$2()[key]) == null ? void 0 : _b.groups) || [];
  return [];
}
function _catLabel(c) {
  if (c === "B1" || c === "minor") return "B1 (Мелкий)";
  if (c === "B3" || c === "critical") return "B3 (Критика)";
  return "B2 (Значимый)";
}
function _statusLabel$2(s) {
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
async function _fileToDataUrl$1(file) {
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
    const dataUrl = await _fileToDataUrl$1(file);
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
  if (el) {
    el.style.zIndex = "1200";
    return el;
  }
  el = document.createElement("div");
  el.id = "c2-defect-modal";
  el.className = "fixed inset-0 hidden items-center justify-center bg-black/40 p-3";
  el.style.zIndex = "1200";
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
  const st = _sysTemplates$2();
  Object.keys(st).sort().forEach((k) => {
    const sel = selected === `sys_${k}` ? " selected" : "";
    html += `<option value="sys_${_escape$b(k)}"${sel}>[СИС] ${_escape$b(st[k].title || k)}</option>`;
  });
  const ut = _userTemplates$2();
  Object.keys(ut).sort().forEach((k) => {
    const sel = selected === `user_${k}` ? " selected" : "";
    html += `<option value="user_${_escape$b(k)}"${sel}>[МОЙ] ${_escape$b(ut[k].title || k)}</option>`;
  });
  return html;
}
function _contractorOptionsHtml(selected) {
  const opts = _contractors();
  return `<option value="">— без подрядчика —</option>` + opts.map((o) => {
    const sel = selected === o.id ? " selected" : "";
    return `<option value="${_escape$b(o.id)}"${sel}>${_escape$b(o.label)}</option>`;
  }).join("");
}
function _renderGallery(photos) {
  if (!photos.length) {
    return `<div class="text-[10px] text-slate-400 mb-2" data-c2-photo-empty>Нет фото</div>`;
  }
  return `<div class="grid grid-cols-3 gap-2 mb-2" data-c2-photo-grid>
    ${photos.map(
    (p, i) => `<div class="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" data-c2-photo-idx="${i}">
      <img src="${_escape$b(_photoSrc(p))}" alt="" class="w-full h-full object-cover cursor-pointer" data-c2-photo-view="${_escape$b(p)}" />
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
          data-c2-pick-item data-id="${_escape$b(i.id)}" data-name="${_escape$b(i.n)}" data-w="${w}" data-norm="${_escape$b(i.t || "")}">
          <div class="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
            <span class="text-[9px] font-black text-white bg-slate-400 px-1 rounded mr-1">B${w}</span>${_escape$b(i.n)}
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
    const stName = _statusLabel$2(String(h.status || ""));
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
      (p) => `<img src="${_escape$b(_photoSrc(String(p)))}" class="w-10 h-10 object-cover rounded border cursor-pointer mt-1" data-c2-photo-view="${_escape$b(String(p))}" alt="" />`
    ).join("");
    return `<div class="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
      <div class="flex justify-between font-bold mb-1"><span class="text-indigo-600">${_escape$b(stName)}</span><span class="text-slate-400">${_escape$b(dDate)}</span></div>
      <div class="text-slate-600 dark:text-slate-300">${_escape$b(h.user || "")}${h.comment ? ` — <i>${_escape$b(String(h.comment))}</i>` : ""}</div>
      <div class="flex gap-1 flex-wrap">${photosHtml}</div>
    </div>`;
  });
  return `<div class="w-full mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2 max-h-36 overflow-y-auto" data-c2-history>
    ${rows.join("")}
  </div>`;
}
function openCreateDefectForm(coords, onSave, onCancel, prefill) {
  var _a, _b;
  const root = _ensureOverlay();
  const panel = root.querySelector("[data-c2-defect-panel]");
  const photosRef = { current: [] };
  const catOpts = DEFECT_CATEGORIES_V2.map(
    (c) => `<option value="${c}"${c === "B2" ? " selected" : ""}>${_escape$b(_catLabel(c))}</option>`
  ).join("");
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[13px] font-black uppercase tracking-tight">Новое замечание</h3>
      <button type="button" data-c2-defect-close class="text-slate-400 text-[11px] font-bold uppercase">Закрыть</button>
    </div>
    <p class="text-[10px] text-slate-400 mb-3">Координаты: ${coords.x.toFixed(1)}% × ${coords.y.toFixed(1)}%</p>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Вид работ (чек-лист) *</label>
    <select data-c2-template class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3">
      ${_templateOptionsHtml(prefill == null ? void 0 : prefill.template_key)}
    </select>
    <div class="relative mb-3">
      <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Нарушение *</label>
      <input type="text" data-c2-item-search autocomplete="off" placeholder="Начните вводить нарушение..."
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]"
        value="${_escape$b((prefill == null ? void 0 : prefill.item_name) || "")}" />
      <input type="hidden" data-c2-item-id value="${_escape$b((prefill == null ? void 0 : prefill.item_id) || "")}" />
      <input type="hidden" data-c2-item-name value="${_escape$b((prefill == null ? void 0 : prefill.item_name) || "")}" />
      <div data-c2-item-dd class="absolute top-[48px] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl z-[150] hidden max-h-48 overflow-y-auto"></div>
    </div>
    <div data-c2-norm-block class="${(prefill == null ? void 0 : prefill.norm_text) ? "" : "hidden"} bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl mb-3">
      <div class="text-[9px] font-black uppercase text-indigo-500 mb-1">Справочно (Норматив)</div>
      <div data-c2-norm-text class="text-[10px] text-slate-600 dark:text-slate-400 font-medium">${_escape$b((prefill == null ? void 0 : prefill.norm_text) || "")}</div>
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
      class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3">${_escape$b((prefill == null ? void 0 : prefill.description) || (prefill == null ? void 0 : prefill.item_name) || "")}</textarea>
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
  var _a, _b, _c, _d;
  if (isContractorRole()) {
    const myId = resolveMyContractorId();
    if (!myId || String(defect.contractorId || "").trim() !== myId) {
      (_a = window.showToast) == null ? void 0 : _a.call(window, "⚠️ Нет доступа к чужому замечанию");
      return;
    }
  }
  const root = _ensureOverlay();
  const panel = root.querySelector("[data-c2-defect-panel]");
  const photosRef = {
    current: Array.isArray(defect.photos) ? defect.photos.slice() : defect.photo ? [String(defect.photo)] : []
  };
  const { isEngineer } = _roleInfo$1();
  const catOpts = DEFECT_CATEGORIES_V2.map((c) => {
    const sel = String(defect.category).toUpperCase() === c ? " selected" : "";
    return `<option value="${c}"${sel}>${_escape$b(_catLabel(c))}</option>`;
  }).join("");
  const deadlineVal = _deadlineInputValue(defect.deadline);
  const canEditFields = isEngineer;
  const disabled = canEditFields ? "" : " disabled";
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[13px] font-black uppercase tracking-tight">Замечание</h3>
      <button type="button" data-c2-defect-close class="text-slate-400 text-[11px] font-bold uppercase">Закрыть</button>
    </div>
    <p class="text-[10px] text-slate-400 mb-1">Статус: <b>${_escape$b(_statusLabel$2(String(defect.status)))}</b></p>
    <p class="text-[10px] text-slate-400 mb-3">Координаты: ${Number(defect.x).toFixed(1)}% × ${Number(defect.y).toFixed(1)}%</p>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Вид работ</label>
    <select data-c2-template class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"${disabled}>
      ${_templateOptionsHtml(defect.template_key)}
    </select>
    <div class="relative mb-3">
      <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Нарушение</label>
      <input type="text" data-c2-item-search autocomplete="off" value="${_escape$b(defect.item_name || "")}"
        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]"${disabled} />
      <input type="hidden" data-c2-item-id value="${_escape$b(defect.item_id || "")}" />
      <input type="hidden" data-c2-item-name value="${_escape$b(defect.item_name || "")}" />
      <div data-c2-item-dd class="absolute top-[48px] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl z-[150] hidden max-h-48 overflow-y-auto"></div>
    </div>
    <div data-c2-norm-block class="${defect.norm_text ? "" : "hidden"} bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl mb-3">
      <div class="text-[9px] font-black uppercase text-indigo-500 mb-1">Справочно (Норматив)</div>
      <div data-c2-norm-text class="text-[10px] text-slate-600 dark:text-slate-400 font-medium">${_escape$b(defect.norm_text || "")}</div>
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
        <input type="date" data-c2-defect-deadline value="${_escape$b(deadlineVal)}"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]"${disabled} />
      </div>
    </div>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Подрядчик</label>
    <select data-c2-defect-contractor class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"${disabled}>
      ${_contractorOptionsHtml(defect.contractorId)}
    </select>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Описание</label>
    <textarea data-c2-defect-desc rows="3"
      class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"${disabled}>${_escape$b(defect.description)}</textarea>
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
    (_b = panel.querySelector("[data-c2-photo-add]")) == null ? void 0 : _b.addEventListener("click", () => {
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
  (_c = panel.querySelector("[data-c2-defect-save]")) == null ? void 0 : _c.addEventListener("click", async () => {
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
  (_d = panel.querySelector("[data-c2-defect-delete]")) == null ? void 0 : _d.addEventListener("click", async () => {
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
      var _a2, _b2, _c2, _d2, _e;
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
          (_d2 = window.showToast) == null ? void 0 : _d2.call(window, "⚠️ Не удалось сохранить фото");
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
function _xy(d) {
  const x = Number(d.x);
  const y = Number(d.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
function clusterDefects(defects, thresholdPct = 2.5) {
  const indexed = [];
  defects.forEach((d, i) => {
    const p = _xy(d);
    if (!p) return;
    indexed.push({ d, num: i + 1, x: p.x, y: p.y });
  });
  const remaining = indexed.slice();
  const out = [];
  while (remaining.length > 0) {
    const base = remaining.shift();
    const group = [base];
    let i = 0;
    while (i < remaining.length) {
      const p = remaining[i];
      const dist = Math.hypot(base.x - p.x, base.y - p.y);
      if (dist < thresholdPct) {
        group.push(p);
        remaining.splice(i, 1);
      } else {
        i++;
      }
    }
    if (group.length === 1) {
      out.push({
        kind: "single",
        x: group[0].x,
        y: group[0].y,
        defects: [group[0].d],
        num: group[0].num
      });
    } else {
      const n = group.length;
      const avgX = group.reduce((s, g) => s + g.x, 0) / n;
      const avgY = group.reduce((s, g) => s + g.y, 0) / n;
      out.push({
        kind: "cluster",
        x: avgX,
        y: avgY,
        defects: group.map((g) => g.d),
        num: n
      });
    }
  }
  return out;
}
function spiderPositions(centerX, centerY, count, radiusPct = 5) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: centerX, y: centerY }];
  const pts = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 2 * i / count - Math.PI / 2;
    const x = Math.min(98, Math.max(2, centerX + Math.cos(angle) * radiusPct));
    const y = Math.min(98, Math.max(2, centerY + Math.sin(angle) * radiusPct));
    pts.push({ x, y });
  }
  return pts;
}
const PZ_STEP = 0.2;
const PZ_MIN = 0.4;
const PZ_MAX = 8;
function _pdfjs() {
  return window.pdfjsLib || null;
}
function _panzoomFactory() {
  return window.Panzoom || null;
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
    this.highlightId = null;
    this.destroyed = false;
    this.pdfUrl = "";
    this.panzoom = null;
    this._onWheelBound = null;
    this._onPointerBound = null;
    this._lastPointerClient = null;
    this._lastMarkers = [];
    this._lastClusterThreshold = 2.5;
    this._expandedClusterKey = null;
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
  getMarkerEl(id) {
    if (!this.pins || !id) return null;
    const pins = this.pins.querySelectorAll("[data-c2-pin]");
    for (const el of pins) {
      if (el.getAttribute("data-c2-pin") === id) return el;
    }
    return null;
  }
  /** Подсветка маркера (pulse/ring) + по возможности pan к пину. */
  highlightMarker(id) {
    this.highlightId = id;
    this._applyHighlight();
    if (id) this._panToMarker(id);
  }
  setScale(scale) {
    if (!this.panzoom) return;
    const s = Math.min(PZ_MAX, Math.max(PZ_MIN, Number(scale) || 1));
    this.panzoom.zoomToPoint(s, this._getZoomPoint());
  }
  zoomIn() {
    if (!this.panzoom) return;
    const next = Math.min(PZ_MAX, this.panzoom.getScale() * Math.exp(PZ_STEP));
    this.panzoom.zoomToPoint(next, this._getZoomPoint());
  }
  zoomOut() {
    if (!this.panzoom) return;
    const next = Math.max(PZ_MIN, this.panzoom.getScale() * Math.exp(-PZ_STEP));
    this.panzoom.zoomToPoint(next, this._getZoomPoint());
  }
  /**
   * Точка zoom в client coords: последний pointer над wrap, иначе центр viewport.
   * Важно: Panzoom.zoom({focal}) ждёт уже сконвертированные coords;
   * clientX/Y передаём через zoomToPoint (как zoomWithWheel).
   */
  _getZoomPoint() {
    if (this._lastPointerClient) {
      return { clientX: this._lastPointerClient.x, clientY: this._lastPointerClient.y };
    }
    if (!this.wrap) return { clientX: 0, clientY: 0 };
    const r = this.wrap.getBoundingClientRect();
    return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  }
  /** Сброс масштаба/пана к стартовому fit. */
  fit() {
    if (!this.panzoom) return;
    this.panzoom.reset({ animate: true });
  }
  getScale() {
    var _a;
    return ((_a = this.panzoom) == null ? void 0 : _a.getScale()) ?? 1;
  }
  destroy() {
    this.destroyed = true;
    this._destroyPanzoom();
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
    this._destroyPanzoom();
    this.host.innerHTML = `
      <div class="absolute inset-0 overflow-hidden bg-slate-200 dark:bg-slate-900 flex items-center justify-center" data-c2-plan-wrap>
        <div class="relative shadow-lg bg-white" data-c2-plan-stage style="width:fit-content;touch-action:none">
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
    if (typeof window.rbiLoadCloudPdfArrayBuffer === "function") {
      buf = await window.rbiLoadCloudPdfArrayBuffer(pdfUrl);
    } else {
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
        if (navigator.onLine === false) throw new Error("PDF не кэширован офлайн");
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error("Не удалось скачать PDF");
        buf = await res.arrayBuffer();
      }
    }
    if (this.destroyed) return;
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const hostW = Math.max(this.host.clientWidth || 640, 320);
    const hostH = Math.max(this.host.clientHeight || 400, 240);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, Math.max(0.8, Math.min((hostW - 24) / base.width, (hostH - 24) / base.height)));
    const viewport = page.getViewport({ scale });
    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    this.stage.style.width = `${viewport.width}px`;
    this.stage.style.height = `${viewport.height}px`;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d недоступен");
    await page.render({ canvasContext: ctx, viewport }).promise;
    if (loader) loader.remove();
    this._initPanzoom();
    this._syncCursor();
  }
  setMarkers(defects, opts) {
    if (!this.pins) return;
    this._lastMarkers = defects.slice();
    const thr = (opts == null ? void 0 : opts.clusterThreshold) !== void 0 ? opts.clusterThreshold : this._lastClusterThreshold;
    this._lastClusterThreshold = thr;
    const items = thr <= 0 ? null : clusterDefects(defects, thr);
    const parts = [];
    if (!items) {
      defects.forEach((d, i) => {
        const pin = this._singlePinHtml(d, i + 1, Number(d.x), Number(d.y));
        if (pin) parts.push(pin);
      });
    } else {
      const expandKey = this._expandedClusterKey;
      for (const item of items) {
        if (item.kind === "single") {
          const pin = this._singlePinHtml(item.defects[0], item.num, item.x, item.y);
          if (pin) parts.push(pin);
          continue;
        }
        const key = item.defects.map((d) => d.id).sort().join(",");
        if (expandKey && expandKey === key) {
          const spider = spiderPositions(item.x, item.y, item.defects.length);
          item.defects.forEach((d, i) => {
            const pos = spider[i] || { x: item.x, y: item.y };
            const idx = defects.findIndex((x) => x.id === d.id);
            const num = idx >= 0 ? idx + 1 : i + 1;
            const pin = this._singlePinHtml(d, num, pos.x, pos.y);
            if (pin) parts.push(pin);
          });
          parts.push(`<button type="button" data-c2-cluster-collapse="${_escapeAttr(key)}"
            class="absolute w-5 h-5 rounded-full bg-slate-800/80 text-white text-[8px] font-black
                   border border-white shadow z-25 flex items-center justify-center
                   pointer-events-auto panzoom-exclude"
            style="left:${item.x}%;top:${item.y}%;transform:translate(-50%,-50%);transition:transform 150ms ease"
            title="Свернуть">×</button>`);
        } else {
          parts.push(this._clusterBubbleHtml(item.x, item.y, item.defects, key));
        }
      }
    }
    this.pins.innerHTML = parts.join("");
    this._bindPinHoverScale();
    this._applyHighlight();
  }
  /** Grow pin on hover without losing centering (inline transform beats style.css lift). */
  _bindPinHoverScale() {
    if (!this.pins) return;
    const rest = "translate(-50%,-50%)";
    const hover = "translate(-50%,-50%) scale(1.15)";
    this.pins.querySelectorAll("[data-c2-pin], [data-c2-cluster], [data-c2-cluster-collapse]").forEach((node) => {
      const el = node;
      el.addEventListener("pointerenter", () => {
        el.style.transform = hover;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = rest;
      });
    });
  }
  _singlePinHtml(d, num, x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
    const bg = _pinBg(String(d.category), String(d.status));
    const title = _escapeAttr(String(d.description || "").slice(0, 80));
    return `<button type="button" data-c2-pin="${_escapeAttr(d.id)}"
      class="absolute w-6 h-6 ${bg} rounded-full border-2 border-white shadow-md
             flex items-center justify-center text-white text-[10px] font-black
             z-20 pointer-events-auto panzoom-exclude"
      style="left:${x}%;top:${y}%;transform:translate(-50%,-50%);cursor:pointer;transition:transform 150ms ease" title="${title}">${num}</button>`;
  }
  _clusterBubbleHtml(x, y, defects, key) {
    const total = defects.length;
    let red = 0;
    let orange = 0;
    let blue = 0;
    for (const d of defects) {
      const st = String(d.status || "").toLowerCase();
      if (st === "closed" || st === "fixed") ;
      else {
        const c = String(d.category || "").toLowerCase();
        if (c === "critical" || c === "b3") red++;
        else if (c === "major" || c === "b2") orange++;
        else blue++;
      }
    }
    const cRed = red / total * 360;
    const cOrange = cRed + orange / total * 360;
    const cBlue = cOrange + blue / total * 360;
    const grad = `conic-gradient(from 0deg, #ef4444 0deg ${cRed}deg, #f97316 ${cRed}deg ${cOrange}deg, #3b82f6 ${cOrange}deg ${cBlue}deg, #22c55e ${cBlue}deg 360deg)`;
    const ids = defects.map((d) => d.id).join(",");
    return `<button type="button" data-c2-cluster="${_escapeAttr(key)}" data-c2-cluster-ids="${_escapeAttr(ids)}"
      class="absolute w-8 h-8 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.3)] flex items-center justify-center
             z-30 pointer-events-auto panzoom-exclude"
      style="left:${x}%;top:${y}%;background:${grad};padding:3px;transform:translate(-50%,-50%);cursor:pointer;transition:transform 150ms ease" title="Замечаний: ${total}">
      <span class="w-full h-full bg-white text-slate-800 rounded-full flex items-center justify-center
                   text-[11px] font-black border border-slate-200">${total}</span>
    </button>`;
  }
  collapseClusterExpand() {
    if (!this._expandedClusterKey) return;
    this._expandedClusterKey = null;
    this.setMarkers(this._lastMarkers, { clusterThreshold: this._lastClusterThreshold });
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
                 cursor-pointer hover:bg-black/10 transition-colors pointer-events-auto panzoom-exclude"
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
               animate-bounce pointer-events-none"
        style="left:${xPercent}%;top:${yPercent}%;transform:translate(-50%,-50%)">+</div>`
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
  _initPanzoom() {
    this._destroyPanzoom();
    const factory = _panzoomFactory();
    if (!factory || !this.stage || !this.wrap) return;
    this.panzoom = factory(this.stage, {
      maxScale: PZ_MAX,
      minScale: PZ_MIN,
      step: PZ_STEP,
      cursor: "grab",
      excludeClass: "panzoom-exclude"
    });
    this._onWheelBound = (e) => {
      if (!this.panzoom) return;
      e.preventDefault();
      this.panzoom.zoomWithWheel(e);
    };
    this.wrap.addEventListener("wheel", this._onWheelBound, { passive: false });
    this._lastPointerClient = null;
    this._onPointerBound = (e) => {
      this._lastPointerClient = { x: e.clientX, y: e.clientY };
    };
    this.wrap.addEventListener("pointermove", this._onPointerBound);
    this.wrap.addEventListener("mousemove", this._onPointerBound);
  }
  _destroyPanzoom() {
    if (this.wrap && this._onWheelBound) {
      this.wrap.removeEventListener("wheel", this._onWheelBound);
    }
    this._onWheelBound = null;
    if (this.wrap && this._onPointerBound) {
      this.wrap.removeEventListener("pointermove", this._onPointerBound);
      this.wrap.removeEventListener("mousemove", this._onPointerBound);
    }
    this._onPointerBound = null;
    this._lastPointerClient = null;
    if (this.panzoom) {
      try {
        this.panzoom.destroy();
      } catch {
      }
      this.panzoom = null;
    }
  }
  _applyHighlight() {
    var _a;
    const pins = (_a = this.pins) == null ? void 0 : _a.querySelectorAll("[data-c2-pin]");
    pins == null ? void 0 : pins.forEach((el) => {
      const hid = el;
      const match = !!this.highlightId && hid.getAttribute("data-c2-pin") === this.highlightId;
      hid.classList.toggle("ring-4", match);
      hid.classList.toggle("ring-yellow-300", match);
      hid.classList.toggle("scale-150", match);
      hid.classList.toggle("animate-pulse", match);
      hid.style.zIndex = match ? "40" : "";
    });
  }
  _panToMarker(id) {
    if (!this.panzoom || !this.wrap) return;
    const el = this.getMarkerEl(id);
    if (!el) return;
    const run = () => {
      if (!this.panzoom || !this.wrap) return;
      const er = el.getBoundingClientRect();
      const wr = this.wrap.getBoundingClientRect();
      const dx = wr.left + wr.width / 2 - (er.left + er.width / 2);
      const dy = wr.top + wr.height / 2 - (er.top + er.height / 2);
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      const pan = this.panzoom.getPan();
      const s = this.panzoom.getScale() || 1;
      this.panzoom.pan(pan.x + dx / s, pan.y + dy / s, { animate: true });
    };
    if (this.panzoom.getScale() < 1.2) {
      const wr = this.wrap.getBoundingClientRect();
      this.panzoom.zoomToPoint(1.5, {
        clientX: wr.left + wr.width / 2,
        clientY: wr.top + wr.height / 2
      });
      setTimeout(run, 220);
    } else {
      requestAnimationFrame(run);
    }
  }
  _syncCursor() {
    if (!this.wrap) return;
    const cross = this.addMode || this.zoneMode;
    this.wrap.classList.toggle("cursor-crosshair", cross);
    this.wrap.classList.toggle("cursor-default", !cross);
    if (this.panzoom) {
      this.panzoom.setOptions({
        cursor: cross ? "crosshair" : "grab",
        disablePan: cross
      });
    }
  }
  _onClick(ev) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const t = ev.target;
    const zoneBtn = (_a = t == null ? void 0 : t.closest) == null ? void 0 : _a.call(t, "[data-c2-zone]");
    if (zoneBtn && !this.zoneMode && !this.addMode) {
      const id = zoneBtn.getAttribute("data-c2-zone");
      if (id) (_c = (_b = this.handlers).onZoneClick) == null ? void 0 : _c.call(_b, id);
      return;
    }
    const collapseBtn = (_d = t == null ? void 0 : t.closest) == null ? void 0 : _d.call(t, "[data-c2-cluster-collapse]");
    if (collapseBtn && !this.zoneMode) {
      this.collapseClusterExpand();
      return;
    }
    const clusterBtn = (_e = t == null ? void 0 : t.closest) == null ? void 0 : _e.call(t, "[data-c2-cluster]");
    if (clusterBtn && !this.zoneMode && !this.addMode) {
      const key = clusterBtn.getAttribute("data-c2-cluster");
      if (key) {
        this._expandedClusterKey = key;
        this.setMarkers(this._lastMarkers, { clusterThreshold: this._lastClusterThreshold });
      }
      return;
    }
    const pin = (_f = t == null ? void 0 : t.closest) == null ? void 0 : _f.call(t, "[data-c2-pin]");
    if (pin && !this.zoneMode) {
      const id = pin.getAttribute("data-c2-pin");
      if (id) {
        this._expandedClusterKey = null;
        (_h = (_g = this.handlers).onMarkerClick) == null ? void 0 : _h.call(_g, id);
      }
      return;
    }
    if (this._expandedClusterKey && !this.addMode && !this.zoneMode) {
      this.collapseClusterExpand();
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
        (_i = this.zonesEl) == null ? void 0 : _i.insertAdjacentHTML(
          "beforeend",
          `<div id="c2-temp-zone-dot"
            class="absolute w-3 h-3 bg-indigo-600 rounded-full border-2 border-white z-30
                   pointer-events-none"
            style="left:${xPercent}%;top:${yPercent}%;transform:translate(-50%,-50%)"></div>`
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
      (_k = (_j = this.handlers).onZoneDrawn) == null ? void 0 : _k.call(_j, zone);
      return;
    }
    if (!this.addMode) return;
    (_m = (_l = this.handlers).onPlanClick) == null ? void 0 : _m.call(_l, xPercent, yPercent);
  }
  getPdfUrl() {
    return this.pdfUrl;
  }
}
const ALL_PIN_STATUSES = [
  "issued",
  "in_progress",
  "fixed",
  "closed",
  "rejected"
];
const STATUS_LABELS = {
  issued: "Выдано",
  in_progress: "В работе",
  fixed: "На проверке",
  closed: "Закрыто",
  rejected: "Отклонено"
};
const STATUS_STYLES = {
  issued: {
    active: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400",
    badgeActive: "bg-red-600 text-white"
  },
  in_progress: {
    active: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400",
    badgeActive: "bg-blue-600 text-white"
  },
  fixed: {
    active: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400",
    badgeActive: "bg-orange-500 text-white"
  },
  closed: {
    active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400",
    badgeActive: "bg-green-600 text-white"
  },
  rejected: {
    active: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300",
    badgeActive: "bg-slate-500 text-white"
  }
};
const pinFiltersState = {
  statuses: [],
  category: "ALL"
};
function normalizePinCategory(c) {
  const v = String(c || "").toLowerCase();
  if (v === "minor" || v === "b1") return "B1";
  if (v === "major" || v === "b2") return "B2";
  if (v === "critical" || v === "b3") return "B3";
  const up = String(c || "").toUpperCase();
  if (up === "B1" || up === "B2" || up === "B3") return up;
  return up || "";
}
function filterDefectsByPins(defects, filters = pinFiltersState) {
  let out = defects.slice();
  if (filters.statuses.length > 0) {
    const set = new Set(filters.statuses.map(String));
    out = out.filter((d) => set.has(String(d.status)));
  }
  if (filters.category && filters.category !== "ALL") {
    out = out.filter((d) => normalizePinCategory(String(d.category)) === filters.category);
  }
  return out;
}
function countByStatus(defects) {
  const counts = {
    issued: 0,
    in_progress: 0,
    fixed: 0,
    closed: 0,
    rejected: 0
  };
  for (const d of defects) {
    const st = String(d.status);
    if (st in counts) counts[st]++;
  }
  return counts;
}
function toggleStatusFilter(filters, statusKey) {
  const idx = filters.statuses.indexOf(statusKey);
  if (idx > -1) filters.statuses.splice(idx, 1);
  else filters.statuses.push(statusKey);
  if (filters.statuses.length === ALL_PIN_STATUSES.length) {
    filters.statuses = [];
  }
}
function setCategoryFilter(filters, category) {
  filters.category = category;
}
function renderPinFiltersHtml(baseDefects, filters = pinFiltersState, opts) {
  let forCounts = baseDefects;
  if (filters.category && filters.category !== "ALL") {
    forCounts = baseDefects.filter(
      (d) => normalizePinCategory(String(d.category)) === filters.category
    );
  }
  const counts = countByStatus(forCounts);
  const isAllMode = filters.statuses.length === 0;
  const compact = !!(opts == null ? void 0 : opts.compact);
  const darkFs = !!(opts == null ? void 0 : opts.darkFs);
  const inactiveClass = darkFs ? "bg-white/10 text-slate-300 border-white/20" : "bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  const inactiveBadge = darkFs ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500 border border-slate-200 dark:border-slate-700";
  const chips = ALL_PIN_STATUSES.map((statusKey) => {
    const isActive = filters.statuses.includes(statusKey);
    const visuallyActive = isAllMode || isActive;
    const btnClass = visuallyActive ? STATUS_STYLES[statusKey].active : inactiveClass;
    const badgeClass = visuallyActive ? STATUS_STYLES[statusKey].badgeActive : inactiveBadge;
    const pad = compact ? "px-2 py-1" : "px-2.5 py-1.5";
    return `<button type="button" data-c2-pin-status="${statusKey}"
      class="shrink-0 ${pad} rounded-xl border text-[9px] font-bold uppercase transition-all flex items-center gap-1 active:scale-95 ${btnClass}">
      ${STATUS_LABELS[statusKey]}
      <span class="${badgeClass} px-1.5 py-0.5 rounded-md text-[8px] font-black min-w-[18px] text-center">${counts[statusKey] || 0}</span>
    </button>`;
  }).join("");
  const cats = [
    { key: "ALL", label: "Все" },
    { key: "B3", label: "B3" },
    { key: "B2", label: "B2" },
    { key: "B1", label: "B1" }
  ];
  const catBtns = cats.map(({ key, label }) => {
    const on = filters.category === key;
    const cls = on ? darkFs ? "bg-white text-slate-900" : "bg-indigo-600 text-white" : darkFs ? "bg-white/10 text-slate-300 hover:bg-white/20" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    return `<button type="button" data-c2-pin-category="${key}"
        class="px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${cls}">${label}</button>`;
  }).join("");
  return `<div data-c2-pin-filters class="flex flex-col gap-1.5 w-full min-w-0">
    <div class="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">${chips}</div>
    <div class="flex gap-1 items-center">
      <span class="text-[8px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Кат.</span>
      <div class="flex gap-0.5">${catBtns}</div>
    </div>
  </div>`;
}
function paintPinFilterHosts(baseDefects, filters = pinFiltersState, opts) {
  document.querySelectorAll("[data-c2-pin-filters-host]").forEach((el) => {
    const host = el;
    const dark = host.getAttribute("data-c2-pin-filters-host") === "fs" || !!(opts == null ? void 0 : opts.darkFs);
    host.innerHTML = renderPinFiltersHtml(baseDefects, filters, {
      compact: opts == null ? void 0 : opts.compact,
      darkFs: dark
    });
  });
}
let _viewer$1 = null;
let _openUnitId = null;
let _apartmentId = null;
let _addMode$1 = false;
function _escape$a(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _defects$2() {
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
function _pathLabel$2(apartmentId) {
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
  const dSvc = _defects$2();
  if (!_viewer$1 || !_apartmentId || !dSvc) return;
  await dSvc.init();
  const all = _listForApartment(dSvc, _apartmentId);
  const filtered = filterDefectsByPins(all, pinFiltersState);
  const host = document.querySelector('#c2-apartment-plan [data-c2-pin-filters-host="apt"]');
  if (host) {
    host.innerHTML = renderPinFiltersHtml(all, pinFiltersState, { compact: true });
  }
  _viewer$1.setMarkers(filtered);
  const countEl = document.getElementById("c2-apt-overlay-count");
  if (countEl) countEl.textContent = `Показано ${filtered.length} из ${all.length}`;
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
  var _a, _b, _c, _d, _e, _f;
  closeApartmentPlan();
  const pdfUrl = String(unit.pdf_url || "");
  if (!pdfUrl.startsWith("http")) {
    cb.toast("Сначала загрузите PDF плана квартиры");
    return;
  }
  const uSvc = _units$1();
  const dSvc = _defects$2();
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
  const path = _pathLabel$2(apartmentId);
  const wrap = document.createElement("div");
  wrap.id = "c2-apartment-plan";
  wrap.className = "fixed inset-0 flex flex-col bg-slate-100 dark:bg-slate-900";
  wrap.style.zIndex = "1100";
  wrap.innerHTML = `
    <div class="shrink-0 flex flex-col gap-1.5 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Замечания на плане · весь экран</div>
          <div class="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">${_escape$a(title)}</div>
          <div class="text-[10px] font-bold text-slate-400 truncate">${_escape$a(path)}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <span id="c2-apt-overlay-count" class="text-[10px] font-bold text-slate-400 hidden sm:inline">Показано 0 из 0</span>
          <div class="flex gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900/80">
            <button type="button" data-c2-apt-zoom-out
              class="w-8 h-8 rounded-lg text-[16px] font-black text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700" title="Уменьшить">−</button>
            <button type="button" data-c2-apt-zoom-in
              class="w-8 h-8 rounded-lg text-[16px] font-black text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700" title="Увеличить">+</button>
            <button type="button" data-c2-apt-zoom-fit
              class="px-2.5 h-8 rounded-lg text-[9px] font-bold uppercase text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700" title="По размеру">Fit</button>
          </div>
          ${guest ? "" : `<button type="button" data-c2-apt-add-mode
                  class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200">+ Замечание</button>`}
          <button type="button" data-c2-apt-close
            class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-600">Закрыть</button>
        </div>
      </div>
      <div data-c2-pin-filters-host="apt"></div>
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
  (_d = wrap.querySelector("[data-c2-apt-zoom-in]")) == null ? void 0 : _d.addEventListener("click", (ev) => {
    ev.preventDefault();
    _viewer$1 == null ? void 0 : _viewer$1.zoomIn();
  });
  (_e = wrap.querySelector("[data-c2-apt-zoom-out]")) == null ? void 0 : _e.addEventListener("click", (ev) => {
    ev.preventDefault();
    _viewer$1 == null ? void 0 : _viewer$1.zoomOut();
  });
  (_f = wrap.querySelector("[data-c2-apt-zoom-fit]")) == null ? void 0 : _f.addEventListener("click", (ev) => {
    ev.preventDefault();
    _viewer$1 == null ? void 0 : _viewer$1.fit();
  });
  wrap.addEventListener("click", (ev) => {
    var _a2, _b2;
    const t = ev.target;
    const statusChip = (_a2 = t == null ? void 0 : t.closest) == null ? void 0 : _a2.call(t, "[data-c2-pin-status]");
    if (statusChip && wrap.contains(statusChip)) {
      ev.preventDefault();
      const key = statusChip.getAttribute("data-c2-pin-status");
      if (!key) return;
      toggleStatusFilter(pinFiltersState, key);
      void _refreshPins();
      return;
    }
    const catBtn = (_b2 = t == null ? void 0 : t.closest) == null ? void 0 : _b2.call(t, "[data-c2-pin-category]");
    if (catBtn && wrap.contains(catBtn)) {
      ev.preventDefault();
      const key = catBtn.getAttribute("data-c2-pin-category");
      if (!key) return;
      setCategoryFilter(pinFiltersState, key);
      void _refreshPins();
    }
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
    host.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">Ошибка плана: ${_escape$a(msg)}</div>`;
    _viewer$1 = null;
  }
}
const ACTIVE_DEFECT_STATUSES_FOR_BATCH = /* @__PURE__ */ new Set(["issued", "in_progress", "fixed"]);
function _escape$9(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _sysTemplates$1() {
  return window.SYSTEM_TEMPLATES || {};
}
function _userTemplates$1() {
  return window.userTemplates || {};
}
function resolveTemplateGroups(tmplKey) {
  var _a, _b;
  if (!tmplKey) return [];
  const type = tmplKey.split("_")[0];
  const key = tmplKey.replace(type + "_", "");
  if (type === "sys") return ((_a = _sysTemplates$1()[key]) == null ? void 0 : _a.groups) || [];
  if (type === "user") return ((_b = _userTemplates$1()[key]) == null ? void 0 : _b.groups) || [];
  return [];
}
function listTemplateChecklistItems(tmplKey) {
  const out = [];
  resolveTemplateGroups(tmplKey).forEach((g, gi) => {
    const groupName = String(g.group || g.title || `Группа ${gi + 1}`);
    (g.items || []).forEach((it) => {
      if (!it) return;
      const id = String(it.id ?? "").trim();
      const name = String(it.n || "").trim();
      if (!id || !name) return;
      const w = it.w != null ? Number(it.w) : null;
      out.push({
        id,
        group: groupName,
        name,
        norm: it.t ? String(it.t) : void 0,
        weight: w != null && Number.isFinite(w) ? w : null
      });
    });
  });
  return out;
}
function categoryFromWeight(w, escalated) {
  if (escalated) return "B3";
  if (w === 1) return "B1";
  if (w === 3) return "B3";
  return "B2";
}
function computeChecklistProgress(tmplKey, results) {
  const templateItems = listTemplateChecklistItems(String(tmplKey || (results == null ? void 0 : results.template_key) || ""));
  const byId = new Map(
    ((results == null ? void 0 : results.items) || []).map((it) => [String(it.id), it.status])
  );
  const total = templateItems.length || ((results == null ? void 0 : results.items) || []).length;
  let ok = 0;
  let fail = 0;
  let na = 0;
  let done = 0;
  const sourceIds = templateItems.length > 0 ? templateItems.map((t) => t.id) : ((results == null ? void 0 : results.items) || []).map((it) => String(it.id));
  sourceIds.forEach((id) => {
    const st = byId.get(String(id));
    if (!st) return;
    done += 1;
    if (st === "ok") ok += 1;
    else if (st === "fail" || st === "fail_escalated") fail += 1;
    else if (st === "na") na += 1;
  });
  return {
    total,
    done,
    ok,
    fail,
    na,
    unset: Math.max(0, total - done)
  };
}
function progressLine(p) {
  if (!p.total) return "";
  return `${p.done}/${p.total}`;
}
function computeAcceptanceQualityB(tmplKey, results) {
  var _a, _b, _c;
  const key = String(tmplKey || (results == null ? void 0 : results.template_key) || "").trim();
  const groups = resolveTemplateGroups(key);
  if (!groups.length) return null;
  const getProductMetrics = window.getProductMetrics || ((_c = (_b = (_a = window.RBI) == null ? void 0 : _a.utils) == null ? void 0 : _b.math) == null ? void 0 : _c.getProductMetrics);
  if (typeof getProductMetrics !== "function") return null;
  const productState = {};
  for (const it of (results == null ? void 0 : results.items) || []) {
    if (!(it == null ? void 0 : it.id) || !it.status) continue;
    productState[String(it.id)] = String(it.status);
  }
  if (!Object.keys(productState).length) return null;
  const m = getProductMetrics(productState, groups);
  if (!m || m.final == null) return null;
  return {
    final: Number(m.final) || 0,
    statusTxt: String(m.statusTxt || ""),
    statusCls: String(m.statusCls || ""),
    isDanger: m.isDanger === true,
    reason: String(m.reason || ""),
    checkedCount: Number(m.checkedCount) || 0,
    n_B1_fail: Number(m.n_B1_fail) || 0,
    n_B2_fail: Number(m.n_B2_fail) || 0,
    n_B3_fail: Number(m.n_B3_fail) || 0
  };
}
function pickLatestAcceptanceForB(acceptances) {
  const list = (acceptances || []).filter((a) => a && !a.is_deleted && !a._deleted && String(a.status) !== "rejected").filter((a) => a.checklist_results && (a.checklist_results.items || []).length > 0).slice().sort(
    (a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))
  );
  return list[0] || null;
}
function listFailBatchCandidates(acceptance, existingDefects) {
  var _a, _b;
  const tmplKey = String(acceptance.template_key || ((_a = acceptance.checklist_results) == null ? void 0 : _a.template_key) || "");
  const templateItems = listTemplateChecklistItems(tmplKey);
  const byId = new Map(templateItems.map((t) => [t.id, t]));
  const locationId = String(acceptance.locationId || "");
  const blockedIds = /* @__PURE__ */ new Set();
  for (const d of existingDefects || []) {
    if (!d || d.is_deleted || d._deleted) continue;
    if (String(d.locationId || "") !== locationId) continue;
    if (!ACTIVE_DEFECT_STATUSES_FOR_BATCH.has(String(d.status || ""))) continue;
    const iid = String(d.item_id || "").trim();
    if (iid) blockedIds.add(iid);
  }
  const out = [];
  for (const row of ((_b = acceptance.checklist_results) == null ? void 0 : _b.items) || []) {
    const st = row == null ? void 0 : row.status;
    if (st !== "fail" && st !== "fail_escalated") continue;
    const id = String(row.id || "").trim();
    if (!id || blockedIds.has(id)) continue;
    const tmpl = byId.get(id);
    const weight = (tmpl == null ? void 0 : tmpl.weight) ?? null;
    out.push({
      id,
      group: (tmpl == null ? void 0 : tmpl.group) || String(row.group || "") || "",
      name: (tmpl == null ? void 0 : tmpl.name) || String(row.name || id),
      norm: tmpl == null ? void 0 : tmpl.norm,
      weight,
      status: st,
      category: categoryFromWeight(weight, st === "fail_escalated")
    });
  }
  return out;
}
function acceptGateWarning(item) {
  var _a;
  const tmplKey = String(item.template_key || ((_a = item.checklist_results) == null ? void 0 : _a.template_key) || "");
  const progress = computeChecklistProgress(tmplKey, item.checklist_results);
  if (!tmplKey) return null;
  if (!item.checklist_results || progress.done === 0) {
    return "Чек-лист ещё не начат. Принять заявку anyway?";
  }
  if (progress.fail > 0) {
    return `Есть ${progress.fail} пункт(ов) FAIL. Принять заявку anyway?`;
  }
  if (progress.unset > 0) {
    return `Не пройдено ${progress.unset} пункт(ов) чек-листа. Принять anyway?`;
  }
  return null;
}
function _bBadgeHtml(b) {
  if (!b) return "";
  const tone = b.final < 70 || b.isDanger ? "bg-red-50 text-red-700 border-red-200" : b.final < 85 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-green-50 text-green-700 border-green-200";
  return `<div class="mt-2 px-2.5 py-2 rounded-xl border ${tone}" data-c2-cl-b>
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] font-black uppercase">УрК B</span>
        <span class="text-[14px] font-black" data-c2-cl-b-final>${_escape$9(String(b.final))}%</span>
      </div>
      <div class="text-[10px] font-bold mt-0.5 opacity-80" data-c2-cl-b-status>${_escape$9(b.statusTxt || "")}</div>
    </div>`;
}
function renderChecklistSectionHtml(item, opts) {
  var _a;
  const editable = (opts == null ? void 0 : opts.editable) !== false;
  const tmplKey = String(item.template_key || ((_a = item.checklist_results) == null ? void 0 : _a.template_key) || "");
  if (!tmplKey) {
    return `<div class="mt-3 pt-3 border-t border-[var(--card-border)] text-[10px] font-bold text-slate-400">Чек-лист: вид работ не выбран</div>`;
  }
  const templateItems = listTemplateChecklistItems(tmplKey);
  if (!templateItems.length) {
    return `<div class="mt-3 pt-3 border-t border-[var(--card-border)] text-[10px] font-bold text-amber-600">Чек-лист шаблона пуст или не найден</div>`;
  }
  const progress = computeChecklistProgress(tmplKey, item.checklist_results);
  const b = computeAcceptanceQualityB(tmplKey, item.checklist_results);
  const batchN = (opts == null ? void 0 : opts.batchFailCount) != null ? opts.batchFailCount : listFailBatchCandidates(item, []).length;
  const openBtn = editable ? `<button type="button" data-c2-cl-open
         class="w-full mt-2 bg-indigo-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase shadow-md">
         Пройти чек-лист</button>` : "";
  const batchBtn = editable && batchN > 0 ? `<button type="button" data-c2-cl-batch-fail
           class="w-full mt-2 bg-red-50 text-red-700 border border-red-200 py-2.5 rounded-xl text-[11px] font-black uppercase">
           Создать замечания по FAIL (${batchN})</button>` : "";
  return `
    <div class="mt-3 pt-3 border-t border-[var(--card-border)]" data-c2-cl-section>
      <div class="flex items-center justify-between gap-2 mb-1">
        <div class="text-[10px] font-black uppercase text-indigo-600">Чек-лист</div>
        <div class="text-[10px] font-bold text-slate-500" data-c2-cl-progress>
          ${progress.done}/${progress.total}
          · OK ${progress.ok} · FAIL ${progress.fail} · N/A ${progress.na}
        </div>
      </div>
      <div class="text-[10px] text-slate-400 font-bold">
        ${_escape$9(String(templateItems.length))} пункт(ов) · ${_escape$9(String(new Set(templateItems.map((t) => t.group)).size))} групп
      </div>
      ${_bBadgeHtml(b)}
      ${openBtn}
      ${batchBtn}
    </div>`;
}
const SLOT_HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00"
];
function _escape$8(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _normTime(t) {
  const s = String(t || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
function _isActive(a) {
  if (a.is_deleted || a._deleted) return false;
  const st = String(a.status || "pending").toLowerCase();
  return st === "pending" || st === "accepted";
}
function listSlotOccupancy(acceptances, opts) {
  const date = String(opts.date || "").trim();
  const loc = opts.locationId != null ? String(opts.locationId).trim() : "";
  const dayItems = (acceptances || []).filter((a) => {
    if (!_isActive(a)) return false;
    if (String(a.requested_date || "").trim() !== date) return false;
    if (loc && String(a.locationId || "").trim() !== loc) return false;
    return true;
  });
  return SLOT_HOURS.map((time) => {
    const items = dayItems.filter((a) => _normTime(a.requested_time) === time);
    return { time, taken: items.length > 0, count: items.length, items };
  });
}
function isSlotTaken(acceptances, opts) {
  const date = String(opts.date || "").trim();
  const time = _normTime(opts.time);
  const loc = String(opts.locationId || "").trim();
  const exclude = String(opts.excludeId || "").trim();
  if (!date || !time || !loc) return false;
  return (acceptances || []).some((a) => {
    if (!_isActive(a)) return false;
    if (exclude && String(a.id || "") === exclude) return false;
    if (String(a.requested_date || "").trim() !== date) return false;
    if (_normTime(a.requested_time) !== time) return false;
    return String(a.locationId || "").trim() === loc;
  });
}
function slotTimeOptionsHtml(selected) {
  const sel = _normTime(selected) || "14:00";
  return SLOT_HOURS.map((h) => {
    const nextH = Number(h.slice(0, 2)) + 1;
    const end = `${String(nextH).padStart(2, "0")}:00`;
    const isSel = h === sel ? " selected" : "";
    return `<option value="${h}"${isSel}>${h} - ${end}</option>`;
  }).join("");
}
function slotBoardHtml(occupancy, opts) {
  const title = (opts == null ? void 0 : opts.title) || "Слоты дня";
  const cells = occupancy.map((o) => {
    const cls = o.taken ? "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200" : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300";
    const label = o.taken ? `занято${o.count > 1 ? ` ×${o.count}` : ""}` : "свободно";
    const tip = o.items.map((i) => String(i.work_type || i.id || "").slice(0, 40)).filter(Boolean).join("; ");
    return `<div class="rounded-xl border px-2 py-1.5 text-center ${cls}" title="${_escape$8(tip)}">
        <div class="text-[10px] font-black">${o.time}</div>
        <div class="text-[8px] font-bold uppercase tracking-wide">${_escape$8(label)}</div>
      </div>`;
  }).join("");
  return `
    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3">
      <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">${_escape$8(title)}</div>
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">${cells}</div>
    </div>`;
}
const APARTMENT_FULL_ZONE = { x: 0, y: 0, w: 100, h: 100 };
function _checklistRunner() {
  var _a, _b;
  return window.ChecklistRunner || (((_b = (_a = window.RBI) == null ? void 0 : _a.shared) == null ? void 0 : _b.checklistRunner) ?? null);
}
function _escape$7(s) {
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
async function _fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Не удалось прочитать файл"));
    r.readAsDataURL(file);
  });
}
async function _pickAndSaveChecklistPhotos() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    const cleanup = () => {
      try {
        input.remove();
      } catch (_) {
      }
    };
    input.addEventListener("change", () => {
      void (async () => {
        try {
          const files = Array.from(input.files || []).filter(
            (f) => f && f.type && f.type.startsWith("image/")
          );
          if (!files.length) {
            cleanup();
            resolve([]);
            return;
          }
          const pm = window.PhotoManager;
          const out = [];
          for (const file of files) {
            const dataUrl = await _fileToDataUrl(file);
            if (!dataUrl.startsWith("data:")) continue;
            if (pm == null ? void 0 : pm.saveLocal) {
              const id = await pm.saveLocal(dataUrl, "cacc", {
                entityType: "construction_acceptance_checklist"
              });
              if (id) out.push(id);
            } else {
              out.push(dataUrl);
            }
          }
          cleanup();
          resolve(out);
        } catch (_) {
          cleanup();
          resolve([]);
        }
      })();
    });
    input.addEventListener("cancel", () => {
      cleanup();
      resolve([]);
    });
    input.click();
  });
}
function _tmplOptions(selected) {
  let html = '<option value="">-- Выберите вид работ --</option>';
  const st = _sysTemplates();
  Object.keys(st).sort().forEach((k) => {
    const v = `sys_${k}`;
    html += `<option value="${_escape$7(v)}" ${selected === v ? "selected" : ""}>[СИС] ${_escape$7(st[k].title || k)}</option>`;
  });
  const ut = _userTemplates();
  Object.keys(ut).sort().forEach((k) => {
    const v = `user_${k}`;
    html += `<option value="${_escape$7(v)}" ${selected === v ? "selected" : ""}>[МОЙ] ${_escape$7(ut[k].title || k)}</option>`;
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
function _contractorSelectHtml(selectedId, opts) {
  var _a, _b;
  if (opts == null ? void 0 : opts.locked) {
    const id = String(opts.lockedId || "").trim();
    const label = id || "не привязан";
    return `
      <div>
        <label class="text-[10px] font-black text-indigo-500 uppercase mb-1 block">Подрядчик</label>
        <input type="hidden" id="c2-acc-contractor" value="${_escape$7(id)}">
        <div class="input-base text-[12px] font-bold w-full bg-slate-50 dark:bg-slate-900 text-slate-600">${_escape$7(
      label
    )} <span class="text-[9px] font-bold uppercase text-slate-400">(ваш)</span></div>
      </div>`;
  }
  const svc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.contractors;
  const rows = typeof (svc == null ? void 0 : svc.list) === "function" ? svc.list() : [];
  const optsHtml = `<option value="">— выберите подрядчика —</option>` + (rows || []).filter((r) => r && r.id).map((r) => {
    const id = String(r.id);
    const label = String(r.display_name || r.displayName || id);
    const sel = "";
    return `<option value="${_escape$7(id)}"${sel}>${_escape$7(label)}</option>`;
  }).join("");
  return `
    <div>
      <label class="text-[10px] font-black text-indigo-500 uppercase mb-1 block">Подрядчик *</label>
      <select id="c2-acc-contractor" class="input-base text-[12px] font-bold w-full border-indigo-300">${optsHtml}</select>
    </div>`;
}
function _floorLabel(locationId) {
  var _a, _b, _c, _d;
  const loc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations;
  if (loc == null ? void 0 : loc.getPath) {
    return loc.getPath(locationId).map((n) => n.displayName).join(" / ");
  }
  return ((_d = (_c = loc == null ? void 0 : loc.getNode) == null ? void 0 : _c.call(loc, locationId)) == null ? void 0 : _d.displayName) || locationId;
}
function _locationNodeType(locationId) {
  var _a, _b, _c, _d;
  const loc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations;
  return String(((_d = (_c = loc == null ? void 0 : loc.getNode) == null ? void 0 : _c.call(loc, locationId)) == null ? void 0 : _d.nodeType) || "");
}
function _listDefectsForLocation(locationId) {
  const dSvc = _defects$1();
  if (!dSvc) return [];
  if (typeof dSvc.listForLocation === "function") return dSvc.listForLocation(locationId) || [];
  if (typeof dSvc.list === "function") return dSvc.list({ locationId }) || [];
  return [];
}
function _today$2() {
  const d = /* @__PURE__ */ new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function _acc$3() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionAcceptance) || null;
}
function _defects$1() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionDefects) || null;
}
function _zoneCenter(zone) {
  if (!zone) return { x: 50, y: 50 };
  return {
    x: Number(zone.x) + Number(zone.w) / 2,
    y: Number(zone.y) + Number(zone.h) / 2
  };
}
function openCreateAcceptanceForm(ctx, onSave, onCancel) {
  var _a, _b, _c, _d;
  const { role } = _roleInfo();
  if (role === "guest") {
    (_a = window.showToast) == null ? void 0 : _a.call(window, "⚠️ Гости не могут предъявлять работы");
    onCancel == null ? void 0 : onCancel();
    return;
  }
  const isContractor = role === "contractor" || isContractorRole();
  const myContractorId = isContractor ? resolveMyContractorId() : null;
  if (isContractor && !myContractorId) {
    (_b = window.showToast) == null ? void 0 : _b.call(window, "⚠️ Подрядчик не привязан к профилю — заявку создать нельзя");
    onCancel == null ? void 0 : onCancel();
    return;
  }
  const isApartment = ctx.mode === "apartment" || _locationNodeType(ctx.locationId) === "apartment";
  const path = _floorLabel(ctx.locationId);
  const zoneBadge = isApartment ? `<span class="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-[8px] font-black border border-violet-200">Квартира</span>` : `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[8px] font-black border border-blue-200">✅ Зона выделена</span>`;
  const roomVolHtml = isApartment ? `<div>
         <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объем</label>
         <input type="text" id="c2-acc-vol" class="input-base text-[12px] w-full" placeholder="Напр: 45 м2">
       </div>` : `<div class="grid grid-cols-2 gap-2">
         <div>
           <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Оси / Захватка</label>
           <input type="text" id="c2-acc-room" class="input-base text-[12px] w-full" placeholder="Напр: Оси А-Б" value="${_escape$7(ctx.zone.room || "")}">
         </div>
         <div>
           <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объем</label>
           <input type="text" id="c2-acc-vol" class="input-base text-[12px] w-full" placeholder="Напр: 45 м2">
         </div>
       </div>`;
  const contractorHtml = _contractorSelectHtml(null, {
    locked: isContractor,
    lockedId: myContractorId
  });
  const html = `
    <div id="c2-acc-request-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div class="bg-[var(--card-bg)] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--card-border)]" data-c2-acc-panel>
        <div class="p-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center">
          <h3 class="font-black text-[13px] uppercase text-white">${isApartment ? "📝 Приёмка квартиры (v2)" : "📝 Заявка на приемку (v2)"}</h3>
          <button type="button" data-c2-acc-close class="text-indigo-200 hover:text-white font-black text-lg leading-none">✕</button>
        </div>
        <div class="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div class="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="text-[10px] font-black text-indigo-500 uppercase mb-1 flex justify-between">
              <span>Локация</span>
              ${zoneBadge}
            </div>
            <div class="text-[12px] font-bold text-slate-700 dark:text-slate-200">${_escape$7(path)}</div>
          </div>
          <div>
            <label class="text-[10px] font-black text-indigo-500 uppercase mb-1 block">Вид работ *</label>
            <select id="c2-acc-work" class="input-base text-[12px] font-bold mb-2 border-indigo-300 w-full">
              ${_tmplOptions()}
            </select>
            ${roomVolHtml}
          </div>
          ${contractorHtml}
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label class="text-[10px] font-black text-indigo-500 uppercase mb-2 block">Когда готовы сдать?</label>
            <div class="grid grid-cols-2 gap-2">
              <input type="date" id="c2-acc-date" class="input-base text-[12px] font-bold w-full" value="${_today$2()}">
              <select id="c2-acc-time" class="input-base text-[12px] font-bold w-full">
                ${slotTimeOptionsHtml("14:00")}
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
  (_c = document.getElementById("c2-acc-request-modal")) == null ? void 0 : _c.remove();
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
  (_d = modal.querySelector("[data-c2-acc-save]")) == null ? void 0 : _d.addEventListener("click", () => {
    var _a2, _b2, _c2, _d2, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    const workKey = ((_a2 = document.getElementById("c2-acc-work")) == null ? void 0 : _a2.value) || "";
    const room = isApartment ? "" : ((_c2 = (_b2 = document.getElementById("c2-acc-room")) == null ? void 0 : _b2.value) == null ? void 0 : _c2.trim()) || "";
    const vol = ((_e = (_d2 = document.getElementById("c2-acc-vol")) == null ? void 0 : _d2.value) == null ? void 0 : _e.trim()) || "";
    const dateStr = ((_f = document.getElementById("c2-acc-date")) == null ? void 0 : _f.value) || "";
    const timeStr = ((_g = document.getElementById("c2-acc-time")) == null ? void 0 : _g.value) || "";
    let contractorId = isContractor ? myContractorId : ((_i = (_h = document.getElementById("c2-acc-contractor")) == null ? void 0 : _h.value) == null ? void 0 : _i.trim()) || null;
    if (!workKey || !dateStr) {
      (_j = window.showToast) == null ? void 0 : _j.call(window, "⚠️ Заполните вид работ и дату");
      return;
    }
    if (!isContractor && !contractorId) {
      (_k = window.showToast) == null ? void 0 : _k.call(window, "⚠️ Выберите подрядчика");
      return;
    }
    const accListSvc = (_m = (_l = window.RBI) == null ? void 0 : _l.services) == null ? void 0 : _m.constructionAcceptance;
    const existing = ((_n = accListSvc == null ? void 0 : accListSvc.list) == null ? void 0 : _n.call(accListSvc)) || [];
    if (isSlotTaken(existing, {
      date: dateStr,
      time: timeStr,
      locationId: ctx.locationId
    })) {
      const ok = window.confirm(
        "На это время уже есть активная заявка по этой локации. Всё равно отправить?"
      );
      if (!ok) return;
    }
    const baseZone = isApartment ? { ...APARTMENT_FULL_ZONE } : { ...ctx.zone };
    const zone = { ...baseZone, room: room || null };
    void Promise.resolve(
      onSave({
        locationId: ctx.locationId,
        zone,
        template_key: workKey,
        work_type: _workTitle(workKey),
        volume: vol || null,
        requested_date: dateStr,
        requested_time: timeStr || null,
        contractorId: contractorId || null
      })
    ).then(() => modal.remove());
  });
}
function openAcceptanceDetails(item, handlers) {
  var _a, _b, _c, _d, _e;
  const { isEngineer, role } = _roleInfo();
  const path = _floorLabel(item.locationId);
  const status = String(item.status || "pending");
  const editable = isEngineer && status === "pending";
  const defectsForLoc = _listDefectsForLocation(item.locationId);
  const batchCandidates = listFailBatchCandidates(item, defectsForLoc);
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
          <h3 class="font-black text-[13px] uppercase">Заявка · ${_escape$7(status)}</h3>
          <button type="button" data-c2-acc-dclose class="text-slate-400 font-black text-lg">✕</button>
        </div>
        <div class="p-4 text-[12px] space-y-2 max-h-[75vh] overflow-y-auto">
          <div><span class="text-[10px] font-black uppercase text-slate-400">Локация</span><div class="font-bold">${_escape$7(path)}</div></div>
          <div><span class="text-[10px] font-black uppercase text-slate-400">Вид работ</span><div class="font-bold">${_escape$7(item.work_type || "—")}</div></div>
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-[10px] font-black uppercase text-slate-400">Объем</span><div class="font-bold">${_escape$7(item.volume || "—")}</div></div>
            <div><span class="text-[10px] font-black uppercase text-slate-400">Оси</span><div class="font-bold">${_escape$7(((_a = item.zone) == null ? void 0 : _a.room) || "—")}</div></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div><span class="text-[10px] font-black uppercase text-slate-400">Дата</span><div class="font-bold">${_escape$7(item.requested_date || "—")}</div></div>
            <div><span class="text-[10px] font-black uppercase text-slate-400">Время</span><div class="font-bold">${_escape$7(item.requested_time || "—")}</div></div>
          </div>
          ${renderChecklistSectionHtml(item, { editable, batchFailCount: batchCandidates.length })}
          ${actions}
        </div>
      </div>
    </div>`;
  (_b = document.getElementById("c2-acc-details-modal")) == null ? void 0 : _b.remove();
  document.body.insertAdjacentHTML("beforeend", html);
  const modal = document.getElementById("c2-acc-details-modal");
  if (!modal) return;
  let current = item;
  const close = () => modal.remove();
  const openDefectFromChecklist = (meta) => {
    var _a2;
    const dSvc = _defects$1();
    if (!dSvc) {
      (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "service.constructionDefects не загружен");
      return;
    }
    const center = _zoneCenter(current.zone);
    openCreateDefectForm(
      { locationId: current.locationId, x: center.x, y: center.y },
      async (input) => {
        var _a3, _b2;
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
        (_a3 = window.showToast) == null ? void 0 : _a3.call(window, "Замечание создано");
        refreshChecklistUi(((_b2 = _acc$3()) == null ? void 0 : _b2.get(current.id)) || current);
      },
      void 0,
      {
        template_key: current.template_key || null,
        item_id: meta.id || null,
        item_name: meta.name || null,
        norm_text: meta.norm || null,
        description: meta.name || null
      }
    );
  };
  const createBatchFailDefects = async () => {
    var _a2, _b2, _c2, _d2, _e2, _f;
    const dSvc = _defects$1();
    if (!dSvc) {
      (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "service.constructionDefects не загружен");
      return;
    }
    const latest = ((_b2 = _acc$3()) == null ? void 0 : _b2.get(current.id)) || current;
    const candidates = listFailBatchCandidates(latest, _listDefectsForLocation(latest.locationId));
    if (!candidates.length) {
      (_c2 = window.showToast) == null ? void 0 : _c2.call(window, "Нет FAIL без активного замечания");
      refreshChecklistUi(latest);
      return;
    }
    if (!window.confirm(`Создать ${candidates.length} замечани(й) по FAIL без формы?`)) return;
    const center = _zoneCenter(latest.zone);
    let created = 0;
    for (const c of candidates) {
      try {
        await dSvc.create({
          locationId: latest.locationId,
          x: center.x,
          y: center.y,
          description: c.name || c.id,
          category: c.category,
          contractorId: latest.contractorId || null,
          deadline: null,
          template_key: latest.template_key || null,
          item_id: c.id,
          item_name: c.name || null,
          norm_text: c.norm || null,
          photos: [],
          status: "issued"
        });
        created += 1;
      } catch (e) {
        console.warn("[acceptance-form] batch fail create", e);
      }
    }
    (_d2 = window.showToast) == null ? void 0 : _d2.call(window, created ? `Создано замечаний: ${created}` : "Не удалось создать замечания");
    refreshChecklistUi(((_e2 = _acc$3()) == null ? void 0 : _e2.get(current.id)) || latest);
    await ((_f = handlers.onChecklistChanged) == null ? void 0 : _f.call(handlers, current.id));
  };
  const refreshChecklistUi = (next) => {
    current = next;
    const section = modal.querySelector("[data-c2-cl-section]");
    if (!section) return;
    const batchN = listFailBatchCandidates(next, _listDefectsForLocation(next.locationId)).length;
    const tmp = document.createElement("div");
    tmp.innerHTML = renderChecklistSectionHtml(next, { editable, batchFailCount: batchN });
    const fresh = tmp.firstElementChild;
    if (fresh) section.replaceWith(fresh);
    bindChecklistActions(modal);
  };
  const openChecklistRunner = () => {
    var _a2, _b2, _c2, _d2;
    const runner = _checklistRunner();
    if (!runner) {
      (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "ChecklistRunner не загружен");
      return;
    }
    const tmplKey = String(current.template_key || ((_b2 = current.checklist_results) == null ? void 0 : _b2.template_key) || "");
    if (!tmplKey) {
      (_c2 = window.showToast) == null ? void 0 : _c2.call(window, "Вид работ не выбран");
      return;
    }
    const groups = resolveTemplateGroups(tmplKey);
    if (!groups.length) {
      (_d2 = window.showToast) == null ? void 0 : _d2.call(window, "Чек-лист шаблона пуст или не найден");
      return;
    }
    const title = _workTitle(tmplKey) || current.work_type || "Чек-лист";
    const rowOf = (id) => {
      var _a3, _b3;
      const latest = ((_a3 = _acc$3()) == null ? void 0 : _a3.get(current.id)) || current;
      return (((_b3 = latest.checklist_results) == null ? void 0 : _b3.items) || []).find((it) => String(it.id) === String(id));
    };
    const persistItem = async (id, itemMeta, patch) => {
      var _a3;
      const acc = _acc$3();
      if (!acc) throw new Error("service.constructionAcceptance не загружен");
      const updated = await acc.setChecklistItem(current.id, {
        id,
        name: itemMeta.name || id,
        group: itemMeta.group || null,
        status: patch.status,
        comment: patch.comment,
        photos: patch.photos,
        clearExtras: patch.clearExtras
      });
      current = updated;
      await ((_a3 = handlers.onChecklistChanged) == null ? void 0 : _a3.call(handlers, current.id));
      return updated;
    };
    const clearItem = async (id) => {
      var _a3;
      const acc = _acc$3();
      if (!acc) throw new Error("service.constructionAcceptance не загружен");
      const latest = acc.get(current.id) || current;
      const prev = latest.checklist_results;
      if (!prev) return;
      const items = (prev.items || []).filter((it) => String(it.id) !== String(id));
      const updated = await acc.setChecklistResults(current.id, {
        template_key: prev.template_key,
        updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        items
      });
      current = updated;
      await ((_a3 = handlers.onChecklistChanged) == null ? void 0 : _a3.call(handlers, current.id));
    };
    runner.open({
      title,
      templateKey: tmplKey,
      groups,
      features: {
        na: true,
        failAction: true,
        batchFail: editable,
        norms: true,
        weightTag: true,
        photos: true,
        comments: true,
        help: true,
        escalate: true,
        swipe: true,
        collapse: true
      },
      getStatus: (id) => {
        var _a3;
        const st = (_a3 = rowOf(id)) == null ? void 0 : _a3.status;
        if (st === "ok" || st === "fail" || st === "na" || st === "fail_escalated") return st;
        return null;
      },
      getItemDetails: (id) => {
        const row = rowOf(id);
        return {
          comment: (row == null ? void 0 : row.comment) || "",
          photos: Array.isArray(row == null ? void 0 : row.photos) ? row.photos.slice() : []
        };
      },
      setStatus: async (id, status2, itemMeta) => {
        if (status2 == null || status2 === "") {
          await clearItem(id);
          return;
        }
        const st = status2;
        if (st !== "ok" && st !== "fail" && st !== "na" && st !== "fail_escalated") {
          throw new Error("Некорректный статус пункта");
        }
        const clearExtras = st === "ok" || st === "na";
        await persistItem(id, itemMeta, {
          status: st,
          clearExtras: clearExtras || void 0,
          // при переходе на fail сохраняем extras; при ok/na — clear
          photos: clearExtras ? null : void 0,
          comment: clearExtras ? null : void 0
        });
      },
      setItemComment: async (id, comment, itemMeta) => {
        const row = rowOf(id);
        const st = row == null ? void 0 : row.status;
        if (st !== "fail" && st !== "fail_escalated") {
          throw new Error("Комментарий только для FAIL");
        }
        await persistItem(id, itemMeta, {
          status: st,
          comment: comment || null
        });
      },
      addItemPhoto: async (id, itemMeta) => {
        const row = rowOf(id);
        const st = row == null ? void 0 : row.status;
        if (st !== "ok" && st !== "fail" && st !== "fail_escalated") {
          throw new Error("Сначала отметьте пункт OK или FAIL");
        }
        const added = await _pickAndSaveChecklistPhotos();
        if (!added.length) return;
        const photos = (Array.isArray(row == null ? void 0 : row.photos) ? row.photos.slice() : []).concat(added);
        await persistItem(id, itemMeta, { status: st, photos });
      },
      removeItemPhoto: async (id, index2, itemMeta) => {
        const row = rowOf(id);
        const st = row == null ? void 0 : row.status;
        if (!st) throw new Error("Пункт без статуса");
        const photos = Array.isArray(row == null ? void 0 : row.photos) ? row.photos.slice() : [];
        if (index2 < 0 || index2 >= photos.length) return;
        photos.splice(index2, 1);
        await persistItem(id, itemMeta, {
          status: st,
          photos: photos.length ? photos : null
        });
      },
      onHelp: (id, event, itemMeta) => {
        var _a3, _b3, _c3;
        const openMenu = window.openItemHelpMenu;
        if (typeof openMenu === "function") {
          openMenu(id, event, { templateKey: tmplKey, checklist: groups });
          return;
        }
        const svc = (_b3 = (_a3 = window.RBI) == null ? void 0 : _a3.services) == null ? void 0 : _b3.knowledge;
        if (svc == null ? void 0 : svc.openItemHelp) {
          svc.openItemHelp(id, event);
          return;
        }
        (_c3 = window.showToast) == null ? void 0 : _c3.call(window, "База знаний недоступна");
      },
      onEscalate: async (id, itemMeta) => {
        const row = rowOf(id);
        const st = row == null ? void 0 : row.status;
        if (st === "fail_escalated") {
          await persistItem(id, itemMeta, { status: "fail" });
        } else if (st === "fail") {
          await persistItem(id, itemMeta, { status: "fail_escalated" });
        }
      },
      onFailAction: (meta) => {
        openDefectFromChecklist(meta);
      },
      onBatchFailAction: async () => {
        await createBatchFailDefects();
      },
      onClose: () => {
        var _a3;
        const latest = ((_a3 = _acc$3()) == null ? void 0 : _a3.get(current.id)) || current;
        refreshChecklistUi(latest);
      }
    });
  };
  const bindChecklistActions = (root) => {
    root.querySelectorAll("[data-c2-cl-open]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openChecklistRunner();
      });
    });
    root.querySelectorAll("[data-c2-cl-batch-fail]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        void createBatchFailDefects();
      });
    });
  };
  bindChecklistActions(modal);
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
      var _a2, _b2;
      const st = btn.getAttribute("data-c2-acc-status");
      const latest = ((_a2 = _acc$3()) == null ? void 0 : _a2.get(current.id)) || current;
      if (st === "accepted") {
        const warn = acceptGateWarning(latest);
        if (warn && !window.confirm(warn)) return;
      }
      void Promise.resolve((_b2 = handlers.onChangeStatus) == null ? void 0 : _b2.call(handlers, item.id, st)).then(() => close());
    });
  });
  (_e = modal.querySelector("[data-c2-acc-revoke]")) == null ? void 0 : _e.addEventListener("click", () => {
    var _a2;
    void Promise.resolve((_a2 = handlers.onSoftDelete) == null ? void 0 : _a2.call(handlers, item.id)).then(() => close());
  });
}
function _escape$6(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _acc$2() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionAcceptance) || null;
}
function _loc$2() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations) || null;
}
let _filterObjectId = null;
let _slotsDate = null;
let _bound$2 = false;
function _today$1() {
  const d = /* @__PURE__ */ new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function _objectIdForFloor(loc, floorId) {
  var _a;
  const path = loc.getPath(floorId);
  const obj = path.find((n) => n.nodeType === "object");
  return (obj == null ? void 0 : obj.id) || ((_a = path[0]) == null ? void 0 : _a.id) || null;
}
function _cardHtml(r, loc) {
  const path = loc.getPath(r.locationId).map((n) => n.displayName).join(" · ");
  const overdue = r.status === "pending" && r.requested_date && new Date(r.requested_date).setHours(0, 0, 0, 0) < (/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0);
  const progress = computeChecklistProgress(r.template_key, r.checklist_results);
  const progressHtml = progress.total > 0 && (r.checklist_results || progress.done > 0) ? `<div class="mt-1.5 text-[9px] font-black uppercase tracking-wide text-indigo-600">${_escape$6(progressLine(progress))}${progress.fail ? ` · FAIL ${progress.fail}` : ""}</div>` : progress.total > 0 ? `<div class="mt-1.5 text-[9px] font-bold text-slate-400">Чек-лист 0/${progress.total}</div>` : "";
  return `
    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 mb-3 shadow-sm cursor-pointer hover:border-indigo-400 transition-colors"
         data-c2-acc-card="${_escape$6(r.id)}">
      <div class="flex justify-between items-start gap-2 mb-1">
        <div class="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight">${_escape$6(r.work_type || "Без вида работ")}</div>
        ${overdue ? '<span class="text-[8px] font-black uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded">просрочено</span>' : ""}
      </div>
      <div class="text-[10px] text-slate-500 font-bold mb-2">${_escape$6(path || r.locationId)}</div>
      <div class="flex justify-between items-center text-[10px]">
        <span class="font-bold text-slate-600">${_escape$6(r.requested_date || "—")} ${_escape$6(r.requested_time || "")}</span>
        <button type="button" data-c2-acc-plan="${_escape$6(r.id)}"
          class="text-indigo-600 bg-white border border-indigo-200 px-2 py-1 rounded text-[9px] font-bold">План</button>
      </div>
      ${r.volume ? `<div class="mt-1 text-[9px] text-slate-400 font-bold">${_escape$6(r.volume)}</div>` : ""}
      ${progressHtml}
    </div>`;
}
function _column(title, color, items, loc) {
  return `
    <div class="flex-1 min-w-[220px] bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-2">
      <div class="flex items-center justify-between px-1 mb-2">
        <span class="text-[10px] font-black uppercase tracking-widest ${color}">${_escape$6(title)}</span>
        <span class="bg-white dark:bg-slate-800 text-slate-600 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 text-[10px] font-bold">${items.length}</span>
      </div>
      <div class="max-h-[55vh] overflow-y-auto">
        ${items.length ? items.map((r) => _cardHtml(r, loc)).join("") : '<div class="text-center py-4 text-[10px] font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">Заявок нет</div>'}
      </div>
    </div>`;
}
async function renderAcceptanceKanban(root) {
  const acc = _acc$2();
  const loc = _loc$2();
  if (!acc || !loc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">constructionAcceptance / locations не загружены</div>`;
    return;
  }
  await loc.init();
  await acc.init();
  const objects = loc.listNodes({ nodeType: "object", parentId: null });
  const objOpts = `<option value="">Все объекты</option>` + objects.map(
    (o) => `<option value="${_escape$6(o.id)}" ${_filterObjectId === o.id ? "selected" : ""}>${_escape$6(o.displayName)}</option>`
  ).join("");
  let all = filterAcceptancesForRole(acc.list());
  if (_filterObjectId) {
    all = all.filter((r) => _objectIdForFloor(loc, r.locationId) === _filterObjectId);
  }
  const pending = all.filter((r) => r.status === "pending");
  const rejected = all.filter((r) => r.status === "rejected");
  const accepted = all.filter((r) => r.status === "accepted");
  const slotsDate = _slotsDate || _today$1();
  const occupancy = listSlotOccupancy(all, { date: slotsDate });
  root.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Канбан приёмки (v2)</div>
        <select id="c2-acc-obj-filter" class="input-base text-[11px] font-bold max-w-[220px]">${objOpts}</select>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <label class="text-[10px] font-black uppercase text-slate-500" for="c2-acc-slots-date">Слоты дня</label>
        <input type="date" id="c2-acc-slots-date" class="input-base text-[11px] font-bold max-w-[160px]" value="${_escape$6(
    slotsDate
  )}">
      </div>
      ${slotBoardHtml(occupancy, { title: `Занятость ${slotsDate}` })}
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
      if ((t == null ? void 0 : t.id) === "c2-acc-slots-date") {
        _slotsDate = t.value || null;
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
        const acc = _acc$2();
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
          },
          onChecklistChanged: async () => {
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
  const acc = _acc$2();
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
function _escape$5(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _pathLabel$1(loc, locationId) {
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
  var _a, _b, _c;
  closeUnitCard();
  unit.id;
  const guest = deps.cb.isGuest();
  const canDel = !guest && deps.cb.canSoftDelete(unit);
  const path = _pathLabel$1(deps.loc, unit.locationId);
  const status = String(unit.status || "not_inspected");
  const hasPdf = !!(unit.pdf_url && String(unit.pdf_url).startsWith("http"));
  const statusOpts = UNIT_STATUSES_V2.map(
    (st) => `<option value="${st}" ${status === st ? "selected" : ""}>${_escape$5(UNIT_STATUS_LABELS_RU[st])}</option>`
  ).join("");
  const wrap = document.createElement("div");
  wrap.id = "c2-unit-card";
  wrap.className = "fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 p-3";
  wrap.style.zIndex = "1050";
  wrap.innerHTML = `
    <div data-c2-unit-card-panel class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
      <div class="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div>
          <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Квартира</div>
          <div class="text-[18px] font-black text-slate-800 dark:text-slate-100">${_escape$5(unit.type || "КВ")} ${_escape$5(
    unit.name
  )}</div>
          <div class="text-[11px] font-bold text-slate-400 mt-0.5">${_escape$5(path)}</div>
        </div>
        <button type="button" data-c2-unit-card-close class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[20px] leading-none px-1" aria-label="Закрыть">×</button>
      </div>
      <div class="px-4 pb-4 space-y-3">
        <label class="block">
          <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Статус передачи</span>
          <select id="c2-unit-card-status" data-c2-unit-id="${_escape$5(unit.id)}"
            class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold"
            ${guest ? "disabled" : ""}>
            ${statusOpts}
          </select>
        </label>
        <div class="rounded-xl border border-slate-200 dark:border-slate-600 p-3 space-y-2">
          <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">План квартиры (PDF)</div>
          ${hasPdf ? `<div class="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">${_escape$5(
    unit.pdf_name || "plan.pdf"
  )}${unit.pdf_size ? ` · ${_escape$5(String(unit.pdf_size))} B` : ""}</div>
                 <div class="flex flex-wrap gap-2">
                   <a href="${_escape$5(String(unit.pdf_url))}" target="_blank" rel="noopener"
                     class="inline-flex items-center px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase border border-indigo-200">Открыть</a>
                   <button type="button" data-c2-unit-apt-plan="${_escape$5(unit.id)}"
                     class="inline-flex items-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase border border-indigo-600">Замечания на плане</button>
                 </div>` : `<div class="text-[11px] text-slate-400 font-bold">План не загружен</div>
                 <div class="text-[10px] text-slate-400 font-bold">Загрузка PDF — в Настройках → справочник локаций</div>
                 <button type="button" disabled
                   class="inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-black uppercase border border-slate-200 cursor-not-allowed opacity-70">Замечания на плане</button>`}
        </div>
        <button type="button" data-c2-unit-acceptance="${_escape$5(unit.id)}"
          class="w-full py-2.5 rounded-xl text-[11px] font-black uppercase text-white bg-violet-600 border border-violet-600 ${guest ? "opacity-50 cursor-not-allowed" : ""}"
          ${guest ? "disabled" : ""}>Приёмка</button>
        ${canDel ? `<button type="button" data-c2-unit-delete="${_escape$5(unit.id)}"
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
  (_b = wrap.querySelector("[data-c2-unit-acceptance]")) == null ? void 0 : _b.addEventListener("click", (ev) => {
    ev.preventDefault();
    if (guest) return;
    const id = ev.currentTarget.getAttribute("data-c2-unit-acceptance");
    if (!id) return;
    const fresh = deps.units.get(id) || unit;
    if (!deps.cb.onOpenAcceptance) {
      deps.cb.toast("Приёмка недоступна");
      return;
    }
    void deps.cb.onOpenAcceptance(fresh);
  });
  (_c = wrap.querySelector("[data-c2-unit-delete]")) == null ? void 0 : _c.addEventListener("click", (ev) => {
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
function _acc$1() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionAcceptance) || null;
}
function _listAccForLocation(locationId) {
  const a = _acc$1();
  if (!a || !locationId) return [];
  if (typeof a.listForLocation === "function") return a.listForLocation(locationId) || [];
  return a.list({ locationId }) || [];
}
function _bForUnit(unit) {
  var _a;
  const latest = pickLatestAcceptanceForB(_listAccForLocation(unit.locationId));
  if (!latest) return null;
  const b = computeAcceptanceQualityB(
    latest.template_key || ((_a = latest.checklist_results) == null ? void 0 : _a.template_key),
    latest.checklist_results
  );
  if (!b) return null;
  return { final: b.final, statusTxt: b.statusTxt };
}
function _permissions() {
  var _a, _b;
  return (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.permissions;
}
function _escape$4(s) {
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
let _objectId$1 = null;
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
    (it) => `<div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded ${it.swatch}"></span><span class="text-[9px] font-bold text-slate-500 uppercase">${_escape$4(
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
        <div class="w-12 shrink-0 text-center font-black text-[10px] text-slate-400 bg-[var(--hover-bg)] py-3 rounded-lg border border-[var(--card-border)] uppercase tracking-tight">${_escape$4(
      floorLabel
    )}</div>
        <div class="flex gap-1.5 flex-1">`;
    if (!floorUnits.length) {
      html += `<div class="text-[9px] text-slate-300 italic py-3">Помещений нет</div>`;
    } else {
      for (const u of floorUnits) {
        const bg = _cellBg(String(u.status || "not_inspected"));
        const pdfDot = u.pdf_url ? `<span class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500"></span>` : "";
        const b = _bForUnit(u);
        let bTint = "";
        let bBadge = "";
        if (b) {
          const ring = b.final < 70 ? "ring-2 ring-red-400/70" : b.final < 85 ? "ring-2 ring-amber-400/70" : "ring-2 ring-emerald-400/60";
          bTint = ` ${ring}`;
          bBadge = `<span class="absolute bottom-0 left-0 right-0 text-[7px] font-black leading-none py-0.5 ${b.final < 70 ? "bg-red-500/90 text-white" : b.final < 85 ? "bg-amber-500/90 text-white" : "bg-emerald-600/90 text-white"}" title="${_escape$4(b.statusTxt)}">${_escape$4(String(b.final))}</span>`;
        }
        html += `
          <button type="button" data-c2-unit-cell="${_escape$4(u.id)}"
            class="relative ${bg}${bTint} border rounded-lg w-[46px] h-[46px] flex flex-col items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform active:scale-95 overflow-hidden">
            ${pdfDot}
            ${bBadge}
            <span class="text-[12px] font-black">${_escape$4(u.name)}</span>
            <span class="text-[8px] opacity-60 font-bold">${_escape$4(u.type || "КВ")}</span>
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
    objOpts += `<option value="${_escape$4(o.id)}" ${_objectId$1 === o.id ? "selected" : ""}>${_escape$4(
      o.displayName
    )}</option>`;
  }
  let bldOpts = `<option value="">— корпус —</option>`;
  if (_objectId$1) {
    const buildings = loc.getChildren(_objectId$1).filter((b) => !b.nodeType || b.nodeType === "building");
    for (const b of buildings) {
      bldOpts += `<option value="${_escape$4(b.id)}" ${_buildingId === b.id ? "selected" : ""}>${_escape$4(
        b.displayName
      )}</option>`;
    }
  }
  return `
    <div class="flex flex-col sm:flex-row gap-2 mb-4">
      <select id="c2-transfer-object" class="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-[12px] font-bold">
        ${objOpts}
      </select>
      <select id="c2-transfer-building" class="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-[12px] font-bold" ${_objectId$1 ? "" : "disabled"}>
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
  const aSvc = _acc$1();
  if (aSvc == null ? void 0 : aSvc.init) {
    try {
      await aSvc.init();
    } catch (_) {
    }
  }
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
        _objectId$1 = t.value || null;
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
              },
              onOpenAcceptance: async (unit) => {
                await _openUnitAcceptance(unit);
              }
            }
          });
        }
      }
    },
    true
  );
}
async function _openUnitAcceptance(unit) {
  if (_isGuest()) {
    _toast("Гости не могут открывать приёмку");
    return;
  }
  const aSvc = _acc$1();
  const uSvc = _units();
  if (!aSvc) {
    _toast("service.constructionAcceptance не загружен");
    return;
  }
  let fresh = unit;
  if (uSvc == null ? void 0 : uSvc.ensureApartmentForUnit) {
    try {
      fresh = await uSvc.ensureApartmentForUnit(unit.id);
    } catch (e) {
      console.warn("[transfer-board] ensureApartmentForUnit", e);
    }
  }
  const locationId = String(fresh.locationId || "").trim();
  if (!locationId) {
    _toast("У квартиры нет locationId");
    return;
  }
  const list = _listAccForLocation(locationId).filter((a) => String(a.status) !== "rejected").slice().sort(
    (a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))
  );
  const pending = list.find((a) => String(a.status) === "pending");
  const openItem = pending || list[0] || null;
  const openDetails = (item) => {
    closeUnitCard();
    openAcceptanceDetails(item, {
      onChangeStatus: async (rid, status) => {
        await aSvc.changeStatus(rid, status);
        _toast("✅ Статус обновлён");
        await _refreshBoard();
      },
      onSoftDelete: async (rid) => {
        await aSvc.softDelete(rid);
        _toast("Заявка отозвана");
        await _refreshBoard();
      },
      onChecklistChanged: async () => {
        await _refreshBoard();
      }
    });
  };
  if (openItem) {
    openDetails(openItem);
    return;
  }
  closeUnitCard();
  openCreateAcceptanceForm(
    { locationId, zone: { ...APARTMENT_FULL_ZONE }, mode: "apartment" },
    async (input) => {
      const created = await aSvc.create(input);
      _toast("✅ Приёмка создана");
      await _refreshBoard();
      openDetails(created);
    }
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
const MS_DAY = 24 * 60 * 60 * 1e3;
function _asDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d2 = /* @__PURE__ */ new Date(`${m[1]}T12:00:00`);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function deadlineEndOfDay(deadline) {
  const m = String(deadline || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const end = /* @__PURE__ */ new Date(`${m[1]}T23:59:59.999`);
  return Number.isNaN(end.getTime()) ? null : end;
}
function _ceilDays(from, to) {
  const a = new Date(from);
  a.setHours(12, 0, 0, 0);
  const b = new Date(to);
  b.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / MS_DAY));
}
function _history(d) {
  const h = d.history;
  if (!Array.isArray(h)) return [];
  return h;
}
function _normStatus(s) {
  const st = String(s || "").toLowerCase();
  if (st === "open") return "issued";
  if (st === "cancelled") return "rejected";
  return st;
}
function normalizeCategory(c) {
  const v = String(c || "").toLowerCase();
  if (v === "minor" || v === "b1") return "B1";
  if (v === "major" || v === "b2") return "B2";
  if (v === "critical" || v === "b3") return "B3";
  const up = String(c || "").toUpperCase();
  if (up === "B1" || up === "B2" || up === "B3") return up;
  return up || "—";
}
function isOverdueNow(d, now = /* @__PURE__ */ new Date()) {
  const st = _normStatus(String(d.status));
  if (st !== "issued" && st !== "in_progress" && st !== "fixed") return false;
  const end = deadlineEndOfDay(d.deadline);
  if (!end) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return end < today;
}
function issueDate(d) {
  const fromCreated = _asDate(d.created_at);
  if (fromCreated) return fromCreated;
  for (const e of _history(d)) {
    const st = _normStatus(String(e.status));
    if (st === "issued") {
      const dt = _asDate(e.date);
      if (dt) return dt;
    }
  }
  return _asDate(d.updated_at);
}
function eliminateDate(d) {
  let best = null;
  for (const e of _history(d)) {
    const st = _normStatus(String(e.status));
    if (st !== "fixed" && st !== "closed") continue;
    const dt = _asDate(e.date);
    if (!dt) continue;
    if (!best || dt.getTime() < best.getTime()) best = dt;
  }
  return best;
}
function acceptedDate(d) {
  let best = null;
  for (const e of _history(d)) {
    if (_normStatus(String(e.status)) !== "closed") continue;
    const dt = _asDate(e.date);
    if (!dt) continue;
    if (!best || dt.getTime() < best.getTime()) best = dt;
  }
  return best;
}
function daysOpen(d, now = /* @__PURE__ */ new Date()) {
  const issued = issueDate(d);
  if (!issued) return null;
  return _ceilDays(issued, now);
}
function agingBucket(days) {
  if (days <= 3) return "0-3";
  if (days <= 7) return "4-7";
  if (days <= 14) return "8-14";
  return "15+";
}
function _avg(nums) {
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round(sum / nums.length * 10) / 10;
}
function _inPeriod(d, period, now) {
  if (period === "all") return true;
  const days = period === "30" ? 30 : 90;
  const issued = issueDate(d);
  if (!issued) return false;
  const cut = new Date(now);
  cut.setHours(0, 0, 0, 0);
  cut.setDate(cut.getDate() - days);
  return issued.getTime() >= cut.getTime();
}
function _locOk(d, ids) {
  if (!ids || ids.size === 0) return true;
  return ids.has(String(d.locationId || ""));
}
function computeDefectSlaMetrics(defects, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date(opts.now ?? Date.now());
  const period = opts.period || "all";
  const locSet = opts.locationIds == null ? null : opts.locationIds instanceof Set ? opts.locationIds : new Set(opts.locationIds.map(String));
  const list = (defects || []).filter(
    (d) => d && !d.is_deleted && !d._deleted && _inPeriod(d, period, now) && _locOk(d, locSet)
  );
  let open = 0;
  let overdueNow = 0;
  const elimDays = [];
  const reviewDays = [];
  let closedOnTime = 0;
  let closedLate = 0;
  const catMap = {
    B1: { open: 0, overdue: 0, elim: [] },
    B2: { open: 0, overdue: 0, elim: [] },
    B3: { open: 0, overdue: 0, elim: [] }
  };
  const contrMap = /* @__PURE__ */ new Map();
  const aging = { "0-3": 0, "4-7": 0, "8-14": 0, "15+": 0 };
  const overdueList = [];
  const ensureContr = (id) => {
    if (!contrMap.has(id)) contrMap.set(id, { open: 0, overdue: 0, elim: [] });
    return contrMap.get(id);
  };
  for (const d of list) {
    const st = _normStatus(String(d.status));
    const cat = normalizeCategory(d.category);
    const catKey = cat === "B1" || cat === "B2" || cat === "B3" ? cat : null;
    const cid = String(d.contractorId || "").trim() || "—";
    const contr = ensureContr(cid);
    const issued = issueDate(d);
    const elim = eliminateDate(d);
    const accepted = acceptedDate(d);
    if (elim && issued) {
      const days = _ceilDays(issued, elim);
      elimDays.push(days);
      if (catKey) catMap[catKey].elim.push(days);
      contr.elim.push(days);
    }
    if (accepted && elim) {
      const hist = _history(d);
      const hasFixed = hist.some((e) => _normStatus(String(e.status)) === "fixed");
      if (hasFixed && accepted.getTime() >= elim.getTime()) {
        reviewDays.push(_ceilDays(elim, accepted));
      }
    }
    if (st === "closed") {
      const end = deadlineEndOfDay(d.deadline);
      if (end && accepted) {
        if (accepted.getTime() <= end.getTime()) closedOnTime += 1;
        else closedLate += 1;
      }
    }
    const isOpenAging = st === "issued" || st === "in_progress" || st === "fixed";
    if (isOpenAging) {
      if (st === "issued" || st === "in_progress") {
        open += 1;
        if (catKey) catMap[catKey].open += 1;
        contr.open += 1;
      }
      if (issued) {
        aging[agingBucket(_ceilDays(issued, now))] += 1;
      }
      if (isOverdueNow(d, now)) {
        overdueNow += 1;
        if (catKey) catMap[catKey].overdue += 1;
        contr.overdue += 1;
        const end = deadlineEndOfDay(d.deadline);
        const daysOd = _ceilDays(end, now);
        overdueList.push({
          id: d.id,
          description: String(d.description || d.item_name || d.text || "Без описания").slice(0, 120),
          status: st,
          category: String(cat),
          contractorId: d.contractorId || null,
          deadline: String(d.deadline || "").slice(0, 10),
          daysOverdue: daysOd,
          daysOpen: issued ? _ceilDays(issued, now) : 0,
          locationId: String(d.locationId || "")
        });
      }
    }
  }
  overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue || b.daysOpen - a.daysOpen);
  const closedWithDeadline = closedOnTime + closedLate;
  const onTimePct = closedWithDeadline > 0 ? Math.round(closedOnTime / closedWithDeadline * 1e3) / 10 : null;
  const byCategory = ["B1", "B2", "B3"].map((category) => ({
    category,
    open: catMap[category].open,
    overdue: catMap[category].overdue,
    avgEliminateDays: _avg(catMap[category].elim)
  }));
  const byContractor = [...contrMap.entries()].map(([contractorId, v]) => ({
    contractorId,
    open: v.open,
    overdue: v.overdue,
    avgEliminateDays: _avg(v.elim)
  })).sort((a, b) => b.overdue - a.overdue || b.open - a.open).slice(0, 10);
  return {
    open,
    overdueNow,
    avgEliminateDays: _avg(elimDays),
    avgReviewDays: _avg(reviewDays),
    onTimePct,
    closedOnTime,
    closedLate,
    closedWithDeadline,
    byCategory,
    byContractor,
    aging,
    overdueList: overdueList.slice(0, 20)
  };
}
let _overdueOnly = false;
function _escape$3(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _statusLabel$1(s) {
  const map = {
    issued: "Выдано",
    in_progress: "В работе",
    fixed: "Устранено",
    closed: "Закрыто",
    rejected: "Отклонено",
    open: "Выдано",
    cancelled: "Отклонено"
  };
  return map[s] || s || "—";
}
function _categoryLabel(c) {
  const v = String(c || "").toUpperCase();
  if (v === "B1" || v === "MINOR") return "B1";
  if (v === "B3" || v === "CRITICAL") return "B3";
  if (v === "B2" || v === "MAJOR") return "B2";
  return v || "—";
}
function _categoryBar(c) {
  const v = String(c || "").toUpperCase();
  if (v === "B1" || v === "MINOR") return "bg-blue-500";
  if (v === "B3" || v === "CRITICAL") return "bg-red-600";
  return "bg-orange-500";
}
function _deadlineMeta(d) {
  if (d.deadline == null || d.deadline === "") return { label: "без срока", overdue: false };
  const m = String(d.deadline).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return { label: String(d.deadline), overdue: false };
  const [y, mo, day] = m[1].split("-");
  const label = `${day}.${mo}.${y}`;
  return { label, overdue: isOverdueNow(d) };
}
function _statusChip(status) {
  const st = String(status || "").toLowerCase();
  let cls = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  if (st === "issued" || st === "open") cls = "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  else if (st === "in_progress") cls = "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  else if (st === "fixed") cls = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  else if (st === "closed") cls = "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
  else if (st === "rejected" || st === "cancelled") cls = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return `<span class="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${cls}">${_escape$3(
    _statusLabel$1(st)
  )}</span>`;
}
function _deadlineSortKey(d) {
  const end = deadlineEndOfDay(d.deadline);
  return end ? end.getTime() : Number.POSITIVE_INFINITY;
}
function _sortRegistry(list) {
  return list.slice().sort((a, b) => {
    const ao = isOverdueNow(a) ? 0 : 1;
    const bo = isOverdueNow(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return _deadlineSortKey(a) - _deadlineSortKey(b);
  });
}
function renderDefectsRegistry(host, opts) {
  var _a;
  const { floorId, floorLabel, cb } = opts;
  const defects = filterDefectsForRole(opts.defects || []);
  const filters = opts.filters || pinFiltersState;
  if (!floorId) {
    host.innerHTML = `<div class="flex items-center justify-center h-full min-h-[240px] text-slate-400 text-[13px] font-medium px-6 text-center">
      Выберите этаж слева, чтобы увидеть реестр замечаний
    </div>`;
    return;
  }
  let filtered = filterDefectsByPins(defects, filters);
  if (_overdueOnly) {
    filtered = filtered.filter((d) => isOverdueNow(d));
  }
  filtered = _sortRegistry(filtered);
  const overdueChipCls = _overdueOnly ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-slate-900 text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30";
  const rows = filtered.length === 0 ? `<div class="p-8 text-center text-slate-400 text-[13px] font-medium">
          Нет замечаний по выбранному фильтру
        </div>` : `<ul class="divide-y divide-slate-100 dark:divide-slate-800">
          ${filtered.map((d, i) => {
    const desc = String(d.description || d.item_name || d.text || "Без описания").slice(0, 140);
    const dl = _deadlineMeta(d);
    const openDays = daysOpen(d);
    const daysBadge = openDays != null ? `<span class="text-[10px] font-bold ${dl.overdue ? "text-red-600 dark:text-red-400" : "text-slate-400"}">${openDays} дн.</span>` : "";
    const dlCls = dl.overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-400";
    const bar = _categoryBar(String(d.category));
    const rowBg = dl.overdue ? "bg-red-50/40 dark:bg-red-950/15" : "";
    return `<li class="${rowBg}">
                <div class="flex items-stretch hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <div class="w-1 shrink-0 ${bar}"></div>
                  <button type="button" data-c2-def-row="${_escape$3(d.id)}"
                    class="flex-1 min-w-0 text-left px-3 py-2.5 flex items-start gap-2.5">
                    <span class="shrink-0 w-6 h-6 mt-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                                 flex items-center justify-center text-[10px] font-bold">${i + 1}</span>
                    <span class="min-w-0 flex-1">
                      <span class="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span class="text-[10px] font-bold text-slate-500">${_escape$3(_categoryLabel(String(d.category)))}</span>
                        ${_statusChip(String(d.status))}
                        ${daysBadge}
                        <span class="text-[10px] ${dlCls}">${_escape$3(dl.label)}${dl.overdue ? " · просрочено" : ""}</span>
                      </span>
                      <span class="block text-[13px] font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">${_escape$3(desc)}</span>
                    </span>
                  </button>
                  <button type="button" data-c2-def-on-plan="${_escape$3(d.id)}" data-c2-def-loc="${_escape$3(d.locationId)}"
                    class="shrink-0 self-center mr-2 px-2 py-1.5 rounded-lg text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    title="Показать на плане">На плане</button>
                </div>
              </li>`;
  }).join("")}
        </ul>`;
  host.innerHTML = `
    <div class="flex flex-col h-full min-h-[320px]">
      <div class="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[12px] font-semibold text-slate-700 dark:text-slate-200 min-w-0 truncate">
            ${_escape$3(floorLabel || "Этаж")}
          </div>
          <div class="text-[10px] text-slate-400 shrink-0">Показано ${filtered.length} из ${defects.length}</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="min-w-0 flex-1" data-c2-pin-filters-host="registry">${renderPinFiltersHtml(defects, filters, { compact: true })}</div>
          <button type="button" data-c2-reg-overdue
            class="shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border ${overdueChipCls}"
            title="Только просроченные (issued / в работе / на проверке)">Просроч.</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">${rows}</div>
    </div>`;
  (_a = host.querySelector("[data-c2-reg-overdue]")) == null ? void 0 : _a.addEventListener("click", (ev) => {
    var _a2;
    ev.preventDefault();
    ev.stopPropagation();
    _overdueOnly = !_overdueOnly;
    renderDefectsRegistry(host, opts);
    (_a2 = cb.onFiltersChanged) == null ? void 0 : _a2.call(cb);
  });
  host.querySelectorAll("[data-c2-def-row]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = btn.getAttribute("data-c2-def-row");
      if (id) cb.onOpenDefect(id);
    });
  });
  host.querySelectorAll("[data-c2-def-on-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const el = btn;
      const id = el.getAttribute("data-c2-def-on-plan");
      const loc = el.getAttribute("data-c2-def-loc");
      if (id && loc) cb.onShowOnPlan(id, loc);
    });
  });
}
let _period = "all";
let _objectId = null;
function _escape$2(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _fmt(n, suffix = "") {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n}${suffix}`;
}
function _contractorLabel(id) {
  var _a, _b, _c;
  const cid = String(id || "").trim();
  if (!cid || cid === "—") return "—";
  try {
    const svc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.contractors;
    const fromSvc = ((_c = svc == null ? void 0 : svc.list) == null ? void 0 : _c.call(svc)) || [];
    const hit = fromSvc.find((c) => String(c.id) === cid);
    if (hit) return String(hit.display_name || hit.name || cid);
  } catch {
  }
  const dir = window.ContractorDirectory;
  const hit2 = ((dir == null ? void 0 : dir.contractors) || []).find((c) => String(c.id) === cid);
  if (hit2) return String(hit2.display_name || cid);
  return cid.length > 12 ? `${cid.slice(0, 8)}…` : cid;
}
function _locationIdsUnderObject(loc, objectId) {
  const ids = /* @__PURE__ */ new Set();
  const walk = (parentId) => {
    ids.add(parentId);
    for (const ch of loc.getChildren(parentId) || []) {
      walk(ch.id);
    }
  };
  walk(objectId);
  return ids;
}
function _kpiCard(label, value, tone = "") {
  const toneCls = tone === "danger" ? "border-red-200 dark:border-red-900/50" : tone === "ok" ? "border-emerald-200 dark:border-emerald-900/40" : "border-[var(--card-border)]";
  return `<div class="min-w-[7.5rem] flex-1 bg-[var(--card-bg)] border ${toneCls} rounded-2xl px-3 py-2.5">
    <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">${_escape$2(label)}</div>
    <div class="text-[18px] font-black text-slate-800 dark:text-slate-100 leading-none">${_escape$2(value)}</div>
  </div>`;
}
function _barRow(label, count, max, color) {
  const pct = max > 0 ? Math.round(count / max * 100) : 0;
  return `<div class="flex items-center gap-2 text-[11px] mb-1.5">
    <span class="w-12 shrink-0 font-bold text-slate-500">${_escape$2(label)}</span>
    <div class="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div class="h-full ${color}" style="width:${pct}%"></div>
    </div>
    <span class="w-8 text-right font-bold text-slate-700 dark:text-slate-200">${count}</span>
  </div>`;
}
function _periodBtn(p, label) {
  const on = _period === p;
  return `<button type="button" data-c2-metrics-period="${p}"
    class="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${on ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300"}">${_escape$2(label)}</button>`;
}
function renderMetricsView(host, opts) {
  var _a;
  const { loc, defectsSvc, cb } = opts;
  const objects = loc.listNodes({ nodeType: "object", parentId: null }) || [];
  const allDefects = ((_a = defectsSvc == null ? void 0 : defectsSvc.list) == null ? void 0 : _a.call(defectsSvc, { includeDeleted: false })) || [];
  let locationIds = null;
  if (_objectId) {
    locationIds = _locationIdsUnderObject(loc, _objectId);
  }
  const m = computeDefectSlaMetrics(allDefects, {
    period: _period,
    locationIds
  });
  const agingMax = Math.max(1, ...Object.values(m.aging));
  const objectOptions = [
    `<option value="">Все объекты</option>`,
    ...objects.map(
      (o) => `<option value="${_escape$2(o.id)}"${_objectId === o.id ? " selected" : ""}>${_escape$2(
        o.displayName
      )}</option>`
    )
  ].join("");
  const catRows = m.byCategory.map(
    (r) => `<tr class="border-t border-slate-100 dark:border-slate-800">
      <td class="py-1.5 pr-2 font-bold">${_escape$2(r.category)}</td>
      <td class="py-1.5 pr-2 text-right">${r.open}</td>
      <td class="py-1.5 pr-2 text-right ${r.overdue ? "text-red-600 font-semibold" : ""}">${r.overdue}</td>
      <td class="py-1.5 text-right">${_fmt(r.avgEliminateDays)}</td>
    </tr>`
  ).join("");
  const contrRows = m.byContractor.length === 0 ? `<tr><td colspan="4" class="py-3 text-center text-slate-400 text-[12px]">Нет данных</td></tr>` : m.byContractor.map(
    (r) => `<tr class="border-t border-slate-100 dark:border-slate-800">
      <td class="py-1.5 pr-2 font-medium truncate max-w-[10rem]" title="${_escape$2(r.contractorId)}">${_escape$2(
      _contractorLabel(r.contractorId)
    )}</td>
      <td class="py-1.5 pr-2 text-right">${r.open}</td>
      <td class="py-1.5 pr-2 text-right ${r.overdue ? "text-red-600 font-semibold" : ""}">${r.overdue}</td>
      <td class="py-1.5 text-right">${_fmt(r.avgEliminateDays)}</td>
    </tr>`
  ).join("");
  const overdueRows = m.overdueList.length === 0 ? `<div class="p-4 text-center text-slate-400 text-[12px]">Нет просроченных</div>` : `<ul class="divide-y divide-slate-100 dark:divide-slate-800">
          ${m.overdueList.map(
    (r) => `<li>
            <button type="button" data-c2-metrics-def="${_escape$2(r.id)}"
              class="w-full text-left px-3 py-2.5 hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors">
              <span class="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span class="text-[10px] font-bold text-slate-500">${_escape$2(r.category)}</span>
                <span class="text-[9px] font-bold uppercase text-red-600">+${r.daysOverdue} дн. проср.</span>
                <span class="text-[10px] text-slate-400">${r.daysOpen} дн. открыто</span>
              </span>
              <span class="block text-[13px] font-medium text-slate-800 dark:text-slate-100 line-clamp-2">${_escape$2(
      r.description
    )}</span>
            </button>
          </li>`
  ).join("")}
        </ul>`;
  host.innerHTML = `
    <div class="flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 class="text-[14px] font-black text-slate-800 dark:text-slate-100 tracking-tight">Сроки замечаний</h3>
          <p class="text-[10px] text-slate-400 mt-0.5">Локальный расчёт по defects_v2 · без новой схемы БД</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex gap-1">${_periodBtn("30", "30 дн.")}${_periodBtn("90", "90 дн.")}${_periodBtn("all", "Все")}</div>
          <select data-c2-metrics-object
            class="text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-[var(--card-bg)] px-2 py-1.5 max-w-[12rem]">
            ${objectOptions}
          </select>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        ${_kpiCard("Открытые", String(m.open))}
        ${_kpiCard("Просроченные", String(m.overdueNow), m.overdueNow ? "danger" : "")}
        ${_kpiCard("Ср. устранение", _fmt(m.avgEliminateDays, " дн."))}
        ${_kpiCard("Ср. проверка СК", _fmt(m.avgReviewDays, " дн."))}
        ${_kpiCard("% вовремя", m.onTimePct == null ? "—" : `${m.onTimePct}%`, m.onTimePct != null && m.onTimePct >= 80 ? "ok" : "")}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3">
          <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">По категории</div>
          <table class="w-full text-[11px] text-slate-700 dark:text-slate-200">
            <thead><tr class="text-[9px] uppercase tracking-wider text-slate-400">
              <th class="text-left font-bold pb-1">Cat</th>
              <th class="text-right font-bold pb-1">Откр.</th>
              <th class="text-right font-bold pb-1">Проср.</th>
              <th class="text-right font-bold pb-1">Ср. дн.</th>
            </tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3">
          <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Aging открытых</div>
          ${_barRow("0–3", m.aging["0-3"], agingMax, "bg-emerald-500")}
          ${_barRow("4–7", m.aging["4-7"], agingMax, "bg-amber-400")}
          ${_barRow("8–14", m.aging["8-14"], agingMax, "bg-orange-500")}
          ${_barRow("15+", m.aging["15+"], agingMax, "bg-red-600")}
        </div>
      </div>

      <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3">
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">По подрядчику (топ-10 по просрочке)</div>
        <table class="w-full text-[11px] text-slate-700 dark:text-slate-200">
          <thead><tr class="text-[9px] uppercase tracking-wider text-slate-400">
            <th class="text-left font-bold pb-1">Подрядчик</th>
            <th class="text-right font-bold pb-1">Откр.</th>
            <th class="text-right font-bold pb-1">Проср.</th>
            <th class="text-right font-bold pb-1">Ср. дн.</th>
          </tr></thead>
          <tbody>${contrRows}</tbody>
        </table>
      </div>

      <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
        <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-red-600">
          Просроченные сейчас · до 20
        </div>
        ${overdueRows}
      </div>
    </div>`;
  host.querySelectorAll("[data-c2-metrics-period]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const p = btn.getAttribute("data-c2-metrics-period");
      if (!p || p === _period) return;
      _period = p;
      renderMetricsView(host, opts);
    });
  });
  const sel = host.querySelector("[data-c2-metrics-object]");
  sel == null ? void 0 : sel.addEventListener("change", () => {
    _objectId = sel.value || null;
    renderMetricsView(host, opts);
  });
  host.querySelectorAll("[data-c2-metrics-def]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = btn.getAttribute("data-c2-metrics-def");
      if (id) cb.onOpenDefect(id);
    });
  });
}
function _escape$1(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _today() {
  const d = /* @__PURE__ */ new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function _pathLabel(locationId) {
  var _a, _b, _c, _d;
  const loc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations;
  if (loc == null ? void 0 : loc.getPath) {
    return loc.getPath(locationId).map((n) => n.displayName).join(" · ");
  }
  return ((_d = (_c = loc == null ? void 0 : loc.getNode) == null ? void 0 : _c.call(loc, locationId)) == null ? void 0 : _d.displayName) || locationId;
}
function _statusLabel(s) {
  const map = {
    issued: "Выдано",
    in_progress: "В работе",
    fixed: "На проверке",
    closed: "Закрыто",
    rejected: "Отклонено",
    pending: "Ожидает",
    accepted: "Принята"
  };
  return map[s] || s || "—";
}
function _kpi(label, value, tone = "") {
  const toneCls = tone === "danger" ? "border-red-200 dark:border-red-900/50" : tone === "warn" ? "border-amber-200 dark:border-amber-900/40" : "border-[var(--card-border)]";
  return `<div class="min-w-[6.5rem] flex-1 bg-[var(--card-bg)] border ${toneCls} rounded-2xl px-3 py-2.5">
    <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">${_escape$1(label)}</div>
    <div class="text-[18px] font-black text-slate-800 dark:text-slate-100 leading-none">${value}</div>
  </div>`;
}
function _defectRow(d) {
  const desc = String(d.description || d.item_name || d.text || "Без описания").slice(0, 120);
  const overdue = isOverdueNow(d);
  return `<li>
    <button type="button" data-c2-cab-def="${_escape$1(d.id)}"
      class="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${overdue ? "bg-red-50/40 dark:bg-red-950/15" : ""}">
      <span class="flex flex-wrap items-center gap-1.5 mb-0.5">
        <span class="text-[10px] font-bold text-slate-500">${_escape$1(String(d.category || ""))}</span>
        <span class="text-[9px] font-bold uppercase text-indigo-600">${_escape$1(_statusLabel(String(d.status)))}</span>
        ${overdue ? '<span class="text-[9px] font-bold uppercase text-red-600">просрочено</span>' : ""}
      </span>
      <span class="block text-[13px] font-medium text-slate-800 dark:text-slate-100 line-clamp-2">${_escape$1(desc)}</span>
      <span class="block text-[10px] text-slate-400 mt-0.5">${_escape$1(_pathLabel(d.locationId))}</span>
    </button>
  </li>`;
}
function _accRow(a) {
  return `<li>
    <button type="button" data-c2-cab-acc="${_escape$1(a.id)}"
      class="w-full text-left px-3 py-2.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
      <span class="flex flex-wrap items-center gap-1.5 mb-0.5">
        <span class="text-[9px] font-bold uppercase text-indigo-600">${_escape$1(_statusLabel(String(a.status)))}</span>
        <span class="text-[10px] font-bold text-slate-500">${_escape$1(a.requested_date || "—")} ${_escape$1(
    a.requested_time || ""
  )}</span>
      </span>
      <span class="block text-[13px] font-medium text-slate-800 dark:text-slate-100">${_escape$1(
    a.work_type || "Без вида работ"
  )}</span>
      <span class="block text-[10px] text-slate-400 mt-0.5">${_escape$1(_pathLabel(a.locationId))}</span>
    </button>
  </li>`;
}
function _section(title, rows, empty) {
  return `
    <section class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
      <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-indigo-600">${_escape$1(
    title
  )}</div>
      ${rows ? `<ul class="divide-y divide-slate-100 dark:divide-slate-800">${rows}</ul>` : `<div class="p-4 text-center text-slate-400 text-[12px]">${_escape$1(empty)}</div>`}
    </section>`;
}
function renderContractorCabinet(host, opts) {
  const myId = resolveMyContractorId();
  const defects = filterDefectsForRole(opts.defects || []);
  const acceptances = filterAcceptancesForRole(opts.acceptances || []);
  if (!myId) {
    host.innerHTML = `
      <div class="p-6 max-w-lg mx-auto">
        <div class="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-[13px] font-medium text-amber-900 dark:text-amber-100">
          Подрядчик не привязан к профилю. Обратитесь к администратору, чтобы назначить карточку подрядчика —
          иначе кабинет, реестр и пины будут пустыми.
        </div>
      </div>`;
    return;
  }
  const open = defects.filter((d) => {
    const st = String(d.status || "").toLowerCase();
    return st === "issued" || st === "in_progress" || st === "open" || st === "rejected";
  });
  const onReview = defects.filter((d) => String(d.status || "").toLowerCase() === "fixed");
  const overdue = defects.filter((d) => isOverdueNow(d));
  const upcoming = acceptances.filter((a) => {
    const st = String(a.status || "").toLowerCase();
    return st === "pending" || st === "accepted";
  }).slice().sort((a, b) => {
    const da = `${a.requested_date || ""} ${a.requested_time || ""}`;
    const db = `${b.requested_date || ""} ${b.requested_time || ""}`;
    return da.localeCompare(db);
  }).slice(0, 8);
  const occupancy = listSlotOccupancy(acceptances, { date: _today() });
  host.innerHTML = `
    <div class="space-y-3 p-1 sm:p-2">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">Кабинет подрядчика</div>
        <div class="text-[10px] text-slate-400 font-bold truncate max-w-[14rem]" title="${_escape$1(myId)}">мой id · ${_escape$1(
    myId.length > 10 ? `${myId.slice(0, 8)}…` : myId
  )}</div>
      </div>
      <div class="flex flex-wrap gap-2">
        ${_kpi("Открытые", open.length)}
        ${_kpi("На проверке", onReview.length, "warn")}
        ${_kpi("Просроченные", overdue.length, "danger")}
        ${_kpi("Слоты (скоро)", upcoming.length)}
      </div>
      ${slotBoardHtml(occupancy, { title: `Слоты сегодня (${_today()})` })}
      ${_section("Открытые замечания", open.map(_defectRow).join(""), "Нет открытых замечаний")}
      ${_section("На проверке", onReview.map(_defectRow).join(""), "Нет замечаний на проверке")}
      ${_section("Просроченные", overdue.map(_defectRow).join(""), "Нет просроченных")}
      ${_section("Ближайшие слоты приёмки", upcoming.map(_accRow).join(""), "Нет заявок на приёмку")}
    </div>`;
  host.querySelectorAll("[data-c2-cab-def]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = btn.getAttribute("data-c2-cab-def");
      if (id) opts.cb.onOpenDefect(id);
    });
  });
  host.querySelectorAll("[data-c2-cab-acc]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = btn.getAttribute("data-c2-cab-acc");
      if (id) opts.cb.onOpenAcceptance(id);
    });
  });
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
let _pendingHighlightDefectId = null;
let _fsOpen = false;
let _fsPlaceholder = null;
let _fsEscHandler = null;
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
function _zoomToolbarHtml(prefix) {
  return `<div class="flex gap-1 shrink-0 items-center rounded-xl bg-black/20 p-0.5">
    <button type="button" data-c2-zoom-out="${prefix}"
      class="w-8 h-8 rounded-lg text-[16px] font-black text-white/90 hover:bg-white/10" title="Уменьшить">−</button>
    <button type="button" data-c2-zoom-in="${prefix}"
      class="w-8 h-8 rounded-lg text-[16px] font-black text-white/90 hover:bg-white/10" title="Увеличить">+</button>
    <button type="button" data-c2-zoom-fit="${prefix}"
      class="px-2.5 h-8 rounded-lg text-[9px] font-black uppercase text-white/90 hover:bg-white/10" title="По размеру">Fit</button>
  </div>`;
}
function _fullscreenIconBtn() {
  return `<button type="button" data-c2-fullscreen
    class="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center
           text-slate-600 dark:text-slate-200 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
    title="На весь экран" aria-label="На весь экран">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
    </svg>
  </button>`;
}
function _renderPlanChrome(svc) {
  if (!_selectedFloorId) {
    return `<div class="flex items-center justify-center h-full min-h-[240px] text-slate-400 text-[12px] font-medium px-4 text-center">
      Выберите этаж слева
    </div>`;
  }
  const floor = svc.getNode(_selectedFloorId);
  const plan = svc.getPlanForFloor(_selectedFloorId);
  const path = svc.getPath(_selectedFloorId).map((n) => n.displayName).join(" / ");
  if (!(plan == null ? void 0 : plan.pdf_url)) {
    return `<div class="p-6">
      <div class="text-[11px] font-bold text-slate-500 mb-2">${_escape(path)}</div>
      <div class="text-amber-600 font-bold text-[13px]">Нет PDF-плана на этом этаже</div>
      <p class="text-[11px] text-slate-500 mt-2">Загрузите план в Настройках → «Объекты и планы».</p>
    </div>`;
  }
  const addCls = _addMode ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-indigo-600 border-indigo-200 dark:border-indigo-800";
  const zoneCls = _zoneMode ? "bg-emerald-600 text-white border-emerald-600" : "bg-transparent text-emerald-700 border-emerald-200 dark:border-emerald-800";
  return `<div class="flex flex-col h-full min-h-[320px]" id="c2-plan-chrome">
    <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
      <div class="text-[12px] font-semibold text-slate-700 dark:text-slate-200 min-w-0 truncate">
        ${_escape(path || (floor == null ? void 0 : floor.displayName) || "")}
      </div>
      <div class="flex gap-1.5 shrink-0 items-center">
        <button type="button" data-c2-zone-mode
          class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${zoneCls}">
          ${_zoneMode ? "2 клика…" : "Зона"}
        </button>
        <button type="button" data-c2-add-mode
          class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${addCls}">
          ${_addMode ? "Кликни…" : "+ Замечание"}
        </button>
        ${_fullscreenIconBtn()}
      </div>
    </div>
    <div class="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700" data-c2-pin-filters-host="plan"></div>
    <div class="flex-1 relative bg-slate-100 dark:bg-slate-900 min-h-[280px]" id="c2-plan-host"></div>
    <div class="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 flex justify-end">
      <span id="c2-overlay-count"></span>
    </div>
  </div>`;
}
function _openViewDefect(id) {
  const dSvc = _defects();
  const d = dSvc == null ? void 0 : dSvc.get(id);
  if (!d || !dSvc) return;
  openViewDefectForm(
    d,
    async (defectId) => {
      var _a;
      await dSvc.softDelete(defectId);
      (_a = window.showToast) == null ? void 0 : _a.call(window, "Замечание удалено");
      await _afterDefectMutation();
    },
    async (defectId, patch) => {
      var _a;
      await dSvc.update(defectId, patch);
      (_a = window.showToast) == null ? void 0 : _a.call(window, "Замечание обновлено");
      await _afterDefectMutation();
    },
    async (defectId, input) => {
      var _a;
      await dSvc.changeStatus(defectId, input.status, {
        comment: input.comment,
        photos: input.photos
      });
      (_a = window.showToast) == null ? void 0 : _a.call(window, "✅ Статус обновлён");
      await _afterDefectMutation();
    }
  );
}
async function _afterDefectMutation() {
  if (_subview === "defects" || _subview === "cabinet" || _subview === "metrics") {
    await renderConstructionV2();
    return;
  }
  await _refreshOverlaysOnly();
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
        _openViewDefect(id);
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
  if (_pendingHighlightDefectId && _viewer) {
    _viewer.highlightMarker(_pendingHighlightDefectId);
    _pendingHighlightDefectId = null;
  }
}
function _syncModeButtons() {
  const inFs = !!document.getElementById("c2-plan-fs");
  document.querySelectorAll("[data-c2-add-mode]").forEach((el) => {
    const btn = el;
    btn.textContent = _addMode ? "Кликни…" : "+ Замечание";
    if (inFs && btn.closest("#c2-plan-fs")) {
      btn.className = _addMode ? "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-indigo-600 text-white border-indigo-600" : "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-white/10 text-white border-white/30";
    } else {
      btn.className = _addMode ? "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-indigo-600 text-white border-indigo-600" : "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-transparent text-indigo-600 border-indigo-200 dark:border-indigo-800";
    }
  });
  document.querySelectorAll("[data-c2-zone-mode]").forEach((el) => {
    const btn = el;
    btn.textContent = _zoneMode ? "2 клика…" : "Зона";
    if (inFs && btn.closest("#c2-plan-fs")) {
      btn.className = _zoneMode ? "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-emerald-600 text-white border-emerald-600" : "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-white/10 text-white border-white/30";
    } else {
      btn.className = _zoneMode ? "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-emerald-600 text-white border-emerald-600" : "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold bg-transparent text-emerald-700 border-emerald-200 dark:border-emerald-800";
    }
  });
}
async function _refreshOverlaysOnly() {
  const dSvc = _defects();
  const aSvc = _acc();
  if (!_viewer || !_selectedFloorId) return;
  if (dSvc) await dSvc.init();
  if (aSvc) await aSvc.init();
  const allDefects = filterDefectsForRole(dSvc ? dSvc.listForFloor(_selectedFloorId) : []);
  const filtered = filterDefectsByPins(allDefects, pinFiltersState);
  const zones = filterAcceptancesForRole(aSvc ? aSvc.listForFloor(_selectedFloorId) : []);
  paintPinFilterHosts(allDefects, pinFiltersState, { compact: true });
  _viewer.setMarkers(filtered);
  _viewer.setZones(zones);
  const label = `Показано ${filtered.length} из ${allDefects.length} · Зон: ${zones.length}`;
  const countEl = document.getElementById("c2-overlay-count");
  if (countEl) countEl.textContent = label;
  const fsCount = document.getElementById("c2-fs-overlay-count");
  if (fsCount) fsCount.textContent = label;
}
async function _onPinFiltersChanged() {
  if (_subview === "defects") {
    await renderConstructionV2();
    return;
  }
  await _refreshOverlaysOnly();
}
function _closePlanFullscreen() {
  if (!_fsOpen) return;
  const overlay = document.getElementById("c2-plan-fs");
  const host = document.getElementById("c2-plan-host");
  if (host && (_fsPlaceholder == null ? void 0 : _fsPlaceholder.parentNode)) {
    _fsPlaceholder.parentNode.insertBefore(host, _fsPlaceholder);
    _fsPlaceholder.remove();
  }
  _fsPlaceholder = null;
  overlay == null ? void 0 : overlay.remove();
  if (_fsEscHandler) {
    document.removeEventListener("keydown", _fsEscHandler);
    _fsEscHandler = null;
  }
  _fsOpen = false;
}
function _openPlanFullscreen() {
  var _a, _b;
  if (_fsOpen) return;
  const host = document.getElementById("c2-plan-host");
  if (!host || !_viewer) {
    (_a = window.showToast) == null ? void 0 : _a.call(window, "Сначала откройте план этажа");
    return;
  }
  const parent = host.parentNode;
  if (!parent) return;
  _fsPlaceholder = document.createComment("c2-plan-host-slot");
  parent.insertBefore(_fsPlaceholder, host);
  const overlay = document.createElement("div");
  overlay.id = "c2-plan-fs";
  overlay.className = "fixed inset-0 flex flex-col bg-slate-900";
  overlay.style.zIndex = "1100";
  const addCls = _addMode ? "bg-indigo-600 text-white border-indigo-600" : "bg-white/10 text-white border-white/30";
  const zoneCls = _zoneMode ? "bg-emerald-600 text-white border-emerald-600" : "bg-white/10 text-white border-white/30";
  overlay.innerHTML = `
    <div class="shrink-0 flex flex-col gap-1.5 px-3 py-2.5 border-b border-white/10 bg-slate-950/90">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-[11px] font-bold tracking-wide text-indigo-300">План · весь экран</div>
        <div class="flex items-center gap-2 flex-wrap">
          <span id="c2-fs-overlay-count" class="text-[10px] font-medium text-slate-400 hidden sm:inline"></span>
          ${_zoomToolbarHtml("fs")}
          <button type="button" data-c2-zone-mode
            class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${zoneCls}">
            ${_zoneMode ? "2 клика…" : "Зона"}
          </button>
          <button type="button" data-c2-add-mode
            class="px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${addCls}">
            ${_addMode ? "Кликни…" : "+ Замечание"}
          </button>
          <button type="button" data-c2-fs-close
            class="px-3 py-1.5 rounded-xl border text-[10px] font-bold bg-white text-slate-800 border-white">Закрыть</button>
        </div>
      </div>
      <div data-c2-pin-filters-host="fs"></div>
    </div>
    <div id="c2-plan-fs-host" class="relative flex-1 min-h-0 overflow-hidden"></div>`;
  const fsHost = overlay.querySelector("#c2-plan-fs-host");
  host.classList.add("h-full", "min-h-0");
  fsHost.appendChild(host);
  document.body.appendChild(overlay);
  _fsOpen = true;
  (_b = overlay.querySelector("[data-c2-fs-close]")) == null ? void 0 : _b.addEventListener("click", (ev) => {
    ev.preventDefault();
    _closePlanFullscreen();
  });
  _fsEscHandler = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      _closePlanFullscreen();
    }
  };
  document.addEventListener("keydown", _fsEscHandler);
  void _refreshOverlaysOnly();
}
function setConstructionV2Subview(view) {
  if (view !== "plan") _closePlanFullscreen();
  _subview = view;
}
function requestFocusAcceptance(id, locationId) {
  _subview = "plan";
  _selectedFloorId = locationId;
  _pendingFocusAccId = id;
  if ((location.hash || "").replace(/^#/, "") !== "/construction-v2") {
    location.hash = "#/construction-v2";
  }
  renderConstructionV2().catch(() => {
  });
}
function focusDefectOnPlan(id, locationId) {
  _closePlanFullscreen();
  _subview = "plan";
  _selectedFloorId = locationId;
  _pendingHighlightDefectId = id;
  if ((location.hash || "").replace(/^#/, "") !== "/construction-v2") {
    location.hash = "#/construction-v2";
  } else {
    renderConstructionV2().catch(() => {
    });
  }
}
async function renderConstructionV2() {
  var _a, _b;
  const root = _root();
  if (!root) return;
  if (_subview === "acceptance") {
    _closePlanFullscreen();
    teardownTransferUi();
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    await renderAcceptanceKanban(root);
    return;
  }
  if (_subview === "cabinet") {
    _closePlanFullscreen();
    teardownTransferUi();
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    const dSvcCab = _defects();
    const aSvcCab = _acc();
    if (dSvcCab) await dSvcCab.init();
    if (aSvcCab) await aSvcCab.init();
    root.innerHTML = `<div id="c2-cabinet-host" class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden min-h-[420px]"></div>`;
    const host = document.getElementById("c2-cabinet-host");
    if (!host) return;
    const defects = ((_a = dSvcCab == null ? void 0 : dSvcCab.list) == null ? void 0 : _a.call(dSvcCab, { includeDeleted: false })) || [];
    const acceptances = ((_b = aSvcCab == null ? void 0 : aSvcCab.list) == null ? void 0 : _b.call(aSvcCab, { includeDeleted: false })) || [];
    renderContractorCabinet(host, {
      defects,
      acceptances,
      cb: {
        onOpenDefect: (id) => _openViewDefect(id),
        onOpenAcceptance: (id) => {
          const item = aSvcCab == null ? void 0 : aSvcCab.get(id);
          if (!item || !aSvcCab) return;
          openAcceptanceDetails(item, {
            onFocusPlan: (rid) => focusAcceptanceOnPlan(rid),
            onChangeStatus: async (rid, status) => {
              var _a2;
              await aSvcCab.changeStatus(rid, status);
              (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "✅ Статус обновлён");
              await renderConstructionV2();
            },
            onSoftDelete: async (rid) => {
              var _a2;
              await aSvcCab.softDelete(rid);
              (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "Заявка отозвана");
              await renderConstructionV2();
            },
            onChecklistChanged: async () => {
              await renderConstructionV2();
            }
          });
        }
      }
    });
    return;
  }
  if (_subview === "transfer") {
    _closePlanFullscreen();
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
  _closePlanFullscreen();
  _viewer == null ? void 0 : _viewer.destroy();
  _viewer = null;
  _mountedPdfUrl = null;
  if (_subview === "metrics") {
    root.innerHTML = `<div id="c2-metrics-host" class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden min-h-[420px]"></div>`;
    const host = document.getElementById("c2-metrics-host");
    if (!host) return;
    const scopedDefectsSvc = dSvc ? {
      list: (opts) => filterDefectsForRole(dSvc.list(opts) || [])
    } : null;
    renderMetricsView(host, {
      loc: svc,
      defectsSvc: scopedDefectsSvc,
      cb: { onOpenDefect: (id) => _openViewDefect(id) }
    });
    return;
  }
  if (_subview === "defects") {
    root.innerHTML = `
      <div class="flex flex-col md:flex-row gap-3 h-full min-h-[420px]">
        <aside class="md:w-72 shrink-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 overflow-y-auto max-h-[70vh]">
          <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Иерархия (v2)</div>
          <div id="c2-tree">${_renderTree(svc)}</div>
          ${!dSvc ? `<div class="mt-3 text-[10px] text-amber-600 font-bold">constructionDefects не загружен</div>` : ""}
        </aside>
        <main class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative" id="c2-defects-host"></main>
      </div>`;
    _bindOnce();
    if (prevFloor) _selectedFloorId = prevFloor;
    const host = document.getElementById("c2-defects-host");
    if (!host) return;
    const floor = _selectedFloorId ? svc.getNode(_selectedFloorId) : null;
    const path = _selectedFloorId ? svc.getPath(_selectedFloorId).map((n) => n.displayName).join(" / ") : "";
    const list = _selectedFloorId && dSvc ? dSvc.listForFloor(_selectedFloorId) : [];
    renderDefectsRegistry(host, {
      floorId: _selectedFloorId,
      floorLabel: path || (floor == null ? void 0 : floor.displayName) || "",
      defects: list,
      filters: pinFiltersState,
      cb: {
        onOpenDefect: (id) => _openViewDefect(id),
        onShowOnPlan: (id, locationId) => focusDefectOnPlan(id, locationId)
      }
    });
    return;
  }
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
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
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
        return;
      }
      const fsBtn = (_d = t == null ? void 0 : t.closest) == null ? void 0 : _d.call(t, "[data-c2-fullscreen]");
      if (fsBtn) {
        ev.preventDefault();
        _openPlanFullscreen();
        return;
      }
      const zIn = (_e = t == null ? void 0 : t.closest) == null ? void 0 : _e.call(t, "[data-c2-zoom-in]");
      if (zIn) {
        ev.preventDefault();
        _viewer == null ? void 0 : _viewer.zoomIn();
        return;
      }
      const zOut = (_f = t == null ? void 0 : t.closest) == null ? void 0 : _f.call(t, "[data-c2-zoom-out]");
      if (zOut) {
        ev.preventDefault();
        _viewer == null ? void 0 : _viewer.zoomOut();
        return;
      }
      const zFit = (_g = t == null ? void 0 : t.closest) == null ? void 0 : _g.call(t, "[data-c2-zoom-fit]");
      if (zFit) {
        ev.preventDefault();
        _viewer == null ? void 0 : _viewer.fit();
        return;
      }
      const statusChip = (_h = t == null ? void 0 : t.closest) == null ? void 0 : _h.call(t, "[data-c2-pin-status]");
      if (statusChip) {
        if ((_i = t == null ? void 0 : t.closest) == null ? void 0 : _i.call(t, "#c2-apartment-plan")) return;
        ev.preventDefault();
        const key = statusChip.getAttribute("data-c2-pin-status");
        if (!key) return;
        toggleStatusFilter(pinFiltersState, key);
        void _onPinFiltersChanged();
        return;
      }
      const catBtn = (_j = t == null ? void 0 : t.closest) == null ? void 0 : _j.call(t, "[data-c2-pin-category]");
      if (catBtn) {
        if ((_k = t == null ? void 0 : t.closest) == null ? void 0 : _k.call(t, "#c2-apartment-plan")) return;
        ev.preventDefault();
        const key = catBtn.getAttribute("data-c2-pin-category");
        if (!key) return;
        setCategoryFilter(pinFiltersState, key);
        void _onPinFiltersChanged();
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
      <div class="flex items-center justify-between mb-3 gap-2">
        <div class="min-w-0">
          <h2 class="text-[14px] font-bold tracking-tight text-slate-800 dark:text-slate-100">Стройконтроль в2</h2>
          <p class="text-[10px] text-slate-400 mt-0.5">Тестовый контур · основной СК не затронут</p>
        </div>
        <a href="#/construction/defects"
          class="shrink-0 text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2.5 py-1.5 rounded-xl">Старый СК</a>
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
  if (_subview === "defects" || _subview === "metrics") {
    await renderConstructionV2();
    return;
  }
  await _refreshOverlaysOnly();
}
let _inited = false;
async function _syncChecklistOnDefectClosed(payload) {
  var _a, _b, _c, _d, _e;
  if ((payload == null ? void 0 : payload.reason) !== "changeStatus") return;
  if (String(payload.status || "") !== "closed") return;
  const defectId = String(payload.id || "").trim();
  if (!defectId) return;
  const dSvc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionDefects;
  const aSvc = (_d = (_c = window.RBI) == null ? void 0 : _c.services) == null ? void 0 : _d.constructionAcceptance;
  if (!(dSvc == null ? void 0 : dSvc.get) || !(aSvc == null ? void 0 : aSvc.setChecklistItem)) return;
  const defect = dSvc.get(defectId);
  if (!defect || defect.is_deleted || defect._deleted) return;
  const itemId = String(defect.item_id || "").trim();
  const locationId = String(defect.locationId || payload.locationId || "").trim();
  if (!itemId || !locationId) return;
  const acceptances = (typeof aSvc.listForLocation === "function" ? aSvc.listForLocation(locationId) : aSvc.list({ locationId })) || [];
  for (const acc of acceptances) {
    if (!acc || acc.is_deleted || acc._deleted) continue;
    if (String(acc.status) === "rejected") continue;
    const row = (((_e = acc.checklist_results) == null ? void 0 : _e.items) || []).find((it) => String(it.id) === itemId);
    if (!row) continue;
    if (row.status !== "fail" && row.status !== "fail_escalated") continue;
    try {
      await aSvc.setChecklistItem(acc.id, {
        id: itemId,
        name: String(row.name || defect.item_name || itemId),
        group: row.group ?? null,
        status: "ok"
      });
    } catch (e) {
      console.warn("[construction-v2] auto checklist OK on defect closed", e);
    }
  }
}
function _hashPath() {
  return (location.hash || "").replace(/^#/, "");
}
function _applyHashSubview() {
  const h = _hashPath();
  if (h.startsWith("/construction-v2/acceptance")) {
    setConstructionV2Subview("acceptance");
  } else if (h.startsWith("/construction-v2/transfer")) {
    setConstructionV2Subview("transfer");
  } else if (h.startsWith("/construction-v2/defects")) {
    setConstructionV2Subview("defects");
  } else if (h.startsWith("/construction-v2/metrics")) {
    setConstructionV2Subview("metrics");
  } else if (h.startsWith("/construction-v2/cabinet")) {
    setConstructionV2Subview("cabinet");
  } else if (h === "/construction-v2" || h === "/construction-v2/") {
    setConstructionV2Subview(isContractorRole() ? "cabinet" : "plan");
  } else if (h.startsWith("/construction-v2")) {
    setConstructionV2Subview(isContractorRole() ? "cabinet" : "plan");
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
  (_f = (_e = (_d = window.RBI) == null ? void 0 : _d.events) == null ? void 0 : _e.on) == null ? void 0 : _f.call(_e, "construction-defects:changed", (payload) => {
    refreshConstructionV2Markers().catch(() => {
    });
    refreshApartmentPlanMarkers().catch(() => {
    });
    const p = payload || {};
    void _syncChecklistOnDefectClosed(p);
  });
  (_i = (_h = (_g = window.RBI) == null ? void 0 : _g.events) == null ? void 0 : _h.on) == null ? void 0 : _i.call(_h, "construction-acceptance:changed", () => {
    refreshConstructionV2Markers().catch(() => {
    });
    const tab = document.getElementById("tab-construction-v2");
    if (tab && !tab.classList.contains("hidden")) {
      const transferRoot = document.getElementById("c2-transfer-grid");
      if (transferRoot) {
        renderConstructionV2().catch(() => {
        });
      }
    }
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
    router.addRoute("#/construction-v2/defects", () => showTab());
    router.addRoute("#/construction-v2/metrics", () => showTab());
    router.addRoute("#/construction-v2/cabinet", () => showTab());
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
