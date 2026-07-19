# Vault DMS Frontend — Layer 1: sessionStorage snapshot persistence (instant paint across reloads) — Pass-1 Frontend Verified Evidence Pack

Plan-only VEP. The Codex-APPROVED live-mirror change (`…-LiveMirror-StaleWhileRevalidate-…`) keeps its snapshot in-memory, so it survives in-session rail-context switches but NOT a page reload — reloading the SWA in the same tab re-runs the full load loop from scratch (Walter). This is **Layer 1** of the OneDrive-style three-layer plan (local cache → delta → change-notifications): mirror the existing session snapshot (site list + folder listings + expanded-node set) to **sessionStorage**, so the tree also paints instantly after a page reload within the same tab. sessionStorage is per-tab and cleared on tab close (the session boundary) and is wiped explicitly on sign-out via `clearDmsCache()`. This never bypasses revalidation — the browse functions still always fetch fresh (and Layer 2 delta / Layer 3 push land behind it) — so the mirror stays live; this only removes the blank reload. Scope: `src/lib/dmsClient.ts` only. No component/visual change, no `func-dms` / API-Spec change. Back-compatible (try/guarded — if sessionStorage is unavailable, in-memory behaves exactly as today). Reviewer: Codex (FE).

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: <<PKG_COMMIT>> (development; the commit that first adds this VEP — T25 artifact-presence probe resolves there and at every later commit; grounding reads were against parent c131111)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below; the lint's P/I/E enumeration is the backend §4A track, hence `N/A`.)

Current-turn grounding: Read the shipped `src/lib/dmsClient.ts` (blob `9c1608d`: the in-memory `sitesCache` / `treeCache` / `expandedNodes` snapshot + `getCachedSites` / `getCachedTree` / `isNodeExpanded` / `setNodeExpanded` / `clearDmsCache`, populated on the success path of `listDmsSites` / `getDmsTree`); `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` §4B (VA-D1); `governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` §7.

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | F-P2 — data-layer only; no component/render change (VA-D1 match) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 (Vault DMS File Browser) — the only VA touched (indirectly; no render change) |

## F-P1 — Feature identification
Microstep: persist the existing SWR snapshot to sessionStorage so instant paint also covers page reload (not just in-session context switches), WITHOUT weakening the live-mirror guarantee. In scope: `src/lib/dmsClient.ts` only (add guarded sessionStorage hydrate-on-load + persist-on-success; no signature change). Layer 2 (`dms_delta`, func-dms) and Layer 3 (change-notifications in func-chat) are separate packages.

## F-P2 — UI Authority Reconciliation
- **VA-D1** (Vault DMS File Browser) — **VISUAL-AUTHORITY-MATCH.** No component touched; `DmsBrowser` is unchanged. Pure data-layer persistence of the snapshot the client already keeps. No new element, token, icon, indent, or interaction.
- No new VA.

## F-P2.5 — Gap Disclosure
**PROCEED.** (1) **Liveness preserved** — sessionStorage only seeds instant paint; every mount / expand / `active` re-show still fetches fresh (the approved SWR + re-show signal), so the view converges to live SharePoint. (2) **Session boundary** — per-tab, cleared on tab close; wiped on sign-out via `clearDmsCache()`; no cross-user/cross-tab leakage (sessionStorage is origin+tab scoped). (3) **Failure-safe** — all access is try/guarded; quota-exceeded or privacy-mode falls back to the in-memory snapshot (today's behavior). (4) **Serialization** — `DmsClient` / `DmsTreeNode` are plain JSON (no functions/React); round-trip is lossless. (5) **Sensitivity** — caches folder/file NAMES only (no content, no tokens) in a per-tab store on a hardened employees-only origin. No PRE-LAND / ESCALATE.

## F-P3 — Contract grounding
No `func-dms` / API-Spec change. sessionStorage stores the already-fetched, already-mapped results of `dms_list_sites` (§2.6) / `dms_tree` (§2.2). No new route/param/field.

## F-P4 — Component reference grounding (Primary Reference)
**PRIMARY REFERENCE: the shipped `src/lib/dmsClient.ts` (blob `9c1608d`)** — the surface edited. Not GREENFIELD, not composite.

## F-P5 — Component Contract Table

| Component (ownership) | Prop / input interface (TypeScript — full literal) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `dmsClient` module (`lib/dmsClient.ts`; ACTIVE, modify) | Exported API UNCHANGED: `getCachedSites(): DmsClient[] \| null`; `getCachedTree(siteId: string, parentItemId?: string): DmsTreeNode[] \| null`; `isNodeExpanded(nodeKey: string): boolean`; `setNodeExpanded(nodeKey: string, expanded: boolean): void`; `clearDmsCache(): void`; `listDmsSites` / `getDmsTree` signatures UNCHANGED. Internal: snapshot vars hydrate from sessionStorage on load; `setNodeExpanded` + the two success paths + `clearDmsCache` write/clear sessionStorage (guarded). | VA-D1 (no render change) | `dms_list_sites` §2.6 / `dms_tree` §2.2 (unchanged) | PROCEED |
| `DmsBrowser` (`DmsBrowser.tsx`; ACTIVE) | UNCHANGED — consumes the same getters; benefits transparently from the persisted snapshot. | VA-D1 | via getters | UNCHANGED |

No `any`. No exported signature changed; the delta is guarded sessionStorage I/O behind the existing snapshot.

## Component Structural Mirror Table (F-I2)

| Region (vault-dms FE) | Primary Reference | Classification |
|---|---|---|
| `dmsClient` `+ ssGet/ssSet/ssClear` helpers + hydrate `sitesCache`/`treeCache`/`expandedNodes` from sessionStorage on load + persist on the `listDmsSites`/`getDmsTree` success paths, `setNodeExpanded`, `clearDmsCache` | shipped `dmsClient.ts` snapshot (blob `9c1608d`) | ALLOWED DELTA (additive persistence of the existing in-memory snapshot; fetch paths + exported API unchanged; try/guarded) |

## F-P6 — Repository & active-surface grounding
Target file (Read this turn): `src/lib/dmsClient.ts`. Guardrails: no component/visual change; no exported signature change; no `func-dms` call/route/param change; browse functions still always fetch fresh; all sessionStorage access try/guarded. Verified locally: `npx tsc --noEmit` clean + `vite build` green.

## F-P7 — Plan body (Pass-3, on APPROVAL)
1. **`dmsClient.ts`** — add `SS_PREFIX` + guarded `ssGet` / `ssSet` / `ssClear`; hydrate `sitesCache` / `treeCache` / `expandedNodes` from sessionStorage at module load; write `ssSet('sites', …)` / `ssSet('tree', [...treeCache])` on the success paths, `ssSet('expanded', …)` in `setNodeExpanded`, and `ssClear()` in `clearDmsCache`.
2. **Verify**: `vite build` green; reload the SWA in the same tab → Vault Files paints the previously-expanded tree instantly (no "Loading clients…"), then revalidates; close the tab / sign out → next open starts fresh.
3. **Deploy**: build + publish the DMS remote to its dev SWA (development workflow); Origin + Sigma consume the updated `remoteEntry.js`.

## Mechanical lint
Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-SnapshotPersistence-L1-Pass-1-VEP/INDEX.md" --repo-root .` — expect `PASS`.

## Requested action
Codex Pass-2 review against Frontend Conformance §6 + the Golden Component Pack. Plan-only. On APPROVED, Claude Code executes Pass-3 per F-P7 on `development` and publishes the DMS remote. Layer 2 (`dms_delta`) and Layer 3 (func-chat change-feed) follow as separate packages.
