/**
 * MVP-мост ObjectDirectory (плоский) ↔ locations.object (иерархия).
 * Ключ связи: canonical_key. Без DDL / третьего store.
 */

import type { LocationNode } from './types';

export type OdObjectLite = {
  id?: string;
  canonical_key?: string;
  display_name?: string;
  name?: string;
  _deleted?: boolean;
  is_deleted?: boolean;
  synonyms?: string[];
  project_code?: string;
  sync_status?: string;
  source?: string;
  updated_at?: string;
  created_by?: string;
};

export type ObjectLinkResult = {
  od: OdObjectLite | null;
  locationObject: LocationNode | null;
  linked: boolean;
};

export type ObjectBridgeApi = {
  listNodes: (opts?: {
    nodeType?: LocationNode['nodeType'];
    parentId?: string | null;
    includeDeleted?: boolean;
  }) => LocationNode[];
  getNode: (id: string) => LocationNode | null;
  updateNode: (
    id: string,
    patch: Partial<Pick<LocationNode, 'displayName' | 'sort_order' | 'canonical_key' | 'synonyms'>>
  ) => Promise<LocationNode>;
  createNode: (input: {
    nodeType: LocationNode['nodeType'];
    displayName: string;
    parentId?: string | null;
    sort_order?: number;
    canonical_key?: string;
    synonyms?: string[];
  }) => Promise<LocationNode>;
};

type OdGlobal = {
  objects?: OdObjectLite[];
  cleanString?: (s: string) => string;
  getObjectByKey?: (key: string) => OdObjectLite | null;
  createFromLocation?: (opts: {
    displayName: string;
    canonical_key?: string;
  }) => Promise<OdObjectLite | null> | OdObjectLite | null;
};

function _od(): OdGlobal | null {
  return (window as unknown as { ObjectDirectory?: OdGlobal }).ObjectDirectory || null;
}

