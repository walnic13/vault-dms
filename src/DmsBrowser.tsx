// DmsBrowser — the federated `dmsApp/DmsBrowser` surface. A 1/10-RAIL-ONLY file tree (no 9/10):
// when the host provides a navSlot it PORTALS the tree in (Origin/Sigma 1/10); standalone it renders
// inline in a rail. Browses the tenant DMS via func-dms (dms_list_sites → dms_tree) as the signed-in
// user (OBO). File clicks are handed to the host (onOpenFile) — default opens the SharePoint web_url.
// Origin-native styling (shared `C` tokens + SANS, Theo Sidebar idiom). First cut — the faithful
// DmsMirror parity + picker modes land via the governed FE VEP.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, SANS } from './theme';
import { makeDmsClient, ShellTokenProvider, DmsClient, DmsSite, DmsNode } from './lib/dmsClient';

const STYLE_BLOCK = `
  .dms-scroll::-webkit-scrollbar { width: 10px; }
  .dms-scroll::-webkit-scrollbar-thumb { background: ${C.line2}; border-radius: 8px; border: 3px solid transparent; background-clip: padding-box; }
  .dms-row:hover { background: rgba(0,0,0,0.04); }
`;

export interface DmsBrowserProps {
  navSlot?: HTMLElement | null;
  getAccessToken: ShellTokenProvider;
  onOpenFile?: (node: DmsNode) => void;
  onPickFolder?: (siteId: string, node: DmsNode) => void;
}

const rowStyle = (depth: number): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 10px', paddingLeft: 10 + depth * 14,
  borderRadius: 8, fontSize: 13.5, color: C.ink2, cursor: 'pointer',
  fontFamily: SANS, userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
});

function FolderNode({ client, siteId, node, depth, onOpenFile }: {
  client: DmsClient; siteId: string; node: DmsNode; depth: number; onOpenFile: (n: DmsNode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<DmsNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && children === null && !loading) {
      setLoading(true);
      const r = await client.getTree(siteId, node.itemId);
      setChildren(r.children);
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="dms-row" style={rowStyle(depth)} onClick={toggle} title={node.name}>
        <span style={{ color: C.ink3, width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <span style={{ flexShrink: 0 }}>📁</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
      </div>
      {open && (
        loading && children === null
          ? <div style={{ ...rowStyle(depth + 1), color: C.ink3, cursor: 'default' }}>Loading…</div>
          : <NodeList client={client} siteId={siteId} nodes={children || []} depth={depth + 1} onOpenFile={onOpenFile} />
      )}
    </div>
  );
}

function NodeList({ client, siteId, nodes, depth, onOpenFile }: {
  client: DmsClient; siteId: string; nodes: DmsNode[]; depth: number; onOpenFile: (n: DmsNode) => void;
}) {
  if (nodes.length === 0) return <div style={{ ...rowStyle(depth), color: C.ink3, cursor: 'default' }}>Empty</div>;
  return (
    <>
      {nodes.map((n) => n.type === 'folder'
        ? <FolderNode key={n.itemId} client={client} siteId={siteId} node={n} depth={depth} onOpenFile={onOpenFile} />
        : (
          <div key={n.itemId} className="dms-row" style={rowStyle(depth)} onClick={() => onOpenFile(n)} title={n.name}>
            <span style={{ width: 12, flexShrink: 0 }} />
            <span style={{ flexShrink: 0 }}>📄</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</span>
          </div>
        ))}
    </>
  );
}

function SiteNode({ client, site, onOpenFile }: { client: DmsClient; site: DmsSite; onOpenFile: (n: DmsNode) => void }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<DmsNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && children === null && !loading) {
      setLoading(true);
      const r = await client.getTree(site.siteId);
      setChildren(r.children);
      setLoading(false);
    }
  };
  return (
    <div>
      <div className="dms-row" style={{ ...rowStyle(0), color: C.ink, fontWeight: 600 }} onClick={toggle} title={site.name}>
        <span style={{ color: C.ink3, width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <span style={{ flexShrink: 0 }}>🗂️</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.name}</span>
      </div>
      {open && (
        loading && children === null
          ? <div style={{ ...rowStyle(1), color: C.ink3, cursor: 'default' }}>Loading…</div>
          : <NodeList client={client} siteId={site.siteId} nodes={children || []} depth={1} onOpenFile={onOpenFile} />
      )}
    </div>
  );
}

function BrowserTree({ getAccessToken, onOpenFile, onPickFolder, fluid }: {
  getAccessToken: ShellTokenProvider; onOpenFile: (n: DmsNode) => void; onPickFolder?: (siteId: string, n: DmsNode) => void; fluid: boolean;
}) {
  const client = useMemo(() => makeDmsClient(getAccessToken), [getAccessToken]);
  const [sites, setSites] = useState<DmsSite[] | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => { let live = true; client.listSites().then((s) => { if (live) setSites(s); }); return () => { live = false; }; }, [client]);
  void onPickFolder;

  const filtered = (sites || []).filter((s) => !query.trim() || (s.name + s.webUrl).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <aside className="dms-scroll" style={{
      width: fluid ? '100%' : 300, height: '100%', display: 'flex', flexDirection: 'column',
      background: C.sidebar, borderRight: fluid ? 'none' : `1px solid ${C.line}`, fontFamily: SANS, color: C.ink, overflow: 'hidden',
    }}>
      <style>{STYLE_BLOCK}</style>
      <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase', color: C.ink3, fontWeight: 600 }}>Vault Files</span>
      </div>
      <div style={{ padding: '0 10px 10px', flexShrink: 0 }}>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter sites…"
          style={{ width: '100%', padding: '7px 10px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, background: C.card, color: C.ink, fontFamily: SANS, outline: 'none' }}
        />
      </div>
      <div className="dms-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 6px 10px' }}>
        {sites === null
          ? <div style={{ ...rowStyle(0), color: C.ink3, cursor: 'default' }}>Loading your files…</div>
          : filtered.length === 0
            ? <div style={{ ...rowStyle(0), color: C.ink3, cursor: 'default' }}>No sites.</div>
            : filtered.map((s) => <SiteNode key={s.siteId} client={client} site={s} onOpenFile={onOpenFile} />)}
      </div>
    </aside>
  );
}

export default function DmsBrowser({ navSlot, getAccessToken, onOpenFile, onPickFolder }: DmsBrowserProps) {
  const open = (n: DmsNode) => {
    if (onOpenFile) { onOpenFile(n); return; }
    if (n.webUrl) window.open(n.webUrl, '_blank', 'noopener');
  };
  const tree = <BrowserTree getAccessToken={getAccessToken} onOpenFile={open} onPickFolder={onPickFolder} fluid={!!navSlot} />;

  if (navSlot) return createPortal(tree, navSlot);

  // Standalone (dms-dev harness): the 1/10 rail on the left, an empty 9/10 to its right
  // (DMS is a rail-only app — no 9/10 by design).
  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', fontFamily: SANS, background: C.bg, overflow: 'hidden' }}>
      {tree}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink3, fontSize: 13 }}>
        DMS is a rail-only app — files open in SharePoint.
      </main>
    </div>
  );
}
