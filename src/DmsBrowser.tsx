// DmsBrowser — the federated `dmsApp/DmsBrowser` surface. A 1/10-RAIL-ONLY file tree (no 9/10):
// portals into a host navSlot (Origin/Sigma) or renders standalone. This is a VERBATIM port of
// vault-origin/src/shell/dms/DmsMirror.tsx (TreeNode + tree) — same Tailwind `theo-*` classes,
// lucide-react icons, indent, and clientLabel (site_name) rendering — so it is pixel-identical to
// Origin's "Vault Files" rail. Adapted only for the remote contract: the host injects getAccessToken
// and handles file clicks (onOpenFile) + folder picks (pickMode/onPickFolder); the shell owns the
// rail's collapse/drag chrome. Browses func-dms (dms_list_sites / dms_tree) OBO.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, ChevronRight, Database, File, FileArchive, FileSpreadsheet, FileText,
  Folder, FolderOpen, Image, Loader2, Presentation,
} from 'lucide-react';
import { getDmsTree, listDmsSites } from './lib/dmsClient';
import type { ShellTokenProvider, DmsClient, DmsTreeNode, DmsFileNode } from './lib/dmsClient';

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
  onPickFolder?: (pick: { siteId: string; itemId: string; name: string }) => void;
  webUrl?: string;
  mimeType?: string;
}

function TreeNode({ siteId, itemId, label, hasChildren, depth, kind, getAccessToken, onOpenFile, pickMode, onPickFolder, webUrl, mimeType }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DmsTreeNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    const nodes = await getDmsTree(siteId, itemId, getAccessToken);
    setChildren(nodes);
    setLoading(false);
  }, [siteId, itemId, getAccessToken]);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      if (next && children === null && !loading) void loadChildren();
      return next;
    });
  }, [children, loading, loadChildren]);

  const onLabelClick = useCallback(() => {
    if (kind === 'file') {
      onOpenFile({ kind: 'file', itemId: itemId ?? '', name: label, webUrl: webUrl ?? '', mimeType });
      return;
    }
    if (kind === 'folder' && pickMode && itemId && onPickFolder) {
      onPickFolder({ siteId, itemId, name: label });
      return;
    }
    toggle();
  }, [kind, pickMode, onPickFolder, itemId, siteId, label, toggle, onOpenFile, webUrl, mimeType]);

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
              getAccessToken={getAccessToken}
              onOpenFile={onOpenFile}
              pickMode={pickMode}
              onPickFolder={onPickFolder}
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
  onPickFolder?: (pick: { siteId: string; itemId: string; name: string }) => void;
}

function Tree({ getAccessToken, onOpenFile, pickMode, onPickFolder, showHeader }: {
  getAccessToken: ShellTokenProvider;
  onOpenFile: (n: DmsFileNode) => void;
  pickMode: boolean;
  onPickFolder?: (p: { siteId: string; itemId: string; name: string }) => void;
  showHeader: boolean;
}) {
  const [clients, setClients] = useState<DmsClient[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listDmsSites(getAccessToken).then((list) => { if (active) { setClients(list); setLoading(false); } });
    return () => { active = false; };
  }, [getAccessToken]);

  return (
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
  );
}

export default function DmsBrowser({ navSlot, getAccessToken, onOpenFile, pickMode, onPickFolder }: DmsBrowserProps) {
  const open = (n: DmsFileNode) => {
    if (onOpenFile) { onOpenFile(n); return; }
    if (n.webUrl) window.open(n.webUrl, '_blank', 'noopener,noreferrer');
  };
  const tree = <Tree getAccessToken={getAccessToken} onOpenFile={open} pickMode={!!pickMode} onPickFolder={onPickFolder} showHeader={!navSlot} />;

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
