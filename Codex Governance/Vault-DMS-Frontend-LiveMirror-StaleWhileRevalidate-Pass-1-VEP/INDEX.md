# Vault DMS Frontend — live-mirror stale-while-revalidate (instant re-entry, no full reload) — Pass-1 Frontend Verified Evidence Pack

Plan-only VEP. Today every time a host hides and re-shows the DMS tree (e.g. the Origin app-rail switching the 1/10 away from Vault Files and back), the browser re-runs the whole load loop — "Loading clients…" + re-expanding every folder — because the tree is a live fetch, not persisted. Walter's constraint: the DMS MUST stay a true live mirror of SharePoint (no pseudo/stale copy); the ask is a background check-and-update that "updates what's there" instead of reloading the entire DMS. Fix (stale-while-revalidate, data-layer only): `dmsClient` keeps a session snapshot of the last SUCCESSFUL site list + per-folder listings + which nodes are expanded, and exposes it for **instant first paint**; the browse functions ALWAYS fetch fresh, so on (re)mount `DmsBrowser` paints the last-known tree immediately (no blank flash), restores the expanded shape, then revalidates in the background and patches in place — React reconciles by SharePoint item id, so new/renamed/removed files appear and expanded folders stay open. Nothing is served as authoritative-stale; the mirror still converges to live SharePoint on every view. Snapshot clears on full page reload (sign-out / token re-auth) or `clearDmsCache()`. Scope: `src/lib/dmsClient.ts` + `src/DmsBrowser.tsx` only. No visual change, no `func-dms` / API-Spec change. Reviewer: Codex (FE).

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: c04f773345a0c2efcf603fe54f7ba534cd65a1fb (development; the commit that first adds this VEP — T25 artifact-presence probe resolves there and at every later commit; grounding reads were against parent 58a810d)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below; the lint's P/I/E enumeration is the backend §4A track, hence `N/A`.)

Current-turn grounding: Read the shipped `src/lib/dmsClient.ts` (blob `d6165bf`: `listDmsSites` GET `dms_list_sites` → `{clientKey, clientLabel}` map; `getDmsTree(siteId, parentItemId, getAccessToken)` GET `dms_tree` → folder/file node map) and `src/DmsBrowser.tsx` (blob `537c422`: `Tree` `useEffect([getAccessToken])` calling `listDmsSites`; `TreeNode` `expanded`/`children`/`loading` state + `loadChildren`/`toggle`); `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` §4B (VA-D1); `governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` §6/§7; `spec/VAULT_DMS_API_SPEC.md` §2.2 (`dms_tree`) + §2.6 (`dms_list_sites`).

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | F-P2 — behavioral/data-layer only; the tree renders identically (VA-D1 match) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 (Vault DMS File Browser) — registered; the only VA cited |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/spec/VAULT_DMS_API_SPEC.md | §2.2 | "browse a site/drive tree (FILES AND FOLDERS)" | F-P3 — revalidation refetches `dms_tree` (unchanged contract); no new route/param |

## F-P1 — Feature identification
Microstep: make the DMS remote paint instantly on re-entry and refresh in the background instead of re-running the full load loop, WITHOUT becoming a stale/side copy — it stays a live mirror by always revalidating. In scope: `src/lib/dmsClient.ts` (session snapshot + expansion state + getters) + `src/DmsBrowser.tsx` (paint-from-snapshot, restore expansion, revalidate-and-patch). Deferred: an explicit host "refresh" affordance wired to `clearDmsCache()` (exposed, not yet consumed).

## F-P2 — UI Authority Reconciliation
- **VA-D1** (Vault DMS File Browser) — **VISUAL-AUTHORITY-MATCH.** No new element, token, icon, indent, or interaction; the tree renders identically. The only change is timing/data-flow: the previously-loaded tree is shown immediately and updated in place rather than reloaded. Pixel-identical to Origin's Vault Files, unchanged.
- No new VA. Only VA-D1 (registered §4B) cited.

## F-P2.5 — Gap Disclosure
**PROCEED.** (1) **Liveness preserved** — the snapshot is NEVER served as authoritative: every (re)mount and every folder expand fires a fresh `dms_list_sites` / `dms_tree` fetch, so the view converges to live SharePoint within one background round-trip. This satisfies the anti-fake-DMS / exact-mirror constraint (VO1 §5). (2) **Failure-safe** — only successful fetches populate the snapshot; a transient error never overwrites last-known and retries next call. (3) **Lifetime** — snapshot + expansion state are module-scoped, cleared on full page reload (sign-out / token re-auth) or `clearDmsCache()`; no persistence to storage. (4) **Back-compatible** — standalone dms-dev harness and other hosts are unaffected (same component API). No PRE-LAND / ESCALATE.

## F-P3 — Contract grounding
No `func-dms` / API-Spec change. Revalidation reuses the deployed `dms_list_sites` (§2.6) and `dms_tree` (§2.2) exactly as today; the snapshot stores their mapped results in memory. No new route, param, or response field.

## F-P4 — Component reference grounding (Primary Reference)
**PRIMARY REFERENCE: the shipped `src/lib/dmsClient.ts` (blob `d6165bf`) + `src/DmsBrowser.tsx` (blob `537c422`)** — the surfaces edited. Not GREENFIELD, not composite.

## F-P5 — Component Contract Table

