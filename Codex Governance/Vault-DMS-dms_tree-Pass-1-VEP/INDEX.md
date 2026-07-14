# Vault DMS — `dms_tree` — Pass-1 VEP

Controlling artifact for Codex review. Self-contained: handler under `handlers/`, deployed primary reference under `primary-reference/`.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Verified Evidence Pack (backend plan)
Turn issued against HEAD: fd0285889014c46fb334c662843b1c3d384517f3 (development; the commit that first adds this package — T29 artifact-presence probe resolves here and at every later commit)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: P5
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §2 | "the primary reference for each `dms_*` handler is the corresponding **deployed monolith `reporting_*` DMS handler**" | Primary reference = reporting_dms_tree (Primary Reference section) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §3 | "Is **stateless**: no database connection, no `pg`, no table access, no persisted state." | Removed pg/Pool/DB/registry (Structural Mirror) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference)" | Files + enriched fields come from the SAME `/children` call — no new Graph endpoint (Structural Mirror; Gap Register) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §3 | "Vault DMS surfaces **files AND folders**" | Child enumeration includes files (Structural Mirror row: enumerate) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §2 | "Every Graph call is **on-behalf-of the signed-in user**" | OBO exchange + Graph calls as the user (handler module.exports) |
| spec/VAULT_DMS_API_SPEC.md | §2.2 | "the child projection includes **files** (`item.file`), not folders only" | Files+folders projection with SharePoint columns |
| spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md | §1 | "Vault DMS opens **no** Azure Postgres connection" | Justifies removing pg/Pool (Structural Mirror) |
| governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md | §8 | "`PROCEED` / `PRE-LAND` / `ESCALATE`" | Gap Register PRE-LAND for the §2.2 Role-C edit |

## Purpose

`dms_tree` — stateless per-node browse of a SharePoint drive as the signed-in user: given `siteId` (+ optional `parentItemId`), return the immediate children — **files and folders** — each projected with the fields the SharePoint-identical explorer renders (Name / Date modified / Type / Size). `parentItemId` omitted → the drive root's children. This is the step after `dms_search_sites` (pick a site → browse into it → to the fund folder) and the data source for the Origin DMS explorer FE.

## Scope

- **In scope:** one stateless handler `dms_tree` (`GET /api/dms_tree?siteId=&parentItemId=`) + `function.json`, deployed to `vaultgpt-func-dms`; plus a PRE-LAND Role-C correction to API Spec §2.2 (below).
- **Out of scope:** the DMS explorer FE (separate governed FE package); other `dms_*` handlers; any database (there is none); `main`.

## Architecture & boundary reconciliation

- **Stateless mirror (architecture §0a/§5; DR-D2):** no `pg`, no `Pool`, no `BEGIN`/`set_config`/`COMMIT`, no `reporting_client_sites` registry gate. The reference's DB + registry lookup are removed; delegated Graph access is the sole site authority (Graph 403/404 → route 404).
- **Files AND folders (architecture §3; DR-D3):** the enumeration includes `item.file` entries, not folders only, so the mirror shows what SharePoint shows.
- **No new external endpoint (Golden Handler §4):** the handler calls only `/sites/{id}/drive`, `/drives/{id}/root`, `/drives/{id}/items/{id}`, and `/drives/{id}/items/{id}/children` — the exact endpoints `reporting_dms_tree` already calls. The extra projected fields (`size`, `date_modified` = `lastModifiedDateTime`, `web_url`, `mime_type`, `has_children`) are read from the SAME `/children` DriveItem response → an allowed projection delta, not a new endpoint. **No `/sites/{id}` label fetch** (the reference read the label from the registry; the stateless handler omits it — the caller carries the site name from `dms_search_sites`). → no §21A.
- **Delegated OBO as the signed-in user (Conformance §6 T40):** every Graph call is OBO; no application-permission content reads; no `reporting_*`/`theo_*` table.

## Gap Register

