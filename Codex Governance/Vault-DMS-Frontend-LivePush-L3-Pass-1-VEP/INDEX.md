# Vault DMS Frontend — Layer 3: live push subscriber (real-time DMS updates) — Pass-1 Frontend Verified Evidence Pack

Plan-only VEP. Layers 1 (instant paint) + 2 (delta patch) are live: the DMS tree paints instantly and, on mount / folder-expand / `active` re-show, revalidates incrementally via one `dms_delta` per expanded site. Layer 3 makes the mirror **real-time**: a receive-only Azure Web PubSub subscriber, connected only while the DMS is the active rail context, listens on the constant `dms-changes` broadcast group and — on a `{ type:"dms_changed", drive_id }` ping fanned by the deployed `dms_notifications` — triggers the **existing** delta revalidation (it bumps the same `revalidateNonce` the `active` re-show already uses), so the tree patches in place within seconds of a SharePoint change **without the user re-entering**. Scope: `package.json` (+`@azure/web-pubsub-client`), a new `src/lib/dmsRealtime.ts` (the `useDmsRealtime` hook), and one call site in `src/DmsBrowser.tsx`. No visual/render change, no `DmsBrowserProps` change, no new endpoint (`dms_negotiate` + `dms_notifications` are deployed + golden-verified this session). Reviewer: Codex (FE).

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: 7e4803acc69ca6d1fc892cb318a321797ebcf66c (development; the commit that first adds this VEP — presence probe resolves here and at every later commit; grounding reads were against parent 782cbd8)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below.)

Current-turn grounding: Read the shipped `src/lib/dmsClient.ts` (`revalidateSiteViaDelta`/`getDmsDelta`/`applyDeltaToCache` + the principal-namespaced snapshot + per-site cursor/rootItemId) and `src/DmsBrowser.tsx` (`RevalidateContext` nonce; `DmsBrowser` default export bumps `revalidateNonce` on each `active` false→true flip; `Tree` consumes the nonce → per-expanded-site `revalidateSiteViaDelta` → `cacheVersion` re-read). Surveyed the DEPLOYED vault-origin chat realtime hook `src/shell/chat/chatRealtime.ts` (the `@azure/web-pubsub-client` `WebPubSubClient` + `getClientAccessUrl`-callback + receive-only `client.on('group-message')` pattern) as the structural reference for the new hook. Read `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` §4B (VA-D1) and `governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` §7. The consumed `dms_negotiate` contract is the deployed vault-theo `spec/THEO_API_SPEC.md` §2.13 row (landed + golden-verified this session: unauth 401, authenticated 200 `{ url, hub:"vaultchat", groups:["dms-changes"] }`).

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | F-P2 — data-flow only; no component/render change (VA-D1 match) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 (Vault DMS File Browser) — the only VA touched (no render change) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-theo/spec/THEO_API_SPEC.md | §2.13 | "negotiate a DMS realtime connection (receive-only)" | F-P3 — the deployed `dms_negotiate` the subscriber consumes for its receive-only token |

## F-P1 — Feature identification
Microstep: add a real-time change subscriber so the DMS tree updates live (no re-enter) when SharePoint changes. In scope: `package.json` (+`@azure/web-pubsub-client`), new `src/lib/dmsRealtime.ts` (`useDmsRealtime` hook + internal `negotiateDmsRealtime`), and one call site in `src/DmsBrowser.tsx` (invoke the hook; its `onDmsChanged` bumps the EXISTING `revalidateNonce`). Consumes the deployed `dms_negotiate` (func-chat) for a receive-only token and reacts to the deployed `dms_notifications` `dms-changes` fan-out. Deferred: precise `drive_id`→`siteId` targeting (see F-P2.5).

## F-P2 — UI Authority Reconciliation
- **VA-D1** (Vault DMS File Browser) — **VISUAL-AUTHORITY-MATCH.** No new element, token, icon, indent, interaction, or status indicator; the tree renders identically. Only a new *data trigger* is added: a push ping runs the same in-place delta patch the `active` re-show already runs, so the visible result (only real SharePoint changes appear/disappear in place) is pixel-identical to today's revalidation.
- No new VA.

