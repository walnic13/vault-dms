// DMS browse client — verbatim port of vault-origin/src/shell/appHost/dmsMirrorClient.ts (the
// authoritative browse logic). BROWSE endpoints hit the stateless func-dms gateway
// (VITE_DMS_API_BASE_URL): listDmsSites → dms_list_sites (VAULT_DMS_API_SPEC §2.6, entire tenant
// DMS, permission-trimmed per user; clientLabel = site_name) and getDmsTree → dms_tree (§2.2,
// folders AND files). Single Authorization: Bearer (the signed-in user's OBO input token); the
// backend does the delegated Graph OBO server-side; no Graph scope on the FE; no body/token logged.

export type ShellTokenProvider = (scope?: string) => Promise<string | null>;

export interface DmsClient {
  clientKey: string; // ← site_id
  clientLabel: string; // ← site_name (the friendly name; NEVER web_url)
}

export interface DmsFolderNode {
  kind: 'folder';
  itemId: string;
  name: string;
  hasChildren: boolean;
}

export interface DmsFileNode {
  kind: 'file';
  itemId: string;
  name: string;
  webUrl: string;
  mimeType?: string;
  // WebDAV direct path (dms_tree §2.2 web_dav_url) — the URL a host uses to open the file in the
  // desktop Office app (ms-excel:ofe|u|). Optional: absent-safe; consumers fall back to webUrl.
  webDavUrl?: string;
}

export type DmsTreeNode = DmsFolderNode | DmsFileNode;

// Layer 2 — one changed DriveItem from dms_delta (§2.7). `deleted` items carry only item_id +
// parent_id; present items mirror the dms_tree projection so the client can patch its cached tree.
export interface DmsDeltaChange {
  item_id: string;
  parent_id: string | null;
  deleted: boolean;
  type?: 'folder' | 'file';
  name?: string;
  size?: number | null;
  date_modified?: string | null;
  web_url?: string | null;
  has_children?: boolean;
  mime_type?: string | null;
  web_dav_url?: string | null;
}