**PRE-LAND** — API Spec §2.2 (`dms_tree`) has three drafting mismatches vs the grounded handler + the SharePoint-column FE requirement; this VEP lands a scoped Role-C verbatim edit correcting them in the same microstep (Governor §8 PRE-LAND). Authority: the handler mirrors the deployed `reporting_dms_tree` envelope key `dms_tree` (not `tree`), and the FE requires `date_modified`; the label line contradicts the no-new-endpoint constraint (Golden Handler §4).

**Role-C verbatim edit (for Codex to execute on approval), target `spec/VAULT_DMS_API_SPEC.md` §2.2:**

- BEFORE (Success row): ``| Success | `{ data: { tree: { site_id, drive_id, parent: { item_id, name, type:"folder" }, children: [ { item_id, name, type:"folder"\|"file", has_children?, size?, mime_type?, web_url? } ] } } }` (folders sorted before/with files by name). |``
- AFTER (Success row): ``| Success | `{ data: { dms_tree: { site_id, drive_id, parent: { item_id, name, type:"folder" }, children: [ { item_id, name, type:"folder"\|"file", size, date_modified, web_url, has_children? (folders), mime_type? (files) } ] } } }` (folders first, then files, alphabetical within each). |``
- BEFORE (Primary reference row, final sentence): `No registry gate (site authority is delegated Graph). Site label from Graph `/sites/{id}`.`
- AFTER (Primary reference row, final sentence): `No registry gate (site authority is delegated Graph). No site-label fetch — the caller carries the site name from dms_search_sites — so dms_tree calls no /sites/{id} endpoint.`

No other gaps: the handler introduces no state and depends on no unlanded prerequisite (the app + OBO/EasyAuth/KV secret are live and proven by dms_search_sites).

## Sub-phase walk (P1–P8)

- **P1 Feature identification:** `dms_tree` per API Spec §2.2; second handler per Architecture §8.
- **P2 Architecture & boundary reconciliation:** above.
- **P2.5 Gap disclosure:** PRE-LAND (§2.2 Role-C edit, above).
- **P3 Reality lock (no schema):** stateless; route `dms_tree` PROPOSED; no DB object.
- **P4 Contract grounding:** API Spec §2.2 (as corrected by the PRE-LAND); route convention `dms_<operation>`.
- **P5 Handler grounding:** primary reference deployed `reporting_dms_tree` (index.js + function.json), copied verbatim under `primary-reference/`. Structural Mirror below.
- **P6 State grounding:** N/A — stateless.
- **P7 Curl grounding:** deterministic golden curl below.
- **P8 VEP assembly:** this document.

## Primary Reference (deployed, full verbatim in-pack)

- `primary-reference/reporting_dms_tree.index.js.md` — copied byte-faithfully from `corporate-reporting/reference-artifacts/handlers/reporting_dms_tree.index.js.md`.
- `primary-reference/reporting_dms_tree.function.json.md` — copied from the corresponding function-json artifact.

## Structural Mirror Table

| Handler region (`handlers/dms_tree/index.js`) | Primary reference region | Classification | Basis |
| --------------------------------------------- | ------------------------ | -------------- | ----- |
| `const https = require("https")`, corsHeaders, `SITE_ID_*`/`PARENT_ITEM_ID_*` constants, `isValidSiteIdFormat`/`isValidParentItemIdFormat` | same | EXACT | frozen Family-B / reference constants |
| `const { Pool } = require("pg")` + pool | present in reference | **REMOVED (stateless)** | Golden Handler §3; no-DB §1; DR-D2 |
| `send`/`nowIso`/`errorBody`/`successBody`/`getPrincipal`/`getClaimValue`/`buildKnownError`/`parseJsonSafe`/`requestUrl`/`getBearerTokenFromAuthorization`/`getOboInputToken`/`exchangeGraphToken`/`graphGetJson` | same | EXACT | frozen Family-B helper block |
| siteId + parentItemId validation, oid + oboInput extraction | same | EXACT | reference validation preserved verbatim |
| `pool.connect`/`BEGIN`/`set_config`/`SELECT 1`/`COMMIT`; registry `SELECT … reporting_client_sites …` + 404 gate | present in reference | **REMOVED (stateless)** | Golden Handler §3; Architecture §3; DR-D2 |
| `/sites/{siteId}/drive`, `/drives/{id}/root`, `/drives/{id}/items/{parentItemId}`, parent resolution | same Graph endpoints | EXACT (siteId from query, not registryRow) | Golden Handler §4 (same endpoints) |
| `enumerateImmediateFolderChildren` → `enumerateImmediateChildren` | reference enumerates folders only | ALLOWED DELTA | includes `item.file` + projects `size`/`date_modified`/`web_url`/`mime_type` from the SAME `/children` DriveItem response (Golden Handler §4; Architecture §3) |
| response `{ dms_tree: { site_id, drive_id, parent, children } }` (no `client_key`/`client_label`) | `{ dms_tree: { client_key, client_label, site_id, drive_id, parent, children } }` | ALLOWED DELTA | label removed (no registry / no `/sites/{id}`); envelope key `dms_tree` preserved EXACT |

