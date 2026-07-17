# Vault DMS Frontend — `DmsBrowser` file node carries `webDavUrl` — Pass-1 Frontend Verified Evidence Pack

Plan-only VEP. The Origin shell opens Office files in the desktop app via `ms-excel:ofe|u|<url>`, which needs the file's **direct** SharePoint path — the DriveItem `webDavUrl`, now returned by `dms_tree` as `web_dav_url` (backend landed; API Spec §2.2). The FE file node today carries only `webUrl` (a `Doc.aspx` viewer URL the desktop app can't open). Fix: `dmsClient` maps `web_dav_url` → an optional `webDavUrl` on `DmsFileNode`, and `DmsBrowser` includes it in the `onOpenFile({kind:'file',…})` payload. No visual change (a data-field only); back-compatible (optional). Reviewer: Codex (FE).

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 1 — Frontend Verified Evidence Pack
Turn issued against HEAD: __PKG_COMMIT__ (development; the commit that first adds this VEP — T25 artifact-presence probe resolves there and at every later commit)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

(Frontend sub-phase track = F-P1–F-P7 per Frontend Conformance §4A.1, walked below; the lint's P/I/E enumeration is the backend §4A track, hence `N/A`.)

Current-turn grounding: Read the shipped `src/lib/dmsClient.ts` (`DmsFileNode` lines 22–28 `{ kind:'file'; itemId; name; webUrl; mimeType? }`; the `getDmsTree` response type + `.map` file branch lines ~90–101 building `{ kind:'file', itemId, name, webUrl, mimeType }`) and `src/DmsBrowser.tsx` (`TreeNodeProps` `webUrl?`/`mimeType?` lines 52–53; the `onOpenFile({ kind:'file', itemId, name, webUrl, mimeType })` emission line 78; the child `TreeNode` render lines 148–149); `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` §4B (VA-D1); `THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` §6/§7; `spec/VAULT_DMS_API_SPEC.md` §2.2 (`web_dav_url` landed).

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §6 | "mapping every component region to the Primary Reference region with its EXACT / ALLOWED DELTA / DEVIATION" | Component Structural Mirror Table (F-I2) below |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md | §7 | "reproduced faithfully, no redesign" | additive data field only; the tree renders identically (F-P2) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | §4B | "MUST be registered here before it may be cited." | VA-D1 (DMS File Browser) — registered |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/spec/VAULT_DMS_API_SPEC.md | §2.2 | "web_dav_url? (files, WebDAV direct path for desktop-app open)" | the field `dmsClient` now maps onto `DmsFileNode.webDavUrl` |

## F-P1 — Feature identification
Microstep: thread the deployed `dms_tree` `web_dav_url` (API Spec §2.2) through the FE file node so the host can open Office files in the desktop app. In scope: `src/lib/dmsClient.ts` + `src/DmsBrowser.tsx` only. Deferred: the Origin consumer (`officeOpen` — its own Reporting-FE package) that reads `webDavUrl`.

## F-P2 — UI Authority Reconciliation
- **VA-D1** (Vault DMS File Browser) — `DmsBrowser`: **VISUAL-AUTHORITY-MATCH**. The change adds an optional field to `DmsFileNode` and to the `onOpenFile` **callback payload**; it renders no new element, changes no token, icon, indent, or interaction. Files still open via the host's `onOpenFile`. Pixel-identical to Origin's Vault Files, unchanged.
- No new VA. Only VA-D1 (registered §4B) cited.

## F-P2.5 — Gap Disclosure
**PROCEED.** `webDavUrl` is **optional** — existing consumers (the standalone `window.open(webUrl)` fallback, and Origin before its paired change) are unaffected; a file whose `web_dav_url` is null (rare) yields `webDavUrl: undefined` and the consumer falls back to `webUrl`. Back-compatible; no PRE-LAND/ESCALATE.

## F-P3 — Contract grounding
The file node gains an **optional** `webDavUrl?: string`, mapped from the deployed `dms_tree` response field `web_dav_url` (API Spec §2.2, landed). No `func-dms` route change; the value is read from the response the browser already fetches.

## F-P4 — Component reference grounding (Primary Reference)
**PRIMARY REFERENCE: the shipped `src/lib/dmsClient.ts` + `src/DmsBrowser.tsx`** (the surfaces edited). Not GREENFIELD, not composite.

## F-P5 — Component Contract Table

| Component (ownership) | Prop / input interface (TypeScript — full literal) | Visual authority | Data / contract dependency | Impl eligibility |
|---|---|---|---|---|
| `DmsFileNode` (`dmsClient.ts`; ACTIVE, modify) | `export interface DmsFileNode { kind: 'file'; itemId: string; name: string; webUrl: string; mimeType?: string; webDavUrl?: string }` — only `webDavUrl?: string` added. | VA-D1 | `dms_tree` §2.2 `web_dav_url` (files) | PROCEED |
| `DmsBrowser` (`DmsBrowser.tsx`; ACTIVE, modify) | `export interface DmsBrowserProps { navSlot?: HTMLElement \| null; getAccessToken: ShellTokenProvider; onOpenFile?: (node: DmsFileNode) => void; pickMode?: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void }` — interface UNCHANGED; the `DmsFileNode` it passes to `onOpenFile` now carries `webDavUrl`. | VA-D1 | via `DmsFileNode` | PROCEED |
| `TreeNode` (internal; `DmsBrowser.tsx`; ACTIVE, modify) | `interface TreeNodeProps { siteId: string; itemId?: string; label: string; hasChildren: boolean; depth: number; kind: 'client' \| 'folder' \| 'file'; getAccessToken: ShellTokenProvider; onOpenFile: (node: DmsFileNode) => void; pickMode: boolean; onPickFolder?: (pick: { siteId: string; itemId: string; name: string; parentName?: string }) => void; parentName?: string; webUrl?: string; mimeType?: string; webDavUrl?: string }` — added `webDavUrl?: string`; emit `onOpenFile({ kind:'file', itemId, name: label, webUrl, mimeType, webDavUrl })`; child render passes `webDavUrl={child.kind === 'file' ? child.webDavUrl : undefined}`. | VA-D1 | via `DmsFileNode` | PROCEED |

No `any`. Interfaces pasted full-literal; the only members added are the optional `webDavUrl?: string`.

## Component Structural Mirror Table (F-I2)

| Region (vault-dms FE) | Primary Reference | Classification |
|---|---|---|
| `dmsClient.getDmsTree` file branch `+ webDavUrl: n.web_dav_url` + response type `+ web_dav_url?` | shipped `dmsClient.ts` lines ~90–101 | ALLOWED DELTA (additive optional field from the same deployed response; no new call) |
| `DmsFileNode` `+ webDavUrl?` | shipped `dmsClient.ts` lines 22–28 | ALLOWED DELTA (additive optional field; back-compatible) |
| `TreeNode` open emission `+ webDavUrl` + child `webDavUrl={…}` + `TreeNodeProps webDavUrl?` | shipped `DmsBrowser.tsx` lines 52–53 / 78 / 148–149 | ALLOWED DELTA (additive field threaded through the existing recursion; no visual/render change) |

## F-P6 — Repository & active-surface grounding
Target files (Read this turn): `src/lib/dmsClient.ts`, `src/DmsBrowser.tsx`. Guardrails: the only changes are the optional `webDavUrl` on `DmsFileNode`, its mapping from `web_dav_url`, and threading it into the `onOpenFile` payload; no icon/indent/token/interaction change; no other component; no `func-dms` call change.

## F-P7 — Plan body (Pass-3, on APPROVAL)
1. **`dmsClient.ts`** — `DmsFileNode`: add `webDavUrl?: string`. In `getDmsTree`, add `web_dav_url?: string` to the response element type (both the `json` type and the filter type guard), and the file-branch map → `{ kind:'file', itemId, name, webUrl: n.web_url ?? '', mimeType: n.mime_type, webDavUrl: n.web_dav_url }`.
2. **`DmsBrowser.tsx`** — `TreeNodeProps`: add `webDavUrl?: string`; destructure in `TreeNode`; emission → `onOpenFile({ kind:'file', itemId: itemId ?? '', name: label, webUrl: webUrl ?? '', mimeType, webDavUrl })`; child render → add `webDavUrl={child.kind === 'file' ? child.webDavUrl : undefined}`; add `webDavUrl` to the `onLabelClick` deps.
3. **Verify**: `vite build` green; a file's `onOpenFile` node carries `webDavUrl` = the `https://vaulttax.sharepoint.com/…` direct path; standalone/Origin fallback (`webUrl`) unaffected when absent.
4. **Pass-3 evidence** → the paired Origin `officeOpen` package uses `webDavUrl` and confirms desktop open end-to-end.

## Mechanical lint
Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Frontend-WebDavUrl-Pass-1-VEP/INDEX.md" --repo-root .` — expect `PASS`.

## Requested action
Codex Pass-2 review against Frontend Conformance §6 + the Golden Component Pack. Plan-only; no code changed. On APPROVED, Claude Code executes Pass-3 per F-P7 on `development`; the paired Origin `officeOpen` package consumes `webDavUrl`.
