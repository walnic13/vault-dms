# Vault DMS Frontend — `DmsBrowser` folder-pick carries `parentName` — Pass-1 Frontend Verified Evidence Pack

Plan-only VEP. Consumers of the `dmsApp/DmsBrowser` folder-pick (Sigma's New-Review picker) need the picked folder's **parent** name to title a review after the fund (the folder above the period), but the pick payload today is `{ siteId, itemId, name }` — no parent. The tree already knows each node's parent (a `TreeNode` renders its children, so the child's parent is that node's `label`). Fix: add an **optional `parentName`** to the folder-pick callback — `TreeNode` emits `parentName` on pick and passes `parentName={label}` to its child rows. No visual change (a callback-payload field only); back-compatible (optional). Reviewer: Codex (FE).

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: __HEAD__ (development; the commit that first adds this VEP — T25 artifact-presence probe resolves there and at every later commit)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below; the lint's P/I/E enumeration is the backend §4A track, hence `N/A`.)

Current-turn grounding: Read the shipped `src/DmsBrowser.tsx` (line 50 `onPickFolder?: (pick: { siteId: string; itemId: string; name: string }) => void` in `TreeNodeProps`; line 80–82 the `onPickFolder({ siteId, itemId, name: label })` emission; line 138–154 the child `TreeNode` render; line 166 `DmsBrowserProps.onPickFolder`; line 173 the `Tree` inner `onPickFolder`); `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` §4B (VA-D1 — the DMS File Browser) + `THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` §6/§7; `spec/VAULT_DMS_FRONTEND_PLAN.md` (Folder pick row).

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §6 | "mapping every component region to the Primary Reference region with its EXACT / ALLOWED DELTA / DEVIATION" | Component Structural Mirror Table (F-I2) below |
| governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | additive callback field only; the tree renders identically (F-P2) |
| governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 (DMS File Browser) — registered |
| spec/VAULT_DMS_FRONTEND_PLAN.md | (Folder pick) | "clicking a folder calls the host's" | the `onPickFolder` emission that now also carries the parent name |

## F-P1 — Feature identification

Microstep: `VAULT_DMS_FRONTEND_PLAN` "Folder pick" — in `pickMode`, clicking a folder calls the host's `onPickFolder`. A consumer (Sigma New-Review) needs the picked folder's parent to name a review after the fund folder above the period; the pick payload carries no parent. The `TreeNode` already has the parent in hand: it renders its children, so a child's parent folder is the rendering node's `label`. Fix: add optional `parentName` to the pick callback across the three inline pick signatures + emit it. In scope: `src/DmsBrowser.tsx` only. Deferred: the Sigma consumer (its own package) that reads `parentName`.

## F-P2 — UI Authority Reconciliation

- **VA-D1** (Vault DMS File Browser) — `DmsBrowser`: **VISUAL-AUTHORITY-MATCH**. The change adds a field to the `onPickFolder` **callback payload** and passes the parent `label` down the recursion; it renders no new element, changes no token, icon, indent, or interaction. The tree is pixel-identical to Origin's Vault Files, unchanged.
- No new VA. Only VA-D1 (registered §4B) cited.

## F-P2.5 — Gap Disclosure

**PROCEED.** (1) `parentName` is **optional** — existing consumers (Origin, which ignores the pick payload's extra field) are unaffected; a root-level folder whose parent is a client root passes the client `label` (or `undefined` at the very top), which the consumer treats as a fallback. Disclosed, PROCEED. (2) The authority VA-D1 is a faithful port of Origin's `DmsMirror`, which has no folder-pick; this additive callback field is an ALLOWED DELTA to the port (a functional pick affordance the Plan's "Folder pick" row already contemplates), not a visual redesign. Disclosed, PROCEED. No PRE-LAND/ESCALATE.

## F-P3 — Contract grounding

The folder-pick callback contract gains an **optional** `parentName?: string` at all three inline occurrences (`TreeNodeProps`, the inner `Tree` signature, and the exported `DmsBrowserProps`). No `func-dms` route changes; no data-shape change on the wire (the parent name is already client-side, from the tree the browser rendered).

## F-P4 — Component reference grounding (Primary Reference)

**PRIMARY REFERENCE: the shipped `src/DmsBrowser.tsx`** (the surface edited). Not GREENFIELD, not composite.

## F-P5 — Component Contract Table

| Component (ownership) | Prop / input interface (TypeScript — full literal) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `DmsBrowser` (`DmsBrowser.tsx`; ACTIVE, modify) | `export interface DmsBrowserProps { navSlot?: HTMLElement \| null; getAccessToken: ShellTokenProvider; onOpenFile?: (node: DmsFileNode) => void; pickMode?: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void }` — only `parentName?: string` added to the pick payload. | VA-D1 (DMS File Browser) | none new (parent name is client-side, from the rendered tree) | PROCEED |
| `TreeNode` (internal; `DmsBrowser.tsx`; ACTIVE, modify) | `interface TreeNodeProps { siteId: string; itemId?: string; label: string; hasChildren: boolean; depth: number; kind: 'client' \| 'folder' \| 'file'; getAccessToken: ShellTokenProvider; onOpenFile: (node: DmsFileNode) => void; pickMode: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void; parentName?: string; webUrl?: string; mimeType?: string }` — added `parentName?: string` (this node's parent label) + `parentName?` on the pick callback. Emit: `onPickFolder({ siteId, itemId, name: label, parentName })`; child render passes `parentName={label}`. | VA-D1 | none | PROCEED |

No `any`. Interfaces pasted full-literal; the only members added are the optional `parentName?: string` (prop + callback field).

## Component Structural Mirror Table (F-I2)

| Region (vault-dms FE) | Primary Reference | Classification |
|---|---|---|
| `TreeNode` pick emission `+ parentName` + child `parentName={label}` | shipped `DmsBrowser.tsx` line 80–82 + 138–154 | ALLOWED DELTA (additive callback field + one prop threaded through the existing recursion; no visual/render change) |
| `TreeNodeProps` / `Tree` / `DmsBrowserProps` pick signature `+ parentName?` | shipped `DmsBrowser.tsx` lines 50 / 173 / 166 | ALLOWED DELTA (additive optional field; back-compatible) |

## F-P6 — Repository & active-surface grounding

Target file (Read this turn): `src/DmsBrowser.tsx`. Guardrails: the only changes are (a) `parentName?: string` added to the three inline pick signatures + `TreeNodeProps`, (b) the pick emission includes `parentName`, (c) child `TreeNode`s receive `parentName={label}`; no icon/indent/token/interaction change; no other component; no `func-dms` call change.

## F-P7 — Plan body (Pass-3, on APPROVAL)

1. **`DmsBrowser.tsx`** — `TreeNodeProps`: add `parentName?: string` and change the pick callback type to `onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void`.
2. Destructure `parentName` in `TreeNode`; emission → `onPickFolder({ siteId, itemId, name: label, parentName })`.
3. Child render (the recursive `TreeNode`) → add `parentName={label}`.
4. Widen the inner `Tree` `onPickFolder` type and the exported `DmsBrowserProps.onPickFolder` to the same `{ …; parentName?: string }`.
5. **Verify**: `vite build` green; picking a folder in `pickMode` fires `onPickFolder` with `parentName` = the parent folder's name (root picks → the client label / `undefined`); Origin (ignores the field) unaffected.
6. **Pass-3 evidence** → SWA test plan; the Sigma consumer package confirms the fund name end-to-end.

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-PickParentName-Pass-1-VEP/INDEX.md" --repo-root .`

Expect `PASS` and exit `0`.

## Requested action

Codex Pass-2 review against Frontend Conformance §6 + the Golden Component Pack. Plan-only; no code changed. On APPROVED, Claude Code executes Pass-3 per F-P7 on `development`. The companion Sigma package (consumes `parentName`) is submitted alongside.
