# Vault DMS Frontend — Layer 2: delta-based revalidation (patch, don't re-list) — Pass-1 Frontend Verified Evidence Pack

Plan-only VEP. Layers 1 + the SWR/re-show signal are live: the DMS tree paints instantly and revalidates by **re-listing** each expanded folder (`dms_tree` per node). Layer 2 makes revalidation **incremental** — the deployed `dms_delta` endpoint (API Spec §2.7) returns only what changed in a drive since a cursor, so on revalidation the client makes **one `dms_delta` call per expanded site** and **patches the cached tree in place** (by item id under parent id) instead of re-fetching every folder. First-load of a folder still uses `dms_tree` (lazy); delta is the revalidation path. Cheaper, faster, and still a true live mirror (every revalidation hits SharePoint via delegated OBO). Scope: `src/lib/dmsClient.ts` + `src/DmsBrowser.tsx`. No visual change, no new endpoint (§2.7 is deployed + golden-verified). Reviewer: Codex (FE).

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: <<PKG_COMMIT>> (development; the commit that first adds this VEP — T25 presence probe resolves here and at every later commit; grounding reads were against parent d8bba5c)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below.)

Current-turn grounding: Read the shipped `src/lib/dmsClient.ts` (blob `dd77478`: `listDmsSites`/`getDmsTree`; the principal-namespaced sessionStorage snapshot `sitesCache`/`treeCache`/`expandedNodes` + `getCachedSites`/`getCachedTree`/`isNodeExpanded`/`setNodeExpanded`/`setDmsPrincipal`/`clearDmsCache`) and `src/DmsBrowser.tsx` (blob `4e2fe50`: `RevalidateContext` nonce; `Tree` clients seed+revalidate; `TreeNode` expand/children/nonce-revalidate via `getDmsTree`); `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` §4B (VA-D1); `governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` §7; `spec/VAULT_DMS_API_SPEC.md` §2.7 (`dms_delta`, deployed).

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | F-P2 — data-flow only; no component/render change (VA-D1 match) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 (Vault DMS File Browser) — the only VA touched (no render change) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/spec/VAULT_DMS_API_SPEC.md | §2.7 | "incremental drive change sync (live mirror)" | F-P3 — the deployed endpoint the FE now consumes on revalidation |

## F-P1 — Feature identification
Microstep: replace the per-node re-list revalidation with a per-site `dms_delta` patch, WITHOUT changing first-load (lazy `dms_tree`) or any rendered output. In scope: `src/lib/dmsClient.ts` (delta client + per-site cursor in the namespaced snapshot + in-place cache patch) + `src/DmsBrowser.tsx` (Tree-level delta revalidation + cache re-read). Deferred: Layer 3 change-notifications (func-chat).

## F-P2 — UI Authority Reconciliation
- **VA-D1** (Vault DMS File Browser) — **VISUAL-AUTHORITY-MATCH.** No new element, token, icon, indent, or interaction; the tree renders identically. Only the revalidation *data flow* changes (one delta call + in-place patch instead of N folder re-lists). Reconciliation preserves the existing order (folders first, then files, alphabetical) so the patched view is pixel-identical.
- No new VA.

## F-P2.5 — Gap Disclosure
**PROCEED.** (1) **Liveness preserved** — every revalidation still calls SharePoint via delegated OBO (`dms_delta`); nothing is served as authoritative-stale; per-user trimming is intact (the delta runs on-behalf-of the signed-in user, same as `dms_tree`). (2) **Correctness of the lazy/drive-level bridge** — `dms_delta` returns drive-level flat changes with `parent_id`; the patch applies each change ONLY to parent folders already present in `treeCache` (loaded/expanded); changes under not-yet-loaded folders are ignored (those folders lazy-load fresh via `dms_tree` when first expanded), so the cache never drifts. (3) **Resync-safe** — any `dms_delta` non-2xx (incl. expired-token 410→500) drops the stored cursor so the next revalidation re-baselines; a baseline response is applied as upserts to loaded folders. (4) **Cursor storage** — the per-site delta cursor is part of the principal-namespaced sessionStorage snapshot (DMS Snapshot Storage Exception, Governor §6.3 — "metadata + delta cursor" is explicitly in scope). (5) **No new VA / no endpoint change** — §2.7 is deployed + golden-verified. No PRE-LAND / ESCALATE.

## F-P3 — Contract grounding
Consumes the deployed `dms_delta` (API Spec §2.7): `GET /api/dms_delta?siteId=&deltaToken=` → `{ data: { dms_delta: { site_id, drive_id, baseline, changes:[{item_id,parent_id,deleted,type?,name?,…}], delta_token } } }`. No `func-dms` change. First-load still uses `dms_tree` (§2.2).

## F-P4 — Component reference grounding (Primary Reference)
**PRIMARY REFERENCE: the shipped `src/lib/dmsClient.ts` (blob `dd77478`) + `src/DmsBrowser.tsx` (blob `4e2fe50`)** — the surfaces edited. Not GREENFIELD.

## F-P5 — Component Contract Table

