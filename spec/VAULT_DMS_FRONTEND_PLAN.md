# VAULT DMS FRONTEND PLAN

Scope: the Vault DMS frontend — a **federated file-browser micro-frontend** (`dmsApp/DmsBrowser`) that renders the tenant SharePoint DMS the signed-in user can see. Frontend-first, governed under the adopted Theo FE governance suite. Reviewer: **Codex**.

> **Status: v0.1 DRAFT.** The DMS FE is a **1/10-rail-only** app (a file tree; **no 9/10** — files open in SharePoint) that mounts into host shells (Vault Origin, Sigma, future apps) via in-shell Module Federation, exactly like Theo (portal into a host `navSlot`; the host owns the rail's collapse/drag chrome and injects `getAccessToken`). It is a **faithful port** of the Reporting-FE-approved `vault-origin/src/shell/dms/DmsMirror.tsx` + `dmsMirrorClient.ts` (VA-D1) — same Tailwind `theo-*` palette, `lucide-react` icons, tree behaviour, and `clientLabel = site_name` rendering; it is **not** a redesign. The backend gateway (`func-dms`, stateless OBO) lives in `api/`.

---

## §0 The product

One DMS file browser, written once, mounted everywhere. Origin's inline `DmsMirror` and Sigma's New-Review picker both become consumers of the single `dmsApp/DmsBrowser` remote (no per-app reimplementation).

## §1 Boundary + governance

- FE is a **Module-Federation remote** (`dmsApp/DmsBrowser`); runs standalone as the dms-dev harness. It calls only the DMS's own `func-dms` gateway (`dms_list_sites`, `dms_tree`) OBO as the signed-in user; SharePoint stays the system of record (security-trimmed). No database.
- FE work is Codex-reviewed under the adopted FE governance suite (`governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` + `THEO_GOLDEN_COMPONENT_PACK_STANDARD.md` + `CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md` + `CODEX_THEO_FRONTEND_REVIEW_STANDARD.md`), retargeted into vault-dms.
- **Visual authority = VA-D1** (§4B): reproduce Origin's "Vault Files" rail faithfully.

## §2 Surface (the 1/10 rail)

| Element | Content | Backing |
|---------|---------|---------|
| **File tree** | Client/site roots (`dms_list_sites`, `clientLabel = site_name`, Database icon) → lazy-expand folders + files (`dms_tree`; folders amber, file-type icons by extension); chevrons, indent, hover — pixel-identical to Origin Vault Files | `func-dms` OBO |
| **File open** | Click a file → open its SharePoint `web_url` (Office-for-web / browser PDF), or the host's `onOpenFile` callback | SharePoint (web_url) |
| **Folder pick** (optional) | In `pickMode`, clicking a folder calls the host's `onPickFolder` (e.g. Sigma selecting a fund folder) | host callback |

**No 9/10.** The DMS occupies only the host's collapsible/draggable 1/10 rail.

## §3 Mount contract

`<DmsBrowser navSlot? getAccessToken onOpenFile? pickMode? onPickFolder? />` — one state tree; portals the tree into `navSlot` when hosted (Origin/Sigma), else standalone. The host injects `getAccessToken` (in-shell MF, no iframe); the host shell owns rail chrome. Palette = the shared `theo-*` tokens (host provides the CSS; standalone ships its own).

## §4 FE-first build

1. Scaffold (Vite + React + TS + federation exposing `./DmsBrowser`) + own SWAs (dms-dev/prod) + `func-dms` CORS. **DONE.**
2. Faithful `DmsMirror` port (Tailwind `theo-*` + lucide + `dmsMirrorClient`). **DONE (shipped ahead of governance).**
3. This governance adoption + the Pass-1 FE VEP ratifying the port (Codex).
4. Origin + Sigma mount the remote (retiring Origin's inline `DmsMirror`).
