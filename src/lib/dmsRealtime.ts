// DMS realtime — Layer 3 live push. A receive-only Azure Web PubSub subscriber that, while the DMS
// is the active rail context, listens on the constant `dms-changes` broadcast group and fires
// `onDmsChanged` when the backend fans a `{ type:"dms_changed", drive_id }` signal (dms_notifications,
// on func-chat). Structural mirror of the deployed vault-origin chat realtime hook
// (src/shell/chat/chatRealtime.ts): a `WebPubSubClient` built with a `getClientAccessUrl` callback
// that re-negotiates on connect/reconnect, a single `group-message` handler, and best-effort
// start()/stop() lifecycle. Receive-only — the token carries no publish/group-mutation role, so this
// client can only RECEIVE; every DMS change signal is fanned server-side. Per-user SharePoint trimming
// is NOT here: the caller reacts to a ping by pulling its OWN delegated dms_delta (dmsClient).
import { useEffect } from 'react';
import { WebPubSubClient } from '@azure/web-pubsub-client';
import { getDriveId } from './dmsClient';
import type { ShellTokenProvider } from './dmsClient';

// Coalesce a burst of pings (e.g. a multi-file SharePoint change) into ONE revalidation.
const DEBOUNCE_MS = 400;

// GET dms_negotiate (vault-theo API Spec §2.13) on func-chat → a receive-only client-access URL. The
// realtime base is a SEPARATE env var from the DMS data base (VITE_DMS_API_BASE_URL → func-dms),
// because the Web PubSub hub + negotiate live on func-chat. Returns null on no-base / no-token /
// non-2xx / malformed → the hook then no-ops (realtime silently disabled; browse still works).
async function negotiateDmsRealtime(getAccessToken: ShellTokenProvider): Promise<string | null> {
  const baseUrl = import.meta.env.VITE_DMS_REALTIME_BASE_URL;
  if (!baseUrl) return null;
  const token = await getAccessToken();
  if (!token) return null;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/dms_negotiate`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let json: { data?: { url?: string } };
  try { json = await res.json(); } catch { return null; }
  const url = json.data?.url;
  return typeof url === 'string' && url !== '' ? url : null;
}

// Ensure a Graph change-notification subscription exists for the drive being viewed, so SharePoint
// changes actually push. Idempotent + once-per-site guarded — `dms_subscribe` itself is idempotent
// (returns refreshed:false when a live subscription exists); the `ensuredSites` guard avoids re-POSTing
// on every re-expand/re-render. Fire-and-forget: all failures swallowed so a subscribe failure never
// affects browse/delta. POSTs to func-chat (the realtime base, where dms_subscribe lives). No-op if the
// drive id is unknown (root not loaded yet) or the realtime base is unconfigured.
const ensuredSites = new Set<string>();
export async function ensureDmsSubscription(siteId: string, getAccessToken: ShellTokenProvider): Promise<void> {
  if (ensuredSites.has(siteId)) return;
  const baseUrl = import.meta.env.VITE_DMS_REALTIME_BASE_URL;
  if (!baseUrl) return;
  const driveId = getDriveId(siteId);
  if (!driveId) return;
  const token = await getAccessToken();
  if (!token) return;
  try {
    const res = await fetch(`${baseUrl}/api/dms_subscribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, driveId }),
    });
    if (res.ok) ensuredSites.add(siteId);
  } catch {
    /* subscribe unavailable — browse/delta revalidation unaffected */
  }
}

// Subscribe to DMS live-push while `active`. On a `dms_changed` ping, calls `onDmsChanged` (debounced).
// Connects only when active; tears down (stop + clear timer) when inactive or on unmount. All failures
// are swallowed — realtime is a best-effort enhancement over the fetch/delta revalidation path.
export function useDmsRealtime(getAccessToken: ShellTokenProvider, active: boolean, onDmsChanged: () => void): void {
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let client: WebPubSubClient | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fireDebounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; if (!stopped) onDmsChanged(); }, DEBOUNCE_MS);
    };

    try {
      client = new WebPubSubClient({
        getClientAccessUrl: async () => {
          const url = await negotiateDmsRealtime(getAccessToken);
          if (!url) throw new Error('dms negotiate unavailable');
          return url;
        },
      });
      client.on('group-message', (e) => {
        try {
          const data = e.message.data as unknown;
          const msg = typeof data === 'string' ? JSON.parse(data) : data;
          if (msg && typeof msg === 'object' && (msg as { type?: unknown }).type === 'dms_changed') {
            fireDebounced();
          }
        } catch {
          /* ignore malformed frames */
        }
      });
      void client.start().catch(() => { /* realtime unavailable — browse/delta revalidation still works */ });
    } catch {
      /* WebPubSubClient construction failed — no realtime; degrade gracefully */
    }

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      try { client?.stop(); } catch { /* ignore */ }
    };
  }, [getAccessToken, active, onDmsChanged]);
}