## Golden Curl (deterministic; Claude Code runs post-deploy)

```
TOKEN=$(az account get-access-token --resource "api://4e1a1e31-5c20-4480-99e4-098901707d9e" --query accessToken -o tsv)
curl -sS -G -w '\nHTTP %{http_code}\n' \
  "https://vaultgpt-func-dms.azurewebsites.net/api/dms_tree" \
  --data-urlencode "siteId=vaulttax.sharepoint.com,a43ef8a2-42fd-4fc0-ae8b-672a5fbdb643,4583d217-e6e7-4bd8-b25a-c1564e3c1da3" \
  -H "Authorization: Bearer $TOKEN" -H "x-ms-token-aad-access-token: $TOKEN"
```

(siteId = the Aliter Capital site returned by the `dms_search_sites` golden curl; root listing, `parentItemId` omitted.) Assertion: HTTP 200; body `{ data: { dms_tree: { site_id, drive_id, parent:{item_id,name,type:"folder"}, children:[…] } }, meta:{…} }` where each child carries `item_id, name, type, size, date_modified, web_url` (+ `has_children` for folders / `mime_type` for files), folders first. Array may be empty but MUST be present. 401 → EasyAuth/OBO; 404 → site not accessible; 500 → OBO config. Token never printed.

## Parity checklist (Golden Handler §5.4)

- [x] One canonical primary reference handler + function.json, named + in-pack verbatim (`primary-reference/`).
- [x] Family-B helper block mirrored EXACT (§7 frozen elements).
- [x] Stateless: no `pg`/`Pool`/DB/`set_config`/migration (no-DB §1; DR-D2).
- [x] Delegated OBO as the signed-in user; no application-permission content read (T40).
- [x] No new Graph endpoint vs the reference (Golden Handler §4) → no §21A; enrichment is same-response projection.
- [x] Files AND folders in the child projection (Architecture §3).
- [x] `function.json`: `authLevel: anonymous`, methods `["get","options"]`, route `dms_tree`.
- [x] Deterministic golden curl, no unbound placeholders (token inline; never printed).
- [x] PRE-LAND Role-C edit for API Spec §2.2 included verbatim (Gap Register).
- [x] Mechanical lint PASS (below).

## Complete file list

- `Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/INDEX.md`
- `Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/handlers/dms_tree/index.js`
- `Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/handlers/dms_tree/function.json`
- `Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/primary-reference/reporting_dms_tree.index.js.md`
- `Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/primary-reference/reporting_dms_tree.function.json.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/INDEX.md" --repo-root .`

PASS block (verbatim):

```
$ node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/INDEX.md" --repo-root .
PASS  <repo-root>/Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/INDEX.md
exit code: 0
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested verdict

**APPROVED** — on approval, Codex executes the §2.2 Role-C edit (Gap Register), and Claude Code deploys `dms_tree` to `vaultgpt-func-dms` via Kudu (§1E/DR-D1) and runs the golden curl (Pass 3).