// Stale-while-revalidate snapshot (Walter 2026-07-19; Layer 1). The DMS is a LIVE mirror of
// SharePoint, so the browse functions below ALWAYS fetch fresh — nothing here serves stale data as
// authoritative. This last-known snapshot exists ONLY so a host can paint the previously-loaded
// tree INSTANTLY (no blank "Loading clients…" flash) while the fresh fetch runs in the background
// and patches it in place (reconciled by item id → only real SharePoint changes appear; expanded
// folders stay open). Populated on each SUCCESSFUL fetch; a transient failure never overwrites it.
//
// PERSISTENCE (Layer 1): the snapshot is mirrored to sessionStorage so it also survives a PAGE
// RELOAD within the same tab (the reload-from-scratch case), not just in-session context switches.
// sessionStorage is per-tab and cleared when the tab closes — the session boundary — and is wiped
// explicitly on sign-out via clearDmsCache(). This is OneDrive's "local cache for instant paint"
// layer; it never bypasses revalidation, so the mirror stays live. All access is try/guarded: if
// sessionStorage is unavailable (quota/privacy mode) the in-memory snapshot still works.
const SS_PREFIX = 'vault-dms:v1:';
// The persisted snapshot is NAMESPACED by the authenticated principal (Entra OID) so a different
// user signing in on the SAME tab can never instant-paint the prior user's cached DMS metadata.
// Until the principal is bound (setDmsPrincipal), sessionStorage I/O is disabled — in-memory only,
// the safe default. sessionStorage is still per-tab and cleared on tab close.
let principal = '';
const ssKey = (key: string) => `${SS_PREFIX}${principal}:${key}`;
function ssGet<T>(key: string): T | null {
  if (!principal) return null;
  try {
    const raw = sessionStorage.getItem(ssKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function ssSet(key: string, val: unknown): void {
  if (!principal) return;
  try {
    sessionStorage.setItem(ssKey(key), JSON.stringify(val));
  } catch {
    /* quota exceeded / storage unavailable — in-memory snapshot remains authoritative */
  }
}
function ssClear(): void {
  if (!principal) return;
  try {
    for (const k of ['sites', 'tree', 'expanded', 'deltaTokens', 'rootItemIds', 'driveIds']) sessionStorage.removeItem(ssKey(k));
  } catch {
    /* ignore */
  }
}

const treeKey = (siteId: string, parentItemId?: string) => `${siteId}|${parentItemId ?? ''}`;

// In-memory snapshot. NOT hydrated at module load (the principal is unknown then); it is hydrated
// per-principal by setDmsPrincipal, and populated on each successful fetch.
let sitesCache: DmsClient[] | null = null;
const treeCache = new Map<string, DmsTreeNode[]>();
const expandedNodes = new Set<string>();
// Layer 2: per-site opaque delta cursor (Graph deltaLink, round-tripped) + per-site drive root item
// id (the §2.2 dms_tree.parent.item_id — the SOLE contract-grounded source, used to map delta
// parent_id === root to the FE root cache key). Both are "metadata + delta cursor" per the DMS
// Snapshot Storage Exception (Governor §6.3); persisted per-principal like the rest of the snapshot.
const deltaTokens = new Map<string, string>();
const rootItemIds = new Map<string, string>();
// Layer 3: per-site drive id (the §2.2 dms_tree.drive_id) — used to ensure a Graph change-notification
// subscription (dms_subscribe) for the drive when a client is viewed. Persisted per-principal like the
// rest of the snapshot (metadata only — DMS Snapshot Storage Exception, Governor §6.3).
const driveIds = new Map<string, string>();

// Bind the cache to the authenticated principal (OID). On a new/first-seen principal, re-hydrate the
// in-memory snapshot from THAT principal's sessionStorage namespace (empty for a first-seen user) —
// so a same-tab user switch shows the new user's own view, never the prior user's. Idempotent.
export function setDmsPrincipal(id: string): void {
  const next = id || '';
  if (next === principal) return;
  principal = next;
  sitesCache = ssGet<DmsClient[]>('sites');
  treeCache.clear();
  for (const [k, v] of ssGet<[string, DmsTreeNode[]][]>('tree') ?? []) treeCache.set(k, v);
  expandedNodes.clear();
  for (const n of ssGet<string[]>('expanded') ?? []) expandedNodes.add(n);
  deltaTokens.clear();
  for (const [k, v] of ssGet<[string, string][]>('deltaTokens') ?? []) deltaTokens.set(k, v);
  rootItemIds.clear();
  for (const [k, v] of ssGet<[string, string][]>('rootItemIds') ?? []) rootItemIds.set(k, v);
  driveIds.clear();
  for (const [k, v] of ssGet<[string, string][]>('driveIds') ?? []) driveIds.set(k, v);
}

// Synchronous last-known snapshot for instant first paint (null ⇒ never loaded).
export function getCachedSites(): DmsClient[] | null {
  return sitesCache;
}
export function getCachedTree(siteId: string, parentItemId?: string): DmsTreeNode[] | null {
  return treeCache.get(treeKey(siteId, parentItemId)) ?? null;
}
// Which nodes the user has expanded (client site_id or folder item_id) — lets a host restore the
// EXACT tree shape on re-entry / reload (expanded folders stay open) instead of returning collapsed.
export function isNodeExpanded(nodeKey: string): boolean {
  return expandedNodes.has(nodeKey);
}
export function setNodeExpanded(nodeKey: string, expanded: boolean): void {
  if (expanded) expandedNodes.add(nodeKey);
  else expandedNodes.delete(nodeKey);
  ssSet('expanded', [...expandedNodes]);
}

// Layer 2 — per-site delta cursor.
export function getDeltaToken(siteId: string): string | null {
  return deltaTokens.get(siteId) ?? null;
}
export function setDeltaToken(siteId: string, token: string | null): void {
  if (token) deltaTokens.set(siteId, token);
  else deltaTokens.delete(siteId);
  ssSet('deltaTokens', [...deltaTokens]);
}
// Layer 2 — per-site drive root item id (the §2.2 dms_tree.parent.item_id). SOLE source for mapping
// a delta change whose parent_id === root to the FE root cache key.
export function getRootItemId(siteId: string): string | null {
  return rootItemIds.get(siteId) ?? null;
}
export function setRootItemId(siteId: string, itemId: string): void {
  if (itemId) {
    rootItemIds.set(siteId, itemId);
    ssSet('rootItemIds', [...rootItemIds]);
  }
}
// Layer 3 — per-site drive id (the §2.2 dms_tree.drive_id). Consumed by ensureDmsSubscription to
// create the Graph change-notification subscription for the drive being viewed.
export function getDriveId(siteId: string): string | null {
  return driveIds.get(siteId) ?? null;
}
export function setDriveId(siteId: string, driveId: string): void {
  if (driveId) {
    driveIds.set(siteId, driveId);
    ssSet('driveIds', [...driveIds]);
  }
}

export function clearDmsCache(): void {
  sitesCache = null;
  treeCache.clear();
  expandedNodes.clear();
  ssClear();
}

function dmsApiBase(): string | null {
  const baseUrl = import.meta.env.VITE_DMS_API_BASE_URL;
  if (!baseUrl) {
    console.warn('[DMS] VITE_DMS_API_BASE_URL not configured — DMS unavailable');
    return null;
  }
  return baseUrl;
}

// GET dms_list_sites (§2.6) — no params. clientLabel = site_name ?? site_id (never web_url).
export async function listDmsSites(getAccessToken: ShellTokenProvider): Promise<DmsClient[]> {
  const baseUrl = dmsApiBase();
  if (!baseUrl) return [];
  const token = await getAccessToken();
  if (!token) { console.warn('[DMS] no access token — cannot list DMS sites'); return []; }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/dms_list_sites`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    console.warn('[DMS] dms_list_sites request failed', e);
    return [];
  }
  if (!res.ok) { console.warn(`[DMS] dms_list_sites returned ${res.status}`); return []; }

  let json: { data?: { sites?: Array<{ site_id?: string; site_name?: string; web_url?: string }> } };
  try { json = await res.json(); } catch { console.warn('[DMS] dms_list_sites malformed body'); return []; }

  const sites = json.data?.sites ?? [];
  const mapped = sites
    .filter((s): s is { site_id: string; site_name?: string; web_url?: string } => !!s?.site_id)
    .map((s) => ({ clientKey: s.site_id, clientLabel: s.site_name ?? s.site_id }));
  sitesCache = mapped; // SWR snapshot: successful fetch only
  ssSet('sites', mapped);
  return mapped;
}

// GET dms_tree (§2.2) — siteId (required) + parentItemId (optional). Folders AND files; backend
// order preserved (folders before files, name ASC). type "file" → file node (web_url + mime_type).
export async function getDmsTree(
  siteId: string,
  parentItemId: string | undefined,
  getAccessToken: ShellTokenProvider,
): Promise<DmsTreeNode[]> {
  const baseUrl = dmsApiBase();
  if (!baseUrl) return [];
  const token = await getAccessToken();
  if (!token) { console.warn('[DMS] no access token — cannot load DMS tree'); return []; }

  const params = new URLSearchParams({ siteId });
  if (parentItemId) params.set('parentItemId', parentItemId);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/dms_tree?${params.toString()}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    console.warn('[DMS] dms_tree request failed', e);
    return [];
  }
  if (!res.ok) { console.warn(`[DMS] dms_tree returned ${res.status}`); return []; }

  let json: {
    data?: { dms_tree?: { drive_id?: string; parent?: { item_id?: string }; children?: Array<{ item_id?: string; name?: string; type?: string; has_children?: boolean; web_url?: string; mime_type?: string; web_dav_url?: string }> } };
  };
  try { json = await res.json(); } catch { console.warn('[DMS] dms_tree malformed body'); return []; }

  // Layer 2 root reconciliation: on a ROOT call (no parentItemId), record the drive root item id
  // (§2.2-guaranteed dms_tree.parent.item_id) — the SOLE source used to map delta parent_id === root
  // to the FE root cache key.
  if (parentItemId === undefined) {
    const rootId = json.data?.dms_tree?.parent?.item_id;
    if (typeof rootId === 'string' && rootId !== '') setRootItemId(siteId, rootId);
    // Layer 3: capture the drive id (already in the §2.2 response) so a client view can ensure a
    // Graph change-notification subscription for the drive.
    const driveId = json.data?.dms_tree?.drive_id;
    if (typeof driveId === 'string' && driveId !== '') setDriveId(siteId, driveId);
  }

  const children = json.data?.dms_tree?.children ?? [];
  const mapped = children
    .filter((n): n is { item_id: string; name?: string; type?: string; has_children?: boolean; web_url?: string; mime_type?: string; web_dav_url?: string } => !!n?.item_id)
    .map((n): DmsTreeNode =>
      n.type === 'file'
        ? { kind: 'file', itemId: n.item_id, name: n.name ?? '(unnamed file)', webUrl: n.web_url ?? '', mimeType: n.mime_type, webDavUrl: n.web_dav_url }
        : { kind: 'folder', itemId: n.item_id, name: n.name ?? '(unnamed folder)', hasChildren: !!n.has_children },
    );
  treeCache.set(treeKey(siteId, parentItemId), mapped); // SWR snapshot: successful fetch only
  ssSet('tree', [...treeCache]);
  return mapped;
}

// Folders first, then files, alphabetical within each (mirrors dms_tree's server order so a patched
// folder stays pixel-identical to a freshly-listed one).
function sortTreeNodes(nodes: DmsTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    const n = a.name.localeCompare(b.name);
    return n !== 0 ? n : a.itemId.localeCompare(b.itemId);
  });
}

// GET dms_delta (§2.7) — siteId + optional opaque cursor. Returns changed DriveItems + a fresh
// cursor; no cursor ⇒ full baseline. null on ANY non-2xx (incl. expired-token 410→500) so the
// caller drops its cursor and re-baselines. Delegated OBO → per-user trimming, same as dms_tree.
export async function getDmsDelta(
  siteId: string,
  deltaToken: string | null,
  getAccessToken: ShellTokenProvider,
): Promise<{ baseline: boolean; changes: DmsDeltaChange[]; deltaToken: string | null } | null> {
  const baseUrl = dmsApiBase();
  if (!baseUrl) return null;
  const token = await getAccessToken();
  if (!token) { console.warn('[DMS] no access token — cannot get delta'); return null; }

  const params = new URLSearchParams({ siteId });
  if (deltaToken) params.set('deltaToken', deltaToken);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/dms_delta?${params.toString()}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    console.warn('[DMS] dms_delta request failed', e);
    return null;
  }
  if (!res.ok) { console.warn(`[DMS] dms_delta returned ${res.status}`); return null; }

  let json: { data?: { dms_delta?: { baseline?: boolean; changes?: DmsDeltaChange[]; delta_token?: string | null } } };
  try { json = await res.json(); } catch { console.warn('[DMS] dms_delta malformed body'); return null; }

  const d = json.data?.dms_delta;
  if (!d) return null;
  return {
    baseline: !!d.baseline,
    changes: Array.isArray(d.changes) ? d.changes : [],
    deltaToken: typeof d.delta_token === 'string' ? d.delta_token : null,
  };
}

// Patch the cached tree in place from a delta change set. Each change's parent cache key: parent_id
// === the drive root item id ⇒ the FE root key (parentItemId undefined); else the parent folder.
// Only folders already in the cache are patched (unloaded folders lazy-load fresh). Copy-on-write
// per touched folder so getCachedTree returns a NEW array reference → consumers re-render.
export function applyDeltaToCache(siteId: string, changes: DmsDeltaChange[]): void {
  if (!changes.length) return;
  const rootId = getRootItemId(siteId);
  const touched = new Map<string, DmsTreeNode[]>();
  const working = (key: string): DmsTreeNode[] | null => {
    if (!touched.has(key)) {
      const cur = treeCache.get(key);
      if (!cur) return null;
      touched.set(key, cur.slice());
    }
    return touched.get(key)!;
  };

  for (const c of changes) {
    if (!c || typeof c.item_id !== 'string' || c.item_id === '') continue;
    const parentKey =
      c.parent_id && rootId && c.parent_id === rootId
        ? treeKey(siteId, undefined)
        : c.parent_id
          ? treeKey(siteId, c.parent_id)
          : null;
    if (!parentKey) continue; // the drive root item itself (parent_id null) is not a tree node
    const list = working(parentKey);
    if (!list) continue; // parent folder not loaded — ignored (lazy-loads fresh on first expand)

    const idx = list.findIndex((n) => n.itemId === c.item_id);
    if (c.deleted) {
      if (idx >= 0) list.splice(idx, 1);
      continue;
    }
    const node: DmsTreeNode =
      c.type === 'file'
        ? { kind: 'file', itemId: c.item_id, name: c.name ?? '(unnamed file)', webUrl: c.web_url ?? '', mimeType: c.mime_type ?? undefined, webDavUrl: c.web_dav_url ?? undefined }
        : { kind: 'folder', itemId: c.item_id, name: c.name ?? '(unnamed folder)', hasChildren: !!c.has_children };
    if (idx >= 0) list[idx] = node;
    else list.push(node);
  }

  if (touched.size === 0) return;
  for (const [key, list] of touched) {
    sortTreeNodes(list);
    treeCache.set(key, list);
  }
  ssSet('tree', [...treeCache]);
}

// Revalidate one site incrementally. Contract-safe root bootstrap: rootItemId's only source is the
// §2.2 dms_tree.parent.item_id, so if unknown, refresh root first (also refreshes the root listing).
// Then apply the delta and store the fresh cursor; any non-2xx drops the cursor to re-baseline next.
export async function revalidateSiteViaDelta(siteId: string, getAccessToken: ShellTokenProvider): Promise<void> {
  if (getRootItemId(siteId) === null) {
    await getDmsTree(siteId, undefined, getAccessToken);
  }
  const resp = await getDmsDelta(siteId, getDeltaToken(siteId), getAccessToken);
  if (!resp) {
    setDeltaToken(siteId, null);
    return;
  }
  applyDeltaToCache(siteId, resp.changes);
  setDeltaToken(siteId, resp.deltaToken);
}