| Component (ownership) | Prop / input interface (TypeScript — full literal) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `dmsClient` module (`lib/dmsClient.ts`; ACTIVE, modify) | Adds (literal signatures): <br>`export async function getDmsDelta(siteId: string, deltaToken: string \| null, getAccessToken: ShellTokenProvider): Promise<{ baseline: boolean; changes: DmsDeltaChange[]; deltaToken: string \| null } \| null>;` (null ⇒ non-2xx → caller re-baselines) <br>`export function getDeltaToken(siteId: string): string \| null;`<br>`export function setDeltaToken(siteId: string, token: string \| null): void;`<br>`export function applyDeltaToCache(siteId: string, changes: DmsDeltaChange[]): void;` (upsert non-deleted / remove deleted into cached parent folders by item id; re-sort folders-first, name asc) <br>`export async function revalidateSiteViaDelta(siteId: string, getAccessToken: ShellTokenProvider): Promise<void>;` (read cursor → getDmsDelta → apply + store new cursor; on null/baseline-after-error drop cursor) <br>Prior exports + `listDmsSites`/`getDmsTree` UNCHANGED. New type `DmsDeltaChange` mirrors the §2.7 change shape. Cursor persisted in the namespaced snapshot (`ss` keys `…:delta:<siteId>`). | VA-D1 (no render change) | `dms_delta` §2.7 (deployed) | PROCEED |
| `DmsBrowser` (`DmsBrowser.tsx`; ACTIVE, modify) | `DmsBrowserProps` UNCHANGED (full literal): <br>`export interface DmsBrowserProps { navSlot?: HTMLElement \| null; getAccessToken: ShellTokenProvider; onOpenFile?: (node: DmsFileNode) => void; pickMode?: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void; active?: boolean }` <br>Internal: `Tree`'s revalidation (mount + `active`/nonce re-show) now, per expanded client site, calls `revalidateSiteViaDelta` (one delta call), then bumps a `cacheVersion` (context) so each expanded `TreeNode` RE-READS its patched `getCachedTree(...)` children (no per-node `dms_tree` refetch). First expand of a folder still calls `getDmsTree` (lazy). | VA-D1 | via dmsClient | PROCEED |
| `TreeNode` (internal; `DmsBrowser.tsx`; ACTIVE, modify) | `TreeNodeProps` UNCHANGED. Internal: the nonce/`cacheVersion` effect re-reads `getCachedTree(siteId, itemId)` into `children` (patched by the delta) instead of calling `getDmsTree`; first-expand still lazy-loads via `getDmsTree`. | VA-D1 | via getters | PROCEED |

No `any`. Component prop interfaces UNCHANGED; the change is the dmsClient delta layer + the revalidation data-flow.

## Component Structural Mirror Table (F-I2)

| Region (vault-dms FE) | Primary Reference | Classification |
|---|---|---|
| `dmsClient` `+ getDmsDelta / getDeltaToken / setDeltaToken / applyDeltaToCache / revalidateSiteViaDelta` + `DmsDeltaChange` type + per-site cursor in the namespaced snapshot | shipped `dmsClient.ts` (blob `dd77478`) | ALLOWED DELTA (additive delta layer consuming deployed §2.7; lazy `getDmsTree` first-load unchanged) |
| `DmsBrowser`/`Tree` revalidation → per-expanded-site `revalidateSiteViaDelta` + `cacheVersion` re-read (replaces per-node `getDmsTree` on re-show) | shipped `DmsBrowser.tsx` (blob `4e2fe50`) | ALLOWED DELTA (revalidation strategy; render + first-load unchanged) |
| `TreeNode` re-show effect re-reads patched cache instead of refetch | shipped `DmsBrowser.tsx` | ALLOWED DELTA (no render/interaction change) |

## F-P6 — Repository & active-surface grounding
Target files (Read this turn): `src/lib/dmsClient.ts`, `src/DmsBrowser.tsx`. Guardrails: no visual/render change; `DmsBrowserProps`/`TreeNodeProps` unchanged; no `func-dms`/endpoint change (§2.7 deployed); delegated OBO preserved (per-user trimming); lazy first-load unchanged; cursor within the DMS Snapshot Storage Exception scope; all sessionStorage access try/guarded.

## F-P7 — Plan body (Pass-3, on APPROVAL)
1. **`dmsClient.ts`** — add `DmsDeltaChange`; `getDmsDelta` (GET `/api/dms_delta`, map body → `{baseline,changes,deltaToken}`, null on non-2xx); per-site cursor `getDeltaToken`/`setDeltaToken` (namespaced `ss` `…:delta:<siteId>`, in `clearDmsCache`); `applyDeltaToCache` (for each change: locate `treeCache[`${siteId}|${parent_id}`]` if present → upsert by `item_id` for non-deleted, splice out for deleted; re-sort folders-first/name-asc; persist `ss`); `revalidateSiteViaDelta` (read cursor → `getDmsDelta` → null ⇒ `setDeltaToken(siteId,null)` and return; else `applyDeltaToCache` + `setDeltaToken(siteId, resp.deltaToken)`).
2. **`DmsBrowser.tsx`** — `Tree`: on the revalidation trigger (mount + `active`/nonce), `await Promise.all(expandedClientSites.map(s => revalidateSiteViaDelta(s, getAccessToken)))`, then bump `cacheVersion`. `TreeNode`: nonce/`cacheVersion` effect → `setChildren(getCachedTree(siteId, itemId))` (re-read patched cache) instead of `getDmsTree`; first-expand `toggle` still lazy-loads via `getDmsTree`.
3. **Verify**: `vite build` green; on re-show, exactly one `dms_delta` per expanded site (Network tab) instead of N `dms_tree`; add/rename/delete a SharePoint file → the change appears in place on the next revalidation without a full re-list; expired cursor → one baseline then incremental resumes.
4. **Deploy**: build + publish the DMS remote to its dev SWA; Origin + Sigma consume the updated `remoteEntry.js`.

## Mechanical lint
Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-DeltaConsumption-L2-Pass-1-VEP/INDEX.md" --repo-root .` — expect `PASS`.

## Requested action
Codex Pass-2 review against Frontend Conformance §6 + the Golden Component Pack. Plan-only. On APPROVED, Claude Code executes Pass-3 per F-P7 on `development` and publishes the DMS remote. Layer 3 (func-chat change-feed) follows.
