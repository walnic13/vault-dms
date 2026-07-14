// DMS browse client — authenticated HTTP against the deployed func-dms gateway (VITE_DMS_API_BASE_URL).
// Mounted (in Origin / Sigma) the host injects getAccessToken; standalone (dms-dev harness) a minimal
// MSAL provider supplies it. Mirrors the vault-origin dmsMirrorClient idiom: await getAccessToken() →
// single Authorization: Bearer header → fetch func-dms → graceful []/null on any non-2xx (warn, no
// body/token logging). This is the DMS app calling its OWN backend (func-dms), OBO as the signed-in
// user; SharePoint stays the authority (security-trimmed).

export type ShellTokenProvider = (scope?: string) => Promise<string | null>;

export interface DmsSite { siteId: string; name: string; webUrl: string; driveId?: string; }
export interface DmsNode {
  itemId: string;
  name: string;
  type: 'folder' | 'file';
  driveId?: string;
  webUrl?: string;
  mimeType?: string;
  size?: number;
  dateModified?: string;
  hasChildren?: boolean;
}

export interface DmsClient {
  listSites(): Promise<DmsSite[]>;
  getTree(siteId: string, parentItemId?: string): Promise<{ driveId: string; children: DmsNode[] }>;
}

function apiBase(): string | null {
  const base = import.meta.env.VITE_DMS_API_BASE_URL;
  if (!base) {
    console.warn('[dmsClient] VITE_DMS_API_BASE_URL is not set — DMS calls are disabled.');
    return null;
  }
  return String(base).replace(/\/$/, '');
}

export function makeDmsClient(getAccessToken: ShellTokenProvider): DmsClient {
  async function authedFetch(path: string): Promise<any | null> {
    const base = apiBase();
    if (!base) return null;
    let token: string | null = null;
    try { token = await getAccessToken(); } catch { token = null; }
    if (!token) { console.warn('[dmsClient] no access token — skipping call'); return null; }
    try {
      const res = await fetch(`${base}${path}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { console.warn(`[dmsClient] ${path} → HTTP ${res.status}`); return null; }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch {
      console.warn(`[dmsClient] ${path} failed`);
      return null;
    }
  }

  return {
    async listSites() {
      const j = await authedFetch('/api/dms_list_sites');
      const raw = (j && j.data && (j.data.sites || (j.data.dms_list_sites && j.data.dms_list_sites.sites))) || [];
      return (raw as Record<string, any>[]).map((s) => ({
        siteId: String(s.site_id || s.siteId || s.id || ''),
        name: String(s.name || s.display_name || s.web_url || ''),
        webUrl: String(s.web_url || s.webUrl || ''),
        driveId: s.drive_id || s.driveId || undefined,
      }));
    },
    async getTree(siteId, parentItemId) {
      const qs = `siteId=${encodeURIComponent(siteId)}` + (parentItemId ? `&parentItemId=${encodeURIComponent(parentItemId)}` : '');
      const j = await authedFetch(`/api/dms_tree?${qs}`);
      const tree = (j && j.data && j.data.dms_tree) ? j.data.dms_tree : null;
      if (!tree) return { driveId: '', children: [] };
      const driveId = String(tree.drive_id || tree.driveId || '');
      const children: DmsNode[] = (Array.isArray(tree.children) ? tree.children : []).map((c: Record<string, any>) => ({
        itemId: String(c.item_id || c.itemId || ''),
        name: String(c.name || ''),
        type: c.type === 'file' ? 'file' : 'folder',
        driveId,
        webUrl: c.web_url || c.webUrl || undefined,
        mimeType: c.mime_type || c.mimeType || undefined,
        size: typeof c.size === 'number' ? c.size : undefined,
        dateModified: c.date_modified || c.dateModified || undefined,
        hasChildren: c.has_children ?? c.hasChildren ?? undefined,
      }));
      return { driveId, children };
    },
  };
}