| Component (ownership) | Prop / input interface (TypeScript — full literal) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `DmsBrowser` (`DmsBrowser.tsx`; ACTIVE, modify) | `export interface DmsBrowserProps { navSlot?: HTMLElement \| null; getAccessToken: ShellTokenProvider; onOpenFile?: (node: DmsFileNode) => void; pickMode?: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void }` — interface UNCHANGED. | VA-D1 | `dms_list_sites` §2.6 / `dms_tree` §2.2 (unchanged) | PROCEED |
| `Tree` (internal; `DmsBrowser.tsx`; ACTIVE, modify) | `{ getAccessToken: ShellTokenProvider; onOpenFile: (n: DmsFileNode) => void; pickMode: boolean; onPickFolder?: (p: { siteId: string; itemId: string; name: string; parentName?: string }) => void; showHeader: boolean }` — props UNCHANGED; `clients`/`loading` state now seed from `getCachedSites()` and revalidate. | VA-D1 | via `listDmsSites` | PROCEED |
| `TreeNode` (internal; `DmsBrowser.tsx`; ACTIVE, modify) | `interface TreeNodeProps { siteId: string; itemId?: string; label: string; hasChildren: boolean; depth: number; kind: 'client' \| 'folder' \| 'file'; getAccessToken: ShellTokenProvider; onOpenFile: (node: DmsFileNode) => void; pickMode: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void; parentName?: string; webUrl?: string; mimeType?: string; webDavUrl?: string }` — interface UNCHANGED; `expanded` seeds from `isNodeExpanded(nodeKey)`, `children` from `getCachedTree(...)`, `toggle` persists via `setNodeExpanded`, and a mount effect revalidates a restored-expanded node. | VA-D1 | via `getDmsTree` | PROCEED |
| `dmsClient` module (`lib/dmsClient.ts`; ACTIVE, modify) | New exports: `getCachedSites(): DmsClient[] \| null`; `getCachedTree(siteId: string, parentItemId?: string): DmsTreeNode[] \| null`; `isNodeExpanded(nodeKey: string): boolean`; `setNodeExpanded(nodeKey: string, expanded: boolean): void`; `clearDmsCache(): void`. `listDmsSites` / `getDmsTree` signatures UNCHANGED — they now populate the snapshot on success. | n/a (data layer) | `dms_list_sites` §2.6 / `dms_tree` §2.2 | PROCEED |

No `any`. Interfaces pasted full-literal; component prop interfaces are UNCHANGED — the change is internal state seeding + new module-level snapshot helpers.

## Component Structural Mirror Table (F-I2)

| Region (vault-dms FE) | Primary Reference | Classification |
|---|---|---|
| `dmsClient` `+ sitesCache/treeCache/expandedNodes` + `getCachedSites/getCachedTree/isNodeExpanded/setNodeExpanded/clearDmsCache` + populate-on-success in `listDmsSites`/`getDmsTree` | shipped `dmsClient.ts` (blob `d6165bf`) | ALLOWED DELTA (additive in-memory snapshot + getters; fetch paths unchanged, always fetch fresh) |
| `Tree` `clients`/`loading` seed from `getCachedSites()` + revalidate-and-patch | shipped `DmsBrowser.tsx` `Tree` (blob `537c422`) | ALLOWED DELTA (same fetch, seeded initial state; no render change) |
| `TreeNode` `expanded`←`isNodeExpanded`, `children`←`getCachedTree`, `toggle`→`setNodeExpanded`, mount-revalidate of restored-expanded nodes | shipped `DmsBrowser.tsx` `TreeNode` (blob `537c422`) | ALLOWED DELTA (state seeding + persistence; recursion/render unchanged) |

## F-P6 — Repository & active-surface grounding
Target files (Read this turn): `src/lib/dmsClient.ts`, `src/DmsBrowser.tsx`. Guardrails: no visual/icon/indent/token/interaction change; no other component; no `func-dms` call/route/param change; the browse functions still always fetch fresh (live mirror). Verified locally: `npx tsc --noEmit` clean + `vite build` green.

## F-P7 — Plan body (Pass-3, on APPROVAL)
1. **`dmsClient.ts`** — add module-scoped `sitesCache` / `treeCache` (`Map<key, DmsTreeNode[]>`, key `${siteId}|${parentItemId ?? ''}`) / `expandedNodes` (`Set<string>`); export `getCachedSites`, `getCachedTree`, `isNodeExpanded`, `setNodeExpanded`, `clearDmsCache`; in `listDmsSites`/`getDmsTree`, set the snapshot on the SUCCESS path only and return the mapped result (signatures unchanged; every call still fetches).
2. **`DmsBrowser.tsx`** — `Tree`: seed `clients`/`loading` from `getCachedSites()`; effect still calls `listDmsSites` (spinner only when nothing cached) and patches state. `TreeNode`: seed `expanded` from `isNodeExpanded(itemId ?? siteId)` and `children` from `getCachedTree(siteId, itemId)`; `toggle` persists via `setNodeExpanded` and revalidates on expand; a mount-only effect revalidates a restored-expanded node (cached children shown instantly).
3. **Verify**: `vite build` green; re-entering Vault Files shows the previously-expanded tree instantly, then a background `dms_tree`/`dms_list_sites` fetch patches new/removed files in place (no full "Loading…" loop); a freshly-added SharePoint file appears on the next revalidate.
4. **Deploy**: build + publish the DMS remote to its dev SWA (development workflow); Origin + Sigma consume the updated `remoteEntry.js`.

## Mechanical lint
Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-LiveMirror-StaleWhileRevalidate-Pass-1-VEP/INDEX.md" --repo-root .` — expect `PASS`.

## Requested action
Codex Pass-2 review against Frontend Conformance §6 + the Golden Component Pack. Plan-only. On APPROVED, Claude Code executes Pass-3 per F-P7 on `development` and publishes the DMS remote (consumed by Origin + Sigma).
