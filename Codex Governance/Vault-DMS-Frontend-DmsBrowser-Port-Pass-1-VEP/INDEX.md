# Vault DMS Frontend — `DmsBrowser` Port — Pass-1 Frontend Verified Evidence Pack

Plan/ratification VEP. Ratifies the federated `dmsApp/DmsBrowser` remote — a **faithful port** of the Reporting-FE-approved `vault-origin` `DmsMirror` into the vault-dms FE — for Codex Pass-2 review. Reviewer: Codex. (FE-first: the code is deployed on dms-dev; this pack grounds the port + parity.)

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: 027fcce (development; updated to the commit that first adds this VEP — T25 artifact-presence probe resolves there and at every later commit)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below; the lint's P/I/E enumeration is the backend §4A track, hence `N/A`.)

Current-turn grounding: Read the adopted `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` (§4B VA-D1) + `THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` + `CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md` + `CODEX_THEO_FRONTEND_REVIEW_STANDARD.md`; `spec/VAULT_DMS_FRONTEND_PLAN.md`; `spec/VAULT_DMS_API_SPEC.md` §2.2/§2.6; the faithful-port source `vault-origin/src/shell/dms/DmsMirror.tsx` + `dmsMirrorClient.ts`; the shipped `src/DmsBrowser.tsx` + `src/lib/dmsClient.ts`.

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §6 | "mapping every component region to the Primary Reference region with its EXACT / ALLOWED DELTA / DEVIATION" | Component Structural Mirror Table (F-I2) below |
| governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | Visual-parity: DmsBrowser reproduces Origin Vault Files pixel-for-pixel |
| governance/CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md | §6 | "Every backend-bound call (chat, projects, artifacts, settings, retrieval) routes through one services/contracts module — no scattered inline fetches" | `src/lib/dmsClient.ts` is the single service module |
| governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 cited in every CCT row (registered at 1f618b0) |
| spec/VAULT_DMS_FRONTEND_PLAN.md | §1 | "It calls only the DMS's own `func-dms` gateway" | Boundary: FE → func-dms OBO; no other backend |
| spec/VAULT_DMS_API_SPEC.md | §2.2 | "GET /api/dms_tree" | `dmsClient.getDmsTree` contract dependency |

## F-P1 — Feature identification

Microstep: `VAULT_DMS_FRONTEND_PLAN` §4 step-3 (ratify the faithful port) + Walter's Option-A direction (2026-07-14) — extract the DMS browser into a shared federated remote so Sigma and Origin mount one browser. The `DmsBrowser` is a **faithful port** of `DmsMirror` (VA-D1). In scope: `src/DmsBrowser.tsx` + `src/lib/dmsClient.ts` (+ the harness `main.tsx`/`harnessAuth.ts`, standalone-only). Deferred (not this pack): Origin adopting the remote (Reporting-FE), Sigma mounting it (Theo-FE Increment A).

## F-P2 — UI Authority Reconciliation

Sole in-scope visual authority: **VA-D1** (Vault DMS File Browser), CURRENT (registered 1f618b0), whose authority is Origin's `DmsMirror`. Result: **VISUAL-AUTHORITY-MATCH** — `DmsBrowser` reproduces Origin's "Vault Files" rail verbatim (Tailwind `theo-*` tokens, lucide icons, indent, `clientLabel = site_name`). No redesign; no VISUAL-AUTHORITY-DEVIATION claimed.

## F-P2.5 — Gap Disclosure

**PROCEED.** (1) The remote drops `DmsMirror`'s `useAppHost().setDmsContext` (shell-internal DMS-context reporting) — DEVIATION-REMOVED, justified: a standalone remote has no host `AppHostProvider`; a future `onContext` prop can restore it when a host needs it. PROCEED. (2) `DmsMirror`'s `FolderPickCoordinator` picker is replaced by simple `pickMode`/`onPickFolder` props (host-driven) — ALLOWED DELTA. (3) Cross-app CSS: the remote's `theo-*` classes are styled by the host's CSS (Origin ✓; standalone ships its own; Sigma must adopt `theo-*` in its Increment-A redesign) — PROCEED, noted for the Sigma mount. No PRE-LAND/ESCALATE.

## F-P3 — Contract grounding

The FE calls only `func-dms` (VAULT_DMS_API_SPEC): `GET /api/dms_list_sites` (§2.6 — tenant sites, `data.sites[].site_name`) and `GET /api/dms_tree?siteId=&parentItemId=` (§2.2 — folders+files, `data.dms_tree.children[]` with `item_id/name/type/has_children/web_url/mime_type`). Both DEPLOYED + golden-curl-verified. Single `Authorization: Bearer <token>` (host-injected `getAccessToken`; standalone MSAL harness); no `x-ms-token` on the FE — func-dms does the Graph OBO server-side. `dmsClient.ts` mirrors `vault-origin/dmsMirrorClient.ts` verbatim (same endpoints, shapes, `clientLabel = site_name`).

## F-P4 — Component reference grounding (Primary Reference)