## F-P2.5 — Gap Disclosure
**PROCEED.** (1) **Liveness + per-user trimming preserved** — the ping is **trigger-only** (opaque `drive_id`, no names/content); each client reacts by pulling its OWN delegated `dms_delta` (on-behalf-of the signed-in user, same as `dms_tree`), so SharePoint permission trimming is intact and an unentitled user learns nothing. (2) **Reuses the deployed revalidation seam** — `onDmsChanged` bumps the same `revalidateNonce` the `active` re-show uses; the existing `Tree` effect revalidates expanded sites via `revalidateSiteViaDelta` and only real changes repaint. No new render path. (3) **`drive_id` not FE-mapped to `siteId`** — the FE keys by `siteId` and holds no `drive_id`→`siteId` map; on a ping it revalidates the currently-expanded sites. `dms_delta` returns **only actual changes** (a no-op for unaffected drives), so the result is exactly correct; the only cost is a cheap delta check. Precise per-drive targeting is deferred (a later refinement), not a correctness gap. (4) **Connection gated on `active`** — the `WebPubSubClient` connects only while the DMS is the active rail context and `client.stop()`s when inactive/unmounted (no idle connection when the DMS isn't shown). (5) **Receive-only** — the token carries `groups:["dms-changes"]` and NO roles (server-authoritative; the client cannot publish or spoof a change). (6) **Graceful degrade** — if `VITE_DMS_REALTIME_BASE_URL` is unset or the negotiate returns non-2xx, the hook no-ops (mirrors chatRealtime's "realtime silently disabled"); mount / expand / `active`-re-show revalidation is unaffected (back-compatible for hosts without realtime configured, incl. the standalone/Sigma mounts). (7) **Debounce** — rapid pings are coalesced (short debounce) into one revalidation. No new endpoint (`dms_negotiate` §2.13 + `dms_notifications` deployed + golden-verified). No PRE-LAND / ESCALATE.

## F-P3 — Contract grounding
Consumes the deployed **`dms_negotiate`** (vault-theo `spec/THEO_API_SPEC.md` §2.13): `GET /api/dms_negotiate` → `{ data: { url, hub:"vaultchat", groups:["dms-changes"] } }` (receive-only client-access URL). The hook constructs an `@azure/web-pubsub-client` `WebPubSubClient({ getClientAccessUrl })` (the callback re-negotiates on connect/reconnect, mirroring chatRealtime) and subscribes to `group-message`, filtering for `{ type:"dms_changed", drive_id }` — the deployed `dms_notifications` fan-out shape. New FE env var **`VITE_DMS_REALTIME_BASE_URL`** = the func-chat base (where `dms_negotiate` lives; the DMS data base `VITE_DMS_API_BASE_URL` remains func-dms). `dms_negotiate`'s CORS is `Access-Control-Allow-Origin: *` (same as `theo_chat_negotiate`), so the cross-origin call from the DMS SWA needs no additional config. No `func-dms` / endpoint / vault-dms API-Spec change.

## F-P4 — Component reference grounding (Primary Reference)
**PRIMARY REFERENCE: the shipped `src/DmsBrowser.tsx` + `src/lib/dmsClient.ts`** (the edited/consumed surfaces). The new `useDmsRealtime` hook structurally mirrors the **deployed** vault-origin chat realtime hook `src/shell/chat/chatRealtime.ts` (`WebPubSubClient` + `getClientAccessUrl` callback + receive-only `client.on('group-message')` dispatch + best-effort `start()`/`stop()` lifecycle). Not GREENFIELD — a pattern mirror of a deployed hook.

## F-P5 — Component Contract Table

| Component (ownership) | Prop / input interface (TypeScript — full literal) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `dmsRealtime` module (`lib/dmsRealtime.ts`; NEW) | **Full exported interface (literal):** <br>`export function useDmsRealtime(getAccessToken: ShellTokenProvider, active: boolean, onDmsChanged: () => void): void;`<br>Internal (not exported): `negotiateDmsRealtime(getAccessToken: ShellTokenProvider): Promise<string \| null>` (GET `${import.meta.env.VITE_DMS_REALTIME_BASE_URL}/api/dms_negotiate` → `data.url`; `null` on no-base / no-token / non-2xx / malformed — realtime disabled). The hook: a `useEffect` gated on `active` that builds `new WebPubSubClient({ getClientAccessUrl: async () => { const u = await negotiateDmsRealtime(getAccessToken); if (!u) throw new Error('dms negotiate unavailable'); return u; } })`, subscribes `client.on('group-message', e => { parse e.message.data; if data.type === 'dms_changed' → schedule the debounced onDmsChanged(); })`, `void client.start().catch(()=>{})`, and returns a cleanup that clears the debounce timer + `client.stop()`. `ShellTokenProvider` is imported from `./dmsClient` (existing). No `any`. | VA-D1 (no render) | `dms_negotiate` §2.13 (deployed) + `@azure/web-pubsub-client` | PROCEED |
| `DmsBrowser` (`DmsBrowser.tsx`; ACTIVE, modify — call site only) | `DmsBrowserProps` **UNCHANGED** (full literal): <br>`export interface DmsBrowserProps { navSlot?: HTMLElement \| null; getAccessToken: ShellTokenProvider; onOpenFile?: (node: DmsFileNode) => void; pickMode?: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void; active?: boolean }`<br>Internal (default export) ONLY: add `useDmsRealtime(getAccessToken, !!active, useCallback(() => setRevalidateNonce((n) => n + 1), []))` — reusing the SAME `revalidateNonce` state + setter already declared for the `active` re-show. No prop added, no render branch changed, no new element. | VA-D1 | via `dmsRealtime` + existing `revalidateNonce` seam | PROCEED |
| `TreeNode` (internal; `DmsBrowser.tsx`) | Full prop interface (literal — **UNCHANGED**, no member added): <br>`interface TreeNodeProps { siteId: string; itemId?: string; label: string; hasChildren: boolean; depth: number; kind: 'client' \| 'folder' \| 'file'; getAccessToken: ShellTokenProvider; onOpenFile: (node: DmsFileNode) => void; pickMode: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void; parentName?: string; webUrl?: string; mimeType?: string; webDavUrl?: string; }`<br>No change — the push ping flows through the existing nonce → `Tree` → `cacheVersion` → `TreeNode` re-read path unchanged. | VA-D1 | via getters | PROCEED |

