// DmsBrowser — the federated `dmsApp/DmsBrowser` surface. A 1/10-RAIL-ONLY file tree (no 9/10):
// portals into a host navSlot (Origin/Sigma) or renders standalone. This is a VERBATIM port of
// vault-origin/src/shell/dms/DmsMirror.tsx (TreeNode + tree) — same Tailwind `theo-*` classes,
// lucide-react icons, indent, and clientLabel (site_name) rendering — so it is pixel-identical to
// Origin's "Vault Files" rail. Adapted only for the remote contract: the host injects getAccessToken
// and handles file clicks (onOpenFile) + folder picks (pickMode/onPickFolder); the shell owns the
// rail's collapse/drag chrome. Browses func-dms (dms_list_sites / dms_tree) OBO.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, ChevronRight, Database, File, FileArchive, FileSpreadsheet, FileText,
  Folder, FolderOpen, Image, Loader2, Presentation,
} from 'lucide-react';
import { getCachedSites, getCachedTree, getDmsTree, isNodeExpanded, listDmsSites, revalidateSiteViaDelta, setDmsPrincipal, setNodeExpanded } from './lib/dmsClient';
import type { ShellTokenProvider, DmsClient, DmsTreeNode, DmsFileNode } from './lib/dmsClient';

// Best-effort OID from the access token payload — used ONLY to namespace the client-side snapshot
// cache per authenticated principal (never for auth; the backend still validates the token). No
// signature check needed for a cache key. base64url-safe; returns '' on anything unexpected.
function oidFromToken(token: string | null): string {
  if (!token) return '';
  try {
    const part = token.split('.')[1];
    if (!part) return '';
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return (json.oid as string) || (json.sub as string) || '';
  } catch {
    return '';
  }
}

// Re-show revalidation nonce (App Host / VEP-B): the host keeps the DMS tree MOUNTED and merely
// CSS-hides it when Vault Files is not the active rail context, so DmsBrowser never remounts on
// re-show. When the host flips `active` back to true, DmsBrowser bumps this nonce; the mounted
// Tree + every expanded TreeNode revalidate against live SharePoint and patch in place. This is the
// re-show signal that keeps the mirror live under CSS-hidden re-entry (mount stability preserved).
// 0 = initial mount (handled by the per-component mount fetch); >0 = a genuine re-show.
const RevalidateContext = createContext(0);
// Layer 2: Tree bumps this AFTER it has revalidated the site(s) via dms_delta and patched the shared
// cache. Expanded TreeNodes consume it to RE-READ their patched children from getCachedTree — no
// per-node dms_tree refetch on re-show (the delta already fetched, once per site).
const CacheVersionContext = createContext(0);

// File-type icon decoration (UI only) from the file's OWN extension — a presentational hint, not
// recognition/routing/taxonomy. (Ported verbatim from DmsMirror.)
function fileTypeIcon(name: string): { Icon: typeof File; cls: string } {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  switch (ext) {
    case 'xlsx': case 'xls': case 'xlsm': case 'xlsb': case 'csv':
      return { Icon: FileSpreadsheet, cls: 'text-green-600' };
    case 'doc': case 'docx': case 'docm': case 'rtf': case 'txt':
      return { Icon: FileText, cls: 'text-blue-600' };
    case 'ppt': case 'pptx': case 'pptm':
      return { Icon: Presentation, cls: 'text-orange-500' };
    case 'pdf':
      return { Icon: FileText, cls: 'text-red-600' };
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'bmp': case 'svg': case 'webp':
      return { Icon: Image, cls: 'text-purple-500' };
    case 'zip': case '7z': case 'rar':
      return { Icon: FileArchive, cls: 'text-amber-600' };
    default:
      return { Icon: File, cls: 'text-theo-ink3' };
  }
}

interface TreeNodeProps {
  siteId: string;
  itemId?: string;
  label: string;
  hasChildren: boolean;
  depth: number;
  kind: 'client' | 'folder' | 'file';
  getAccessToken: ShellTokenProvider;
  onOpenFile: (node: DmsFileNode) => void;
  pickMode: boolean;
  onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void;
  parentName?: string;
  webUrl?: string;
  mimeType?: string;
  webDavUrl?: string;
}