/** Тот же cleanString, что ObjectDirectory (fallback — локальная копия). */
export function cleanObjectName(str: string): string {
  const od = _od();
  if (od && typeof od.cleanString === 'function') return od.cleanString(str);
  return String(str || '')
    .toLowerCase()
    .replace(/['"«»]/g, '')
    .replace(/жк\s+/gi, '')
    .trim();
}

function listOdActive(): OdObjectLite[] {
  const od = _od();
  const list = od && Array.isArray(od.objects) ? od.objects : [];
  return list.filter((o) => o && !o._deleted && !o.is_deleted);
}

function findOdByKey(key: string): OdObjectLite | null {
  if (!key) return null;
  const od = _od();
  if (od && typeof od.getObjectByKey === 'function') {
    const hit = od.getObjectByKey(key);
    if (hit && !hit._deleted && !hit.is_deleted) return hit;
  }
  const clean = cleanObjectName(key);
  return listOdActive().find((o) => cleanObjectName(o.canonical_key || '') === clean) || null;
}

function findOdByDisplay(name: string): OdObjectLite | null {
  const clean = cleanObjectName(name);
  if (!clean) return null;
  return (
    listOdActive().find((o) => cleanObjectName(o.display_name || o.name || '') === clean) || null
  );
}

function listLocationObjects(api: ObjectBridgeApi): LocationNode[] {
  return api.listNodes({ nodeType: 'object', parentId: null }) || [];
}

function findLocByKey(api: ObjectBridgeApi, key: string): LocationNode | null {
  if (!key) return null;
  const clean = cleanObjectName(key);
  return (
    listLocationObjects(api).find(
      (n) => cleanObjectName(n.canonical_key || '') === clean && !!n.canonical_key
    ) || null
  );
}

function findLocByDisplay(api: ObjectBridgeApi, name: string): LocationNode | null {
  const clean = cleanObjectName(name);
  if (!clean) return null;
  return listLocationObjects(api).find((n) => cleanObjectName(n.displayName || '') === clean) || null;
}

/**
 * Резолвер: 1) exact canonical_key; 2) clean display_name ↔ displayName; 3) null.
 */
export function resolveObjectLink(
  api: ObjectBridgeApi,
  input: { canonical_key?: string; displayName?: string; locationObjectId?: string } = {}
): ObjectLinkResult {
  let loc: LocationNode | null = null;
  let od: OdObjectLite | null = null;

  if (input.locationObjectId) {
    const n = api.getNode(input.locationObjectId);
    if (n && n.nodeType === 'object') loc = n;
  }

  const key = String(input.canonical_key || (loc && loc.canonical_key) || '').trim();
  const name = String(input.displayName || (loc && loc.displayName) || '').trim();

  if (key) {
    od = findOdByKey(key);
    if (!loc) loc = findLocByKey(api, key);
  }

  if (!od && name) od = findOdByDisplay(name);
  if (!loc && name) loc = findLocByDisplay(api, name);

  // Если нашли OD по имени, а loc ещё нет — попробуем key OD
  if (od && !loc && od.canonical_key) {
    loc = findLocByKey(api, od.canonical_key) || findLocByDisplay(api, od.display_name || od.name || '');
  }
  // Если loc есть с key — подтянуть OD по key
  if (loc && !od && loc.canonical_key) {
    od = findOdByKey(loc.canonical_key);
  }

  const linked = !!(
    od &&
    loc &&
    loc.canonical_key &&
    cleanObjectName(loc.canonical_key) === cleanObjectName(od.canonical_key || '')
  );

  return { od: od || null, locationObject: loc || null, linked };
}

export function listUnlinkedObjects(api: ObjectBridgeApi): {
  locationOnly: LocationNode[];
  odOnly: OdObjectLite[];
} {
  const locs = listLocationObjects(api);
  const ods = listOdActive();
  const locationOnly = locs.filter((n) => {
    const r = resolveObjectLink(api, {
      locationObjectId: n.id,
      canonical_key: n.canonical_key,
      displayName: n.displayName
    });
    return !r.linked;
  });
  const odOnly = ods.filter((o) => {
    const r = resolveObjectLink(api, {
      canonical_key: o.canonical_key,
      displayName: o.display_name || o.name
    });
    return !r.linked;
  });
  return { locationOnly, odOnly };
}

/** Проставить canonical_key на locations.object с выбранного OD (или matched). */
export async function linkLocationToOd(
  api: ObjectBridgeApi,
  locationObjectId: string,
  odCanonicalKey?: string
): Promise<ObjectLinkResult> {
  const loc = api.getNode(locationObjectId);
  if (!loc || loc.nodeType !== 'object') throw new Error('Нужен узел object');

  let key = String(odCanonicalKey || '').trim();
  if (!key) {
    const matched = resolveObjectLink(api, {
      locationObjectId,
      displayName: loc.displayName,
      canonical_key: loc.canonical_key
    });
    if (!matched.od || !matched.od.canonical_key) {
      throw new Error('Нет ObjectDirectory-peer для привязки');
    }
    key = matched.od.canonical_key;
  } else if (!findOdByKey(key)) {
    throw new Error('ObjectDirectory с таким canonical_key не найден');
  }

  await api.updateNode(locationObjectId, { canonical_key: key });
  return resolveObjectLink(api, { locationObjectId, canonical_key: key });
}

/** Создать OD из locations.object (admin). */
export async function createOdFromLocation(
  api: ObjectBridgeApi,
  locationObjectId: string
): Promise<ObjectLinkResult> {
  const loc = api.getNode(locationObjectId);
  if (!loc || loc.nodeType !== 'object') throw new Error('Нужен узел object');

  const od = _od();
  if (!od) throw new Error('ObjectDirectory недоступен');

  const displayName = String(loc.displayName || '').trim();
  if (!displayName) throw new Error('displayName пуст');

  let key = String(loc.canonical_key || '').trim() || cleanObjectName(displayName);
  const existing = findOdByKey(key) || findOdByDisplay(displayName);
  if (existing && existing.canonical_key) {
    if (!loc.canonical_key || cleanObjectName(loc.canonical_key) !== cleanObjectName(existing.canonical_key)) {
      await api.updateNode(locationObjectId, { canonical_key: existing.canonical_key });
    }
    return resolveObjectLink(api, {
      locationObjectId,
      canonical_key: existing.canonical_key
    });
  }

  if (typeof od.createFromLocation === 'function') {
    const created = await od.createFromLocation({ displayName, canonical_key: key });
    if (created && created.canonical_key) key = created.canonical_key;
  } else {
    throw new Error('ObjectDirectory.createFromLocation недоступен');
  }

  if (!loc.canonical_key || cleanObjectName(loc.canonical_key) !== cleanObjectName(key)) {
    await api.updateNode(locationObjectId, { canonical_key: key });
  }
  return resolveObjectLink(api, { locationObjectId, canonical_key: key });
}

/** Создать locations.object из OD (admin). */
export async function createLocationFromOd(
  api: ObjectBridgeApi,
  odCanonicalKey: string
): Promise<ObjectLinkResult> {
  const odObj = findOdByKey(odCanonicalKey);
  if (!odObj) throw new Error('ObjectDirectory не найден');

  const existing = resolveObjectLink(api, {
    canonical_key: odObj.canonical_key,
    displayName: odObj.display_name || odObj.name
  });
  if (existing.locationObject) {
    if (
      !existing.locationObject.canonical_key ||
      cleanObjectName(existing.locationObject.canonical_key) !==
        cleanObjectName(odObj.canonical_key || '')
    ) {
      await api.updateNode(existing.locationObject.id, {
        canonical_key: odObj.canonical_key || ''
      });
    }
    return resolveObjectLink(api, {
      locationObjectId: existing.locationObject.id,
      canonical_key: odObj.canonical_key
    });
  }

  const name = String(odObj.display_name || odObj.name || odObj.canonical_key || '').trim();
  if (!name) throw new Error('У OD нет display_name');
  const node = await api.createNode({
    nodeType: 'object',
    displayName: name,
    parentId: null,
    canonical_key: odObj.canonical_key || cleanObjectName(name)
  });
  return resolveObjectLink(api, {
    locationObjectId: node.id,
    canonical_key: node.canonical_key
  });
}

/** Универсальный ensure: link и/или create peer. */
export async function ensureCanonicalLink(
  api: ObjectBridgeApi,
  opts: {
    locationObjectId?: string;
    odCanonicalKey?: string;
    createMissing?: 'od' | 'location' | null;
  }
): Promise<ObjectLinkResult> {
  const createMissing = opts.createMissing || null;

  if (opts.locationObjectId && createMissing === 'od') {
    return createOdFromLocation(api, opts.locationObjectId);
  }
  if (opts.odCanonicalKey && createMissing === 'location') {
    return createLocationFromOd(api, opts.odCanonicalKey);
  }
  if (opts.locationObjectId) {
    return linkLocationToOd(api, opts.locationObjectId, opts.odCanonicalKey);
  }
  if (opts.odCanonicalKey) {
    const r = resolveObjectLink(api, { canonical_key: opts.odCanonicalKey });
    if (r.locationObject) {
      return linkLocationToOd(api, r.locationObject.id, opts.odCanonicalKey);
    }
    throw new Error('Нет locations.object для привязки — укажите createMissing:"location"');
  }
  throw new Error('Нужен locationObjectId или odCanonicalKey');
}

export function attachObjectBridge(api: ObjectBridgeApi) {
  return {
    resolveObjectLink: (input?: {
      canonical_key?: string;
      displayName?: string;
      locationObjectId?: string;
    }) => resolveObjectLink(api, input || {}),
    listUnlinkedObjects: () => listUnlinkedObjects(api),
    ensureCanonicalLink: (opts: {
      locationObjectId?: string;
      odCanonicalKey?: string;
      createMissing?: 'od' | 'location' | null;
    }) => ensureCanonicalLink(api, opts),
    linkLocationToOd: (locationObjectId: string, odCanonicalKey?: string) =>
      linkLocationToOd(api, locationObjectId, odCanonicalKey),
    createOdFromLocation: (locationObjectId: string) => createOdFromLocation(api, locationObjectId),
    createLocationFromOd: (odCanonicalKey: string) => createLocationFromOd(api, odCanonicalKey),
    cleanObjectName
  };
}
