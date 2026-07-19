# Vault DMS Frontend — Layer 1: sessionStorage snapshot persistence (instant paint across reloads) — Pass-1 Frontend Verified Evidence Pack

Plan-only VEP. **Supersedes the prior revision, which Codex REJECTED (2026-07-19)** on three points: (T26/F-P6) `sessionStorage` was hard-gated with no authorized exception; (T13) the sensitivity disclosure said "names only" but the snapshot also holds item ids + web_url/web_dav_url; (T13) the sign-out-wipe claim was ungrounded (`clearDmsCache()` has no caller). **Revision 3 (this artifact)** addresses a second Codex reject: the snapshot is now **namespaced by the authenticated principal (Entra OID)** so a same-tab user switch can never instant-paint the prior user's cached metadata (was the T13 cross-user-leakage finding); the F-P7 sign-out-freshness wording is corrected; and the GCR HEAD is aligned to the package-containing commit. This revision cites the now-authorized **DMS Snapshot Storage Exception** (Governor §6.3, landed by the paired Role-C amendment `…-DMS-Snapshot-Storage-Exception-Role-C`).

The Codex-APPROVED live-mirror change keeps its snapshot in-memory, so it survives in-session rail-context switches but NOT a page reload — reloading the SWA in the same tab re-runs the full load loop from scratch (Walter). This is **Layer 1** of the OneDrive-style plan (local cache → delta → change-notifications): mirror the existing session snapshot (site list + folder listings + expanded-node set) to **sessionStorage**, namespaced per authenticated principal, so the tree also paints instantly after a page reload within the same tab. This never bypasses revalidation — the browse functions still always fetch fresh (Layer 2 delta / Layer 3 push land behind it) — so the mirror stays live; this only removes the blank reload. Scope: `src/lib/dmsClient.ts` (namespaced sessionStorage snapshot) + `src/DmsBrowser.tsx` (resolve the OID from the token, bind the principal, gate the tree until bound). No component/visual change, no `func-dms` / API-Spec change. Back-compatible (try/guarded — if sessionStorage is unavailable, in-memory behaves exactly as today). Reviewer: Codex (FE).

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: 79da6ef4ea67e872e1c71b2ac32f974f6b09dcf0 (development; the commit that carries this L1 rev3 VEP — T25 presence probe resolves there and at every later commit; grounding reads were against parent 0538c3a — which carries the DMS Snapshot Storage Exception (Governor §6.3) and the shipped dmsClient/DmsBrowser)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below; the lint's P/I/E enumeration is the backend §4A track, hence `N/A`.)