function TreeNode({ siteId, itemId, label, hasChildren, depth, kind, getAccessToken, onOpenFile, pickMode, onPickFolder, parentName, webUrl, mimeType, webDavUrl }: TreeNodeProps) {
  // Node identity for expansion persistence: folders by item_id, client roots by site_id.
  const nodeKey = itemId ?? siteId;
  // SWR + view-preservation: restore expansion from the session snapshot so the tree returns EXACTLY
  // as the user left it; seed children from the last-known snapshot so it paints instantly (no
  // per-folder "Loading…" flash). A background revalidate then patches in place (reconciled by
  // itemId → new/removed files appear, expanded subfolders stay).
  const [expanded, setExpanded] = useState(() => isNodeExpanded(nodeKey));
  const [children, setChildren] = useState<DmsTreeNode[] | null>(() => getCachedTree(siteId, itemId));
  const [loading, setLoading] = useState(false);
  const cacheVersion = useContext(CacheVersionContext);

  const loadChildren = useCallback(async () => {
    // Spinner only when we have nothing cached to show; otherwise the cached children stay visible
    // while the fresh fetch patches them in place (reconciled by itemId → expanded subfolders stay).
    if (getCachedTree(siteId, itemId) === null) setLoading(true);
    const nodes = await getDmsTree(siteId, itemId, getAccessToken);
    setChildren(nodes);
    setLoading(false);
  }, [siteId, itemId, getAccessToken]);

  // On (re)mount, revalidate any node restored as expanded — cached children (if any) already show,
  // this refreshes them against live SharePoint. Mount-only; expand/collapse is handled by toggle.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (didMountRef.current) return;
    didMountRef.current = true;
    if (expanded) void loadChildren();
  }, [expanded, loadChildren]);

  // Re-show revalidation (Layer 2): Tree has revalidated the site via dms_delta and patched the
  // shared cache; re-READ our children from the patched cache (new array ref → re-render). No
  // per-node dms_tree refetch — the delta already fetched once for the whole site.
  useEffect(() => {
    if (cacheVersion === 0) return;
    setChildren(getCachedTree(siteId, itemId));
  }, [cacheVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      setNodeExpanded(nodeKey, next); // persist for re-entry
      // Revalidate on every expand (live mirror); cached children (if any) are already shown.
      if (next && !loading) void loadChildren();
      return next;
    });
  }, [nodeKey, loading, loadChildren]);

  const onLabelClick = useCallback(() => {
    if (kind === 'file') {
      onOpenFile({ kind: 'file', itemId: itemId ?? '', name: label, webUrl: webUrl ?? '', mimeType, webDavUrl });
      return;
    }
    if (kind === 'folder' && pickMode && itemId && onPickFolder) {
      onPickFolder({ siteId, itemId, name: label, parentName });
      return;
    }
    toggle();
  }, [kind, pickMode, onPickFolder, itemId, siteId, label, parentName, toggle, onOpenFile, webUrl, mimeType, webDavUrl]);

  const canExpand = kind === 'client' || (kind === 'folder' && hasChildren);
  const fileIcon = kind === 'file' ? fileTypeIcon(label) : null;
  const NodeIcon =
    kind === 'client' ? Database
      : kind === 'file' ? fileIcon!.Icon
        : expanded && children?.length ? FolderOpen : Folder;
  const iconCls =
    kind === 'client' ? 'text-indigo-600' : kind === 'file' ? fileIcon!.cls : 'text-amber-500';
  const selectable = kind === 'folder' && pickMode;
  const indent = 4 + depth * 12;

  return (
    <div role="treeitem" aria-expanded={canExpand ? expanded : undefined} aria-label={label}>
      <div
        className={`group flex items-center gap-1 rounded-md transition-colors ${
          selectable ? 'hover:bg-theo-coralSoft' : 'hover:bg-theo-surface'
        } ${expanded && kind !== 'file' ? 'bg-theo-surface' : ''}`}
        style={{ paddingLeft: `${indent}px` }}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={!canExpand}
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          className="p-0.5 flex-shrink-0 rounded text-theo-ink3 hover:text-theo-ink disabled:opacity-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-theo-coral"
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={onLabelClick}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left py-1.5 pr-2 rounded text-sm text-theo-ink2 hover:text-theo-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-theo-coral"
          title={selectable ? `Select folder: ${label}` : label}
        >
          <NodeIcon className={`w-4 h-4 flex-shrink-0 ${iconCls}`} />
          <span className={`truncate ${kind === 'client' ? 'font-semibold text-theo-ink' : ''}`}>{label}</span>
        </button>
      </div>

      {expanded && (
        <div role="group">
          {loading && (
            <div className="flex items-center gap-1 text-xs text-theo-ink3 py-1" style={{ paddingLeft: `${indent + 12}px` }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          )}
          {!loading && children?.length === 0 && (
            <div className="text-xs text-theo-ink3 py-1" style={{ paddingLeft: `${indent + 12}px` }}>
              (empty folder)
            </div>
          )}
          {!loading && children?.map((child) => (
            <TreeNode
              key={child.itemId}
              siteId={siteId}
              itemId={child.itemId}
              label={child.name}
              hasChildren={child.kind === 'folder' ? child.hasChildren : false}
              depth={depth + 1}
              kind={child.kind}
              webUrl={child.kind === 'file' ? child.webUrl : undefined}
              mimeType={child.kind === 'file' ? child.mimeType : undefined}
              webDavUrl={child.kind === 'file' ? child.webDavUrl : undefined}
              getAccessToken={getAccessToken}
              onOpenFile={onOpenFile}
              pickMode={pickMode}
              onPickFolder={onPickFolder}
              parentName={label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface DmsBrowserProps {
  navSlot?: HTMLElement | null;
  getAccessToken: ShellTokenProvider;
  onOpenFile?: (node: DmsFileNode) => void;
  pickMode?: boolean;
  onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void;
  // Re-show signal (optional; App Host / VEP-B). A host that keeps the tree MOUNTED and CSS-hides it
  // (Origin app-rail) sets this true when Vault Files is the active context. Each false→true flip
  // revalidates the mounted tree against live SharePoint (no remount needed). Omitted/false ⇒ the
  // tree still revalidates on its own mount + on folder expand (back-compatible for other hosts).
  active?: boolean;
}

function Tree({ getAccessToken, onOpenFile, pickMode, onPickFolder, showHeader }: {
  getAccessToken: ShellTokenProvider;
  onOpenFile: (n: DmsFileNode) => void;
  pickMode: boolean;
  onPickFolder?: (p: { siteId: string; itemId: string; name: string; parentName?: string }) => void;
  showHeader: boolean;
}) {
  // Stale-while-revalidate: paint the last-known client list INSTANTLY on (re)mount so there is no
  // blank "Loading clients…" flash when a host re-shows the tree, then always refetch to keep the
  // mirror live and patch in place (React reconciles clients by clientKey → unchanged clients keep
  // their expansion; only real SharePoint changes appear/disappear).
  const [clients, setClients] = useState<DmsClient[] | null>(() => getCachedSites());
  const [loading, setLoading] = useState(getCachedSites() === null);
  const revalidateNonce = useContext(RevalidateContext);
  // Bumped after a delta revalidation patches the shared cache; expanded TreeNodes re-read (below).
  const [cacheVersion, setCacheVersion] = useState(0);

  useEffect(() => {
    let active = true;
    // Spinner only when nothing is cached to show; a cached snapshot stays visible during revalidate.
    if (getCachedSites() === null) setLoading(true);
    void listDmsSites(getAccessToken).then((list) => { if (active) { setClients(list); setLoading(false); } });
    return () => { active = false; };
  }, [getAccessToken]);

  // Re-show revalidation (Layer 2; nonce > 0): the host re-showed Vault Files without a remount.
  // Refetch the site list (patched by clientKey), then — per EXPANDED client site — run ONE
  // dms_delta (revalidateSiteViaDelta) that patches the cached tree in place, instead of N per-node
  // dms_tree re-lists. Bump cacheVersion so expanded TreeNodes re-read their patched children. Nonce
  // 0 is the initial mount (covered above); first-load of a folder stays lazy dms_tree in TreeNode.
  useEffect(() => {
    if (revalidateNonce === 0) return;
    let active = true;
    void (async () => {
      const list = await listDmsSites(getAccessToken);
      if (!active) return;
      setClients(list);
      const expanded = list.filter((c) => isNodeExpanded(c.clientKey));
      await Promise.all(expanded.map((c) => revalidateSiteViaDelta(c.clientKey, getAccessToken)));
      if (!active) return;
      setCacheVersion((v) => v + 1);
    })();
    return () => { active = false; };
  }, [revalidateNonce, getAccessToken]);

  return (
    <CacheVersionContext.Provider value={cacheVersion}>
    <div className="flex flex-col h-full min-h-0 font-sans text-theo-ink">
      {/* The browser's own header shows only when standalone; when hosted (navSlot present) the host
          shell provides the collapsible "Vault Files" section header, so we suppress this one. */}
      {showHeader && (
        <div className="flex items-center gap-1.5 px-2 py-2 flex-shrink-0">
          <Database className="w-3.5 h-3.5 text-theo-ink3 flex-shrink-0" />
          <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-widest text-theo-ink3">Vault Files</span>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2 text-sm" data-testid="dms-browser">
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-theo-ink3 px-2 py-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading clients…
          </div>
        )}
        {!loading && clients?.length === 0 && (
          <p className="text-xs text-theo-ink3 px-2 py-2">No accessible clients.</p>
        )}
        {!loading && !!clients?.length && (
          <div role="tree" aria-label="DMS mirror">
            {clients.map((c) => (
              <TreeNode
                key={c.clientKey}
                siteId={c.clientKey}
                label={c.clientLabel}
                hasChildren
                depth={0}
                kind="client"
                getAccessToken={getAccessToken}
                onOpenFile={onOpenFile}
                pickMode={pickMode}
                onPickFolder={onPickFolder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </CacheVersionContext.Provider>
  );
}

export default function DmsBrowser({ navSlot, getAccessToken, onOpenFile, pickMode, onPickFolder, active }: DmsBrowserProps) {
  const open = (n: DmsFileNode) => {
    if (onOpenFile) { onOpenFile(n); return; }
    if (n.webUrl) window.open(n.webUrl, '_blank', 'noopener,noreferrer');
  };
  // Bind the snapshot cache to the signed-in principal (OID) BEFORE seeding the tree from it, so a
  // same-tab user switch can never instant-paint the prior user's cached metadata. Held for one
  // token-decode tick (no network); the slot stays empty (as it was) until the principal is bound,
  // then Tree seeds from the correctly-namespaced snapshot. Only affects initial mount — the mounted
  // tree persists across context switches (re-show uses the `active` nonce).
  const [principalReady, setPrincipalReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void getAccessToken()
      // Guard the principal mutation itself (not just the ready flag): a stale token promise from a
      // superseded auth context / unmounted instance must NOT rebind the module-global cache
      // principal after a user switch.
      .then((tok) => { if (alive) setDmsPrincipal(oidFromToken(tok)); })
      .finally(() => { if (alive) setPrincipalReady(true); });
    return () => { alive = false; };
  }, [getAccessToken]);

  // Re-show revalidation: each false→true flip of `active` bumps the nonce so the mounted Tree +
  // expanded TreeNodes refetch against live SharePoint (the CSS-hidden re-entry fix; no remount).
  const [revalidateNonce, setRevalidateNonce] = useState(0);
  useEffect(() => {
    if (active) setRevalidateNonce((n) => n + 1);
  }, [active]);

  // Gate: hold the tree until the principal is bound (all hooks above run first — order stable).
  if (!principalReady) return navSlot ? createPortal(null, navSlot) : null;

  const tree = (
    <RevalidateContext.Provider value={revalidateNonce}>
      <Tree getAccessToken={getAccessToken} onOpenFile={open} pickMode={!!pickMode} onPickFolder={onPickFolder} showHeader={!navSlot} />
    </RevalidateContext.Provider>
  );

  // Hosted: the shell owns the collapsible/draggable rail; we portal the tree into its navSlot.
  if (navSlot) return createPortal(tree, navSlot);

  // Standalone (dms-dev harness): a fixed 1/10 rail (the shell's drag/collapse is not our concern
  // here) + an empty 9/10 — DMS is a rail-only app.
  return (
    <div className="h-screen w-full flex bg-theo-bg overflow-hidden">
      <aside className="w-[300px] flex-shrink-0 border-r border-theo-line bg-theo-surface overflow-hidden">
        {tree}
      </aside>
      <main className="flex-1 min-w-0 flex items-center justify-center text-theo-ink3 text-sm">
        DMS is a rail-only app — files open in SharePoint.
      </main>
    </div>
  );
}
