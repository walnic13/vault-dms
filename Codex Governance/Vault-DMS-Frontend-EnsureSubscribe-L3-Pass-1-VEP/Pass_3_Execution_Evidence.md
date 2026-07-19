# Vault DMS FE L3 EnsureSubscribe — Pass-3 Execution Evidence

Executed against the Codex-APPROVED Pass-1 plan (`INDEX.md`, F-P7). Branch `development`.

## Changes applied (exactly F-P7)
1. **`src/lib/dmsClient.ts`** — added `driveIds` Map + `getDriveId(siteId)` / `setDriveId(siteId, driveId)` (namespaced `ss` key `driveIds`; hydrated in `setDmsPrincipal`; cleared via `ssClear`), mirroring the `rootItemIds` idiom. `getDmsTree`'s root branch (`parentItemId === undefined`) now also reads `json.data.dms_tree.drive_id` → `setDriveId` (added `drive_id?: string` to the response type). `getDmsTree` signature UNCHANGED.
2. **`src/lib/dmsRealtime.ts`** — added `const ensuredSites = new Set<string>()` + `ensureDmsSubscription(siteId, getAccessToken)`: guards on `ensuredSites` + realtime base + `getDriveId(siteId)` + token; POSTs `{ siteId, driveId }` to `${VITE_DMS_REALTIME_BASE_URL}/api/dms_subscribe` with Bearer; adds to `ensuredSites` on 2xx; all failures swallowed. Imports `getDriveId` from `./dmsClient`. `useDmsRealtime`/`negotiateDmsRealtime` UNCHANGED.
3. **`src/DmsBrowser.tsx`** — imported `ensureDmsSubscription`; in `TreeNode.loadChildren`, after `setChildren`/`setLoading`, `if (kind === 'client') void ensureDmsSubscription(siteId, getAccessToken)` (added `kind` to the `useCallback` deps). No prop/render change.

## Verification
- **`vite build`**: GREEN — `✓ built in ~3s`; federated `DmsBrowser` chunk built (`__federation_expose_DmsBrowser-*.js`, 69.26 kB). No TS/lint errors.
- No new dependency (`@azure/web-pubsub-client` already present from MS3b); env unchanged (`VITE_DMS_REALTIME_BASE_URL` already baked in both SWA workflows).
- **Deploy**: push to `development` → `azure-static-web-apps-development.yml` rebuilds + uploads; Origin/Sigma consume the updated `remoteEntry.js`.

## Walter dev-SWA re-test (once the SWA build finishes)
1. Open Vault Origin (dev) → Vault Files, **expand a client drive** → DevTools Network shows one `dms_subscribe` to func-chat (201 first time; 200 `refreshed:false` thereafter) + the ws connection (from MS3b).
2. In SharePoint, delete/rename/add a file **in that expanded drive**.
3. Within a few seconds the tree patches **in place — no manual refresh** (a `dms_delta` fires per expanded site on the ping).
4. Re-expanding the same client does NOT re-POST `dms_subscribe` (once-per-site guard).

## Boundary preservation
App-level subscription (one per drive, shared); change signal trigger-only; each client still pulls its OWN delegated `dms_delta` (per-user trimming intact). Fire-and-forget subscribe never blocks browse. No visual change (VA-D1 match). No `func-dms` / endpoint / vault-dms API-Spec change.