Current-turn grounding: Read the shipped `src/lib/dmsClient.ts` (blob `9c1608d`: the in-memory `sitesCache` / `treeCache` / `expandedNodes` snapshot + `getCachedSites` / `getCachedTree` / `isNodeExpanded` / `setNodeExpanded` / `clearDmsCache`, populated on the success path of `listDmsSites` / `getDmsTree`) and `src/DmsBrowser.tsx` (default export: `active` re-show nonce + `Tree`/`TreeNode` seeding from the snapshot — where the principal must be bound before the seed); `governance/CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md` §6.3 (the landed DMS Snapshot Storage Exception — the authority for this VEP's sessionStorage use); `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` §4B (VA-D1) + T26 (exception carve-out); `governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` §7.

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | F-P2 — data-layer only; no component/render change (VA-D1 match) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 (Vault DMS File Browser) — the only VA touched (indirectly; no render change) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md | §6.3 | "DMS Snapshot Storage Exception (Walter-authorized 2026-07-19)" | F-P2.5/F-P3/F-P6 — the authority permitting this VEP's scoped `sessionStorage` use |

## F-P1 — Feature identification
Microstep: persist the existing SWR snapshot to sessionStorage (principal-namespaced) so instant paint also covers page reload (not just in-session context switches), WITHOUT weakening the live-mirror guarantee OR leaking one user's cache to another on a same-tab switch. In scope: `src/lib/dmsClient.ts` (namespaced sessionStorage + `setDmsPrincipal`) + `src/DmsBrowser.tsx` (resolve OID → bind principal → gate). Layer 2 (`dms_delta`, func-dms) and Layer 3 (change-notifications in func-chat) are separate packages.

## F-P2 — UI Authority Reconciliation
- **VA-D1** (Vault DMS File Browser) — **VISUAL-AUTHORITY-MATCH.** `DmsBrowser` gains internal-only logic (resolve OID → bind principal → one-tick mount gate) + data-layer snapshot persistence; its prop interface, rendered elements, tokens, icons, indent, and interactions are unchanged. The only user-visible effect is instant paint on reload; no redesign.
- No new VA.

## F-P2.5 — Gap Disclosure
**PROCEED.** (0) **Authority** — `sessionStorage` here is permitted by the **DMS Snapshot Storage Exception** (Governor §6.3, Walter-authorized 2026-07-19; landed by the paired Role-C amendment). Its constraints are met below, so T26 does not trigger. (1) **Liveness preserved** — sessionStorage only seeds instant paint; every mount / expand / `active` re-show still fetches fresh (the approved SWR + re-show signal), so the view converges to live SharePoint. (2) **Cross-user isolation (principal-namespaced).** The snapshot is keyed by the authenticated principal: sessionStorage keys are `vault-dms:v1:<oid>:*`, and on mount `DmsBrowser` resolves the OID from the access-token payload and binds it (`setDmsPrincipal`) BEFORE the tree seeds from the snapshot. A same-tab sign-out/sign-in as a DIFFERENT user therefore reads a different namespace — it can never instant-paint the prior user's cached metadata; the prior user's entries are orphaned under their own OID and cleared on tab close. Until the principal is bound, ss I/O is disabled (memory-only) — safe default. (2b) **Session boundary** — per-tab, cleared on tab close; `clearDmsCache()` is the explicit-clear hook (e.g. future sign-out/refresh wiring); this slice does not auto-invoke it on sign-out (the per-principal namespace + tab-close ephemerality are the boundary). (3) **Failure-safe** — all access is try/guarded; quota-exceeded or privacy-mode falls back to the in-memory snapshot (today's behavior). (4) **Serialization** — `DmsClient` / `DmsTreeNode` are plain JSON (no functions/React); round-trip is lossless. (5) **Sensitivity (accurate)** — persists browse **metadata + URLs**: SharePoint site/folder/file **names, item ids, and file `web_url`/`web_dav_url`** — NOT file content, access tokens, or secrets — in a per-tab store on a hardened employees-only origin. Within the Exception's "metadata + delta cursor only" scope. No PRE-LAND / ESCALATE.

## F-P3 — Contract grounding
No `func-dms` / API-Spec change. sessionStorage stores the already-fetched, already-mapped results of `dms_list_sites` (§2.6) / `dms_tree` (§2.2). No new route/param/field.

## F-P4 — Component reference grounding (Primary Reference)
**PRIMARY REFERENCE: the shipped `src/lib/dmsClient.ts` (blob `9c1608d`) + `src/DmsBrowser.tsx`** — the surfaces edited. Not GREENFIELD, not composite.

## F-P5 — Component Contract Table

| Component (ownership) | Prop / input interface (TypeScript — full literal) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `dmsClient` module (`lib/dmsClient.ts`; ACTIVE, modify) | Full exported module API (literal signatures; only `setDmsPrincipal` is added, all others unchanged): <br>`export function getCachedSites(): DmsClient[] \| null;`<br>`export function getCachedTree(siteId: string, parentItemId?: string): DmsTreeNode[] \| null;`<br>`export function isNodeExpanded(nodeKey: string): boolean;`<br>`export function setNodeExpanded(nodeKey: string, expanded: boolean): void;`<br>`export function setDmsPrincipal(id: string): void;` ← ADDED (bind principal + re-hydrate from its namespace)<br>`export function clearDmsCache(): void;`<br>`export async function listDmsSites(getAccessToken: ShellTokenProvider): Promise<DmsClient[]>;`<br>`export async function getDmsTree(siteId: string, parentItemId: string \| undefined, getAccessToken: ShellTokenProvider): Promise<DmsTreeNode[]>;` <br>Internal: sessionStorage keys namespaced `vault-dms:v1:<principal>:*`; ss I/O gated on a bound principal; write/clear on the success paths, `setNodeExpanded`, `clearDmsCache` (guarded). | VA-D1 (no render change) | `dms_list_sites` §2.6 / `dms_tree` §2.2 (unchanged) | PROCEED |
| `DmsBrowser` (`DmsBrowser.tsx`; ACTIVE, modify) | Prop interface (full literal — UNCHANGED, no member added): <br>`export interface DmsBrowserProps {`<br>`  navSlot?: HTMLElement \| null;`<br>`  getAccessToken: ShellTokenProvider;`<br>`  onOpenFile?: (node: DmsFileNode) => void;`<br>`  pickMode?: boolean;`<br>`  onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void;`<br>`  active?: boolean;`<br>`}` <br>Internal only: on mount resolve the OID from the token (`oidFromToken`, cache-keying only) → `setDmsPrincipal` (guarded against stale promises), gate the tree render (`principalReady`) until bound so the snapshot seeds under the correct principal. No render/visual change. | VA-D1 | via getters + token | PROCEED |

No `any`. No exported signature changed; the delta is guarded sessionStorage I/O behind the existing snapshot.

## Component Structural Mirror Table (F-I2)

| Region (vault-dms FE) | Primary Reference | Classification |
|---|---|---|
| `dmsClient` `+ ssGet/ssSet/ssClear` (principal-namespaced) + `setDmsPrincipal` (bind + re-hydrate) + persist on the `listDmsSites`/`getDmsTree` success paths, `setNodeExpanded`, `clearDmsCache` | shipped `dmsClient.ts` snapshot (blob `9c1608d`) | ALLOWED DELTA (additive principal-namespaced persistence of the existing in-memory snapshot; fetch paths unchanged; try/guarded) |
| `DmsBrowser` `+ oidFromToken` + mount-resolve principal → `setDmsPrincipal` + `principalReady` gate | shipped `DmsBrowser.tsx` default export (blob `537c422` → current) | ALLOWED DELTA (principal binding + one-tick mount gate; no render/visual change) |

## F-P6 — Repository & active-surface grounding
Target files (Read this turn): `src/lib/dmsClient.ts`, `src/DmsBrowser.tsx`. **Storage guardrail reconciliation:** the `sessionStorage` use here is the explicitly-authorized DMS Snapshot Storage Exception (Governor §6.3; Conformance T26 carve-out), and it is principal-namespaced (no cross-user read) — it does not violate the no-browser-storage guardrail. Other guardrails held: no visual/render change; no component prop-interface change (`DmsBrowserProps` unchanged); no `func-dms` call/route/param change; browse functions still always fetch fresh; metadata + expanded-set only (no content/tokens); `oidFromToken` is cache-keying only (auth still enforced server-side); all sessionStorage access try/guarded. Verified locally: `npx tsc --noEmit` clean + `vite build` green.

## F-P7 — Plan body (Pass-3, on APPROVAL)
1. **`dmsClient.ts`** — add `SS_PREFIX` + guarded `ssGet` / `ssSet` / `ssClear`; hydrate `sitesCache` / `treeCache` / `expandedNodes` from sessionStorage at module load; write `ssSet('sites', …)` / `ssSet('tree', [...treeCache])` on the success paths, `ssSet('expanded', …)` in `setNodeExpanded`, and `ssClear()` in `clearDmsCache`.
2. **`DmsBrowser.tsx`** — add `oidFromToken` (base64url-safe payload decode; cache-keying only, no auth); on mount resolve the OID via `getAccessToken` and call `setDmsPrincipal`, gating the tree render until bound (hooks first, then the guarded early return).
3. **Verify**: `vite build` green; reload the SWA in the same tab → Vault Files paints the previously-expanded tree instantly (no "Loading clients…"), then revalidates; **same-tab sign-in as a different user shows that user's own view (their own/empty namespace), never the prior user's cache**; close the tab → next open starts fresh.
4. **Deploy**: build + publish the DMS remote to its dev SWA (development workflow); Origin + Sigma consume the updated `remoteEntry.js`.

## Mechanical lint
Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-SnapshotPersistence-L1-Pass-1-VEP/INDEX.md" --repo-root .` — expect `PASS`.

## Requested action
Codex Pass-2 review against Frontend Conformance §6 + the Golden Component Pack. Plan-only. On APPROVED, Claude Code executes Pass-3 per F-P7 on `development` and publishes the DMS remote. Layer 2 (`dms_delta`) and Layer 3 (func-chat change-feed) follow as separate packages.
