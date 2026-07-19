# Vault DMS FE L3 (Live Push) — Pass-3 Execution Evidence

Executed against the Codex-APPROVED Pass-1 plan (`INDEX.md`, F-P7). Branch `development`.

## Changes applied (exactly F-P7)
1. **`package.json`** — added `"@azure/web-pubsub-client": "^1.0.1"` (matches the deployed vault-origin version). `npm install` resolved `@azure/web-pubsub-client@1.1.0`; `package-lock.json` updated.
2. **`src/lib/dmsRealtime.ts`** (new) — `negotiateDmsRealtime(getAccessToken)` (GET `${import.meta.env.VITE_DMS_REALTIME_BASE_URL}/api/dms_negotiate` → `data.url`; null on no-base / no-token / non-2xx / malformed; url never logged) + `useDmsRealtime(getAccessToken, active, onDmsChanged)`: effect gated on `active`, builds `WebPubSubClient({ getClientAccessUrl })` (re-negotiates on connect/reconnect), `client.on('group-message')` → parses the frame, and on `type === 'dms_changed'` fires a **debounced** (400 ms) `onDmsChanged`; `client.start()` best-effort; cleanup clears the timer + `client.stop()`. Receive-only; all failures swallowed (graceful degrade). Mirrors the deployed `chatRealtime.ts` pattern.
3. **`src/DmsBrowser.tsx`** — imported `useDmsRealtime`; in the default export added ONE call site: `useDmsRealtime(getAccessToken, !!active, useCallback(() => setRevalidateNonce((n) => n + 1), []))` — reusing the EXISTING `revalidateNonce` setter (same one the `active` re-show bumps). No prop, render, or `TreeNodeProps`/`DmsBrowserProps` change.
4. **CI env** — added `VITE_DMS_REALTIME_BASE_URL=https://vaultgpt-func-chat.azurewebsites.net` to the `.env` bake step in `.github/workflows/azure-static-web-apps-development.yml` and `…-main.yml` (the func-chat base where `dms_negotiate` lives; the data base `VITE_DMS_API_BASE_URL` remains func-dms).

## Verification
- **`vite build`**: GREEN — `✓ 1749 modules transformed`, `✓ built in ~3s`; the federated `DmsBrowser` chunk built (`__federation_expose_DmsBrowser-*.js`, 69.0 kB). No TS/lint errors.
- **Dependency**: `@azure/web-pubsub-client@1.1.0` present (satisfies `^1.0.1`).
- **Deploy**: push to `development` triggers `azure-static-web-apps-development.yml` (Oryx `npm install` + `npm run build` with the baked `.env`, then SWA upload). The updated `remoteEntry.js` is consumed by Origin + Sigma.

## Walter dev-SWA verification (once the SWA build finishes)
1. Open Vault Origin (dev SWA) → Vault Files (DMS active). One `dms_negotiate` (200) + a ws connection open (DevTools Network/WS).
2. In SharePoint, add/rename/delete a file in a drive you have expanded in the tree.
3. Within a few seconds the tree patches **in place** (no manual re-enter) — Network shows a `dms_delta` per expanded site on the ping.
4. Switch away from Vault Files → the ws connection closes (connection gated on `active`).
5. (Negative) unchanged drives don't visibly change (delta no-op); no console errors.

## Boundary preservation
Per-user SharePoint trimming intact — the ping is trigger-only (opaque `drive_id`); each client pulls its OWN delegated `dms_delta`. Receive-only token (no publish role). No visual change (VA-D1 match). No `func-dms` / endpoint / vault-dms API-Spec change.
