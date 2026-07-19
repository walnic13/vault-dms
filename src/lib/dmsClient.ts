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
    for (const k of ['sites', 'tree', 'expanded']) sessionStorage.removeItem(ssKey(k));
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
    data?: { dms_tree?: { children?: Array<{ item_id?: string; name?: string; type?: string; has_children?: boolean; web_url?: string; mime_type?: string; web_dav_url?: string }> } };
  };
  try { json = await res.json(); } catch { console.warn('[DMS] dms_tree malformed body'); return []; }

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