**PRIMARY REFERENCE: `vault-origin/src/shell/dms/DmsMirror.tsx` + `dmsMirrorClient.ts`** — the Reporting-FE-approved DMS browser, named via VA-D1 (cross-repo faithful-port source; not in the vault-dms tree, so cited by VA-id + prose, not a Rule-Anchor file path). `DmsBrowser` lifts `DmsMirror`'s `fileTypeIcon` + `TreeNode` + tree verbatim; `dmsClient` lifts `dmsMirrorClient`'s `listDmsSites`/`getDmsTree`. Not GREENFIELD (a deployed analog exists); not composite.

## F-P5 — Component Contract Table

VA citation for all rows: **VA-D1** (§4B). Delta: **ALLOWED DELTA** (Golden Component Pack §5 — faithful port + the remote-contract adaptation; no rendered-surface change vs Origin Vault Files).

| Component (ownership) | Prop / input interface (TypeScript) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `dmsClient` (service module; NEW, ported) | `type ShellTokenProvider = (scope?: string) => Promise<string \| null>;` `interface DmsClient { clientKey: string; clientLabel: string }` `type DmsTreeNode = DmsFolderNode \| DmsFileNode` (discriminated, no `any`); `listDmsSites(getAccessToken): Promise<DmsClient[]>`; `getDmsTree(siteId: string, parentItemId: string \| undefined, getAccessToken): Promise<DmsTreeNode[]>` | VA-D1 — n/a (non-visual seam) | `dms_list_sites` (§2.6), `dms_tree` (§2.2) — verbatim shapes; `clientLabel = site_name ?? site_id` | PROCEED (deployed; ratify) |
| `DmsBrowser` (exposed remote; NEW, ported) | `interface DmsBrowserProps { getAccessToken: ShellTokenProvider; navSlot?: HTMLElement \| null; onOpenFile?: (node: DmsFileNode) => void; pickMode?: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string }) => void; }` | VA-D1 — the whole 1/10 tree | `listDmsSites` (roots) + `getDmsTree` (lazy children); file click → `onOpenFile` ?? `window.open(webUrl)` | PROCEED (deployed; ratify) |
| `TreeNode` (internal; ported verbatim) | `{ siteId; itemId?; label; hasChildren; depth; kind: 'client'\|'folder'\|'file'; getAccessToken; onOpenFile; pickMode; onPickFolder?; webUrl?; mimeType? }` (mirror of DmsMirror `TreeNode`, minus `picker`/`reportContext`) | VA-D1 — a tree row (Database/Folder/file icons, chevron, indent) | `getDmsTree` on expand | PROCEED |

## Component Structural Mirror Table (F-I2)

| Region (DmsBrowser) | DmsMirror region | Classification |
|---|---|---|
| `fileTypeIcon` (ext → lucide icon + colour) | `fileTypeIcon` | EXACT (verbatim) |
| `TreeNode` render (row classes, chevron/label buttons, indent `4+depth*12`, icons, `truncate`, `font-semibold` client) | `TreeNode` render | EXACT (Tailwind `theo-*` + lucide verbatim) |
| tree roots (`clients.map`, Database icon, `clientLabel`) | DmsMirror `clients.map` | EXACT |
| `dmsClient` `listDmsSites`/`getDmsTree` (endpoints, shapes, `site_name`) | `dmsMirrorClient` | EXACT (verbatim) |
| props: `getAccessToken`/`onOpenFile`/`pickMode`/`onPickFolder` + `navSlot` portal | `useAppHost`/`FolderPickCoordinator`/`reportContext` + shell placement | ALLOWED DELTA (remote contract; host-driven pick + portal) |
| `setDmsContext` reporting | `reportContext(setDmsContext)` | DEVIATION-REMOVED (no host provider standalone; future `onContext`) |
| "Vault Files" header + standalone rail/9-10 frame | ShellLeftPanel `filesZone` header (shell-owned) | ALLOWED DELTA (self-contained header for the standalone/remote; host may hide) |

## F-P6 — Repository & active-surface grounding

Target files on the active surface (Read this turn): `src/DmsBrowser.tsx`, `src/lib/dmsClient.ts`, `src/lib/harnessAuth.ts`, `src/main.tsx`. Guardrails: single service module (`dmsClient`); no app browser storage (MSAL manages its own cache, harness-only); `theo-*` palette matches Origin (no bespoke rail). `tsc --noEmit` exit 0; `vite build` OK (remoteEntry + DmsBrowser + `theo-*` CSS emitted); deployed to dms-dev (witty-sky), styled render verified.

## F-P7 — Plan body

The port is shipped FE-first (commits `3cc004a` faithful port + `8b7596e` harness). This VEP ratifies it. On Codex APPROVED: no code change required (parity confirmed); proceed to Origin adoption (Reporting-FE) + Sigma Increment-A mount. If Codex flags a parity gap, correct + resubmit.

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-DmsBrowser-Port-Pass-1-VEP/INDEX.md" --repo-root .`

Expect `PASS` and exit `0`.

## Requested action

Codex Pass-2 review against the adopted Frontend Conformance Standard §6 + the Golden Component Pack — verify the CCT (prop interface / VA-D1 / contract dependency), the Structural Mirror Table (EXACT vs DmsMirror), and visual parity. Re-run the lint. APPROVED/REJECTED only.