No `any`. Component prop interfaces UNCHANGED; the change is the additive realtime hook + one call site that reuses the deployed revalidation seam.

## Component Structural Mirror Table (F-I2)

| Region (vault-dms FE) | Primary Reference | Classification |
|---|---|---|
| `lib/dmsRealtime.ts` `useDmsRealtime` — `WebPubSubClient({ getClientAccessUrl })` + receive-only `client.on('group-message')` + `start()`/`stop()` lifecycle | deployed vault-origin `src/shell/chat/chatRealtime.ts` (`useChatRealtime`) | ALLOWED DELTA (negotiate points at `dms_negotiate` not `theo_chat_negotiate`; dispatch filters `type === 'dms_changed'` and calls `onDmsChanged`; connect gated on `active`; debounced) |
| `lib/dmsRealtime.ts` `negotiateDmsRealtime` — GET `dms_negotiate` → `data.url`, null-safe | deployed vault-origin `negotiateChat` (`chatClient.ts`) | ALLOWED DELTA (URL `${VITE_DMS_REALTIME_BASE_URL}/api/dms_negotiate`; same `{data:{url}}` shape) |
| `DmsBrowser` default export `+ useDmsRealtime(getAccessToken, !!active, bumpNonce)` where `bumpNonce = setRevalidateNonce((n)=>n+1)` | shipped `DmsBrowser.tsx` (the existing `active`→`revalidateNonce` effect) | ALLOWED DELTA (a push ping reuses the deployed re-show revalidation path; no render/prop change) |

## F-P6 — Repository & active-surface grounding
Target files (Read this turn): `src/lib/dmsClient.ts`, `src/DmsBrowser.tsx` (+ new `src/lib/dmsRealtime.ts`, `package.json`). Guardrails: no visual/render change; `DmsBrowserProps`/`TreeNodeProps` unchanged; receive-only token (no publish role); `WebPubSubClient` connects ONLY when `active`, `stop()`s on inactive/unmount; graceful no-op when `VITE_DMS_REALTIME_BASE_URL` is unset or negotiate is non-2xx (back-compat for standalone/Sigma); rapid pings debounced; per-user trimming preserved (each client pulls its OWN delegated `dms_delta`); no `func-dms`/endpoint/vault-dms-API-Spec change; the realtime `import.meta.env` base is the sole new env var.

## F-P7 — Plan body (Pass-3, on APPROVAL)
1. **`package.json`** — add `"@azure/web-pubsub-client": "^1.0.1"` to dependencies; `npm install` (regenerates the lockfile).
2. **`src/lib/dmsRealtime.ts`** (new) — `negotiateDmsRealtime(getAccessToken)` (GET `${import.meta.env.VITE_DMS_REALTIME_BASE_URL}/api/dms_negotiate` with `Authorization: Bearer`; return `data.url` or `null`; try/guarded, never logs the url) + `useDmsRealtime(getAccessToken, active, onDmsChanged)` (effect gated on `active`; `WebPubSubClient` with the re-negotiating `getClientAccessUrl`; `on('group-message')` → parse → `type==='dms_changed'` → debounced `onDmsChanged`; `start()` best-effort; cleanup clears timer + `stop()`).
3. **`src/DmsBrowser.tsx`** — in the default export, after the existing `revalidateNonce` declaration, call `useDmsRealtime(getAccessToken, !!active, useCallback(() => setRevalidateNonce((n) => n + 1), []))`. Import `useDmsRealtime` from `./lib/dmsRealtime`. No other change.
4. **Verify**: `vite build` green; with `VITE_DMS_REALTIME_BASE_URL` set, opening Vault Files negotiates + opens exactly one ws connection; editing/adding/deleting a SharePoint file in an expanded drive → the tree patches in place within a few seconds **without re-entering** (Network shows one `dms_negotiate` + a `dms_delta` per expanded site on the ping); switching away (DMS inactive) closes the connection; with the env var unset → no connection and no error (mount/expand/`active` revalidation still works).
5. **Deploy**: build + publish the DMS remote to its **dev SWA** (set `VITE_DMS_REALTIME_BASE_URL` = the func-chat base at build); Origin + Sigma consume the updated `remoteEntry.js`. Walter verifies on the dev SWA.

## Mechanical lint
Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-LivePush-L3-Pass-1-VEP/INDEX.md" --repo-root .` — expect `PASS`.

## Requested action
Codex Pass-2 review against Frontend Conformance §6 + the Golden Component Pack. Plan-only. On APPROVED, Claude Code executes Pass-3 per F-P7 on `development` and publishes the DMS remote to the dev SWA for Walter's verification — completing the OneDrive-grade DMS end to end (L1 instant paint · L2 delta patch · L3 real-time push).
