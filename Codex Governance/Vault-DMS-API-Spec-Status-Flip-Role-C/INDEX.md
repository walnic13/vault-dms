# Vault DMS — API Spec Status Flip (`proposed → deployed`) — Pass-4 Role-C Verbatim-Edit Handoff

Controlling artifact for Codex Role-C execution. Directs Codex to flip the four deployed handlers' API-Spec status from `proposed` to `deployed`. Only `spec/VAULT_DMS_API_SPEC.md` is edited.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Documentation-update package
Turn issued against HEAD: <PKG_COMMIT> (development; the commit that first adds this handoff — T29 artifact-presence probe resolves here and at every later commit)
Grounding Mode: Targeted Current-Turn Grounding
Pass: Pass 4
Sub-phase Track: N/A
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md | §11 | "emits a Role-C Verbatim-Edit Handoff (exact before/after text for each edit) for Codex to execute" | This handoff (Claude authors; Codex executes the governed-doc edit) |
| governance/CODEX_VAULT_DMS_REVIEW_STANDARD.md | §4 | "Codex executes the directed edits **verbatim** (exact before/after text), edits only the named target documents" | Edits below are verbatim before/after; sole target `spec/VAULT_DMS_API_SPEC.md` |
| spec/VAULT_DMS_API_SPEC.md | §2.1 | "GET /api/dms_search_sites?q=<2..100 chars, no % or _>" | Edit 1 target (§2.1 dms_search_sites) |
| spec/VAULT_DMS_API_SPEC.md | §2.2 | "GET /api/dms_tree?siteId=<10..200, no % or _>&parentItemId=<optional, 5..200>" | Edit 2 target (§2.2 dms_tree) |
| spec/VAULT_DMS_API_SPEC.md | §2.3 | "POST /api/dms_resolve_item" | Edit 3 target (§2.3 dms_resolve_item) |
| spec/VAULT_DMS_API_SPEC.md | §2.4 | "Stream a file's bytes as the signed-in user" | Edit 4 target (§2.4 dms_read_file) |

## Purpose

The four `dms_*` handlers are deployed to `vaultgpt-func-dms` and golden-curl-verified against real SharePoint (all returned HTTP 200). Their API-Spec status rows still read `proposed`. This Role-C flips them to `deployed`. `dms_probe_connection` (§2.5) is **not** built and its status stays `proposed`.

## Deployment evidence (basis for `deployed`)

| Handler | §  | Deploy commit (package) | Golden-curl result |
|---------|----|-------------------------|--------------------|
| `dms_search_sites` | §2.1 | `0ed7bf6` (VEP) | 200 — returned real tenant sites (Aliter Capital, AltaOne, …) |
| `dms_tree` | §2.2 | `fd02858` (VEP) | 200 — Aliter root tree (2022/2023/2024/2025/General) with name/size/date_modified/web_url |
| `dms_resolve_item` | §2.3 | `3ebc790` (VEP) | 200 — resolved the `2025` folder identity |
| `dms_read_file` | §2.4 | `db6df51` (corrected VEP) | 200 — streamed a real 18.4 MB `.xlsm` (correct MIME, `Content-Disposition`, `504b0304` ZIP magic) |

## Verbatim edits (Codex executes on `spec/VAULT_DMS_API_SPEC.md`)

The status rows are textually identical across sections, so each edit is **section-anchored** — apply it to the named section only. `dms_probe_connection` (§2.5) MUST remain unchanged.

- **Edit 1 — §2.1 `dms_search_sites` Status row.**
  - BEFORE: `| Status | `proposed` |`
  - AFTER: `| Status | `deployed` |`
- **Edit 2 — §2.2 `dms_tree` Status row.**
  - BEFORE: `| Status | `proposed` |`
  - AFTER: `| Status | `deployed` |`
- **Edit 3 — §2.3 `dms_resolve_item` Status row.**
  - BEFORE: `| Status | `proposed` |`
  - AFTER: `| Status | `deployed` |`
- **Edit 4 — §2.4 `dms_read_file` Status row.**
  - BEFORE: `| Status | `proposed` |`
  - AFTER: `| Status | `deployed` |`
- **§2.5 `dms_probe_connection` Status row — NO CHANGE** (remains `proposed`; handler not built).

## Complete file list

- `Codex Governance/Vault-DMS-API-Spec-Status-Flip-Role-C/INDEX.md` (this handoff)
- Target of the edits (not in this package; edited in place): `spec/VAULT_DMS_API_SPEC.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-API-Spec-Status-Flip-Role-C/INDEX.md" --repo-root .`

PASS block (verbatim):

```
<lint output pasted here after run>
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested action

Execute Edits 1–4 verbatim on `spec/VAULT_DMS_API_SPEC.md` (§2.1–§2.4 Status rows `proposed → deployed`; §2.5 unchanged), edit only that file, open your Role-C turn with a GCR per Conformance §4 (Codex | Role-C documentation-update execution row). Claude Code then verifies the landing is byte-faithful and commits it.
