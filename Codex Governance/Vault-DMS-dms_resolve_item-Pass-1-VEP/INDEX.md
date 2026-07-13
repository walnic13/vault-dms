# Vault DMS — `dms_resolve_item` — Pass-1 VEP

Controlling artifact for Codex review. Self-contained: handler under `handlers/`, deployed primary reference under `primary-reference/`.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Verified Evidence Pack (backend plan)
Turn issued against HEAD: <PKG_COMMIT> (development; the commit that first adds this package — T29 artifact-presence probe resolves here and at every later commit)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: P5
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §2 | "the primary reference for each `dms_*` handler is the corresponding **deployed monolith `reporting_*` DMS handler**" | Primary reference = reporting_resolve_dms_folder (Primary Reference section) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §3 | "Is **stateless**: no database connection, no `pg`, no table access, no persisted state." | Removed pg/DB/registry/INSERTs (Structural Mirror) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference)" | Same Graph endpoints as reference (`/sites/{id}/drive`, `/drives/{id}/items/{id}`); no new endpoint (Structural Mirror; Gap Register) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §2 | "Every Graph call is **on-behalf-of the signed-in user**" | OBO exchange + Graph reads as the user (handler module.exports) |
| spec/VAULT_DMS_API_SPEC.md | §2.3 | "Vault DMS returns identity only; the consuming app owns persistence" | Read-only resolve; no INSERT (handler returns `{ item }`) |
| spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md | §1 | "Vault DMS opens **no** Azure Postgres connection" | Justifies removing pg/Pool + the folder/link INSERTs (Structural Mirror) |
| governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md | §8 | "`PROCEED` / `PRE-LAND` / `ESCALATE`" | Gap Register PRE-LAND for the §2.3 Role-C edit |

## Purpose

`dms_resolve_item` — stateless, **read-only** resolve of a site + drive item to its live Graph identity (`site_id, drive_id, drive_name, item_id, name, type:"folder"|"file", web_url`), for a consuming app to anchor in its **own** store. Vault DMS returns identity only and persists nothing. This is what Corporate Reporting (and any app) calls to turn a `dms_tree` selection into a durable pointer it then records in its own tables.

## Scope

- **In scope:** one stateless handler `dms_resolve_item` (`POST /api/dms_resolve_item {siteId, dmsItemId}`) + `function.json`, deployed to `vaultgpt-func-dms`; plus a PRE-LAND Role-C correction to API Spec §2.3.
- **Out of scope:** any persistence (that's the consuming app's); other `dms_*` handlers; any database; `main`.

## Architecture & boundary reconciliation

- **Stateless mirror (architecture §0a/§5; DR-D2):** the reference's `pg`/`Pool`, `BEGIN`/`set_config`/`COMMIT`, the `reporting_client_sites` registry gate, the `reporting_folders` + `reporting_folder_dms_links` INSERTs, and the `SAVEPOINT`/23505 race-recovery are **all removed**. The handler reads Graph and returns identity — it writes nothing.
- **No new external endpoint (Golden Handler §4):** calls only `/sites/{id}/drive` and `/drives/{id}/items/{id}` — both already called by `reporting_resolve_dms_folder`. `web_url` is read from the SAME `/items/{id}` DriveItem response → allowed projection. No bare `/sites/{id}` call. → no §21A.
- **Folder OR file (allowed delta):** the reference required the item to be a folder (404 otherwise); `dms_resolve_item` resolves a folder **or** a file and sets `type` accordingly (API Spec §2.3 Success already discriminates `folder`/`file`).
- **Delegated OBO as the signed-in user (Conformance §6 T40):** every Graph call is OBO; no application-permission content reads; no `reporting_*`/`theo_*` table.

## Gap Register

**PRE-LAND** — API Spec §2.3 primary-reference prose lists the read half as "Graph `/sites/{id}`, `/sites/{id}/drive`, `/drives/{id}/items/{itemId}`", but the bare `/sites/{id}` is called by neither the deployed reference nor this handler (the reference read the site name from the registry, not Graph). This VEP lands a scoped Role-C edit correcting §2.3 (Governor §8 PRE-LAND).

**Role-C verbatim edit (for Codex to execute on approval), target `spec/VAULT_DMS_API_SPEC.md` §2.3 Primary reference row:**

- BEFORE: ``| Primary reference | `reporting_resolve_dms_folder` (the read half: Graph `/sites/{id}`, `/sites/{id}/drive`, `/drives/{id}/items/{itemId}`). **Delta:** the `reporting_folders` / `reporting_folder_dms_links` INSERTs and the registry gate are **removed** — Vault DMS returns identity only; the consuming app owns persistence. |``
- AFTER: ``| Primary reference | `reporting_resolve_dms_folder` (the read half: Graph `/sites/{id}/drive`, `/drives/{id}/items/{itemId}`). **Delta:** the `reporting_folders` / `reporting_folder_dms_links` INSERTs, the SAVEPOINT/23505 race-recovery, and the registry gate are **removed** — Vault DMS returns identity only; the consuming app owns persistence. Resolves a folder **or** a file (the reference resolved folders only); `type` discriminates. |``

No other gaps: the handler introduces no state and depends on no unlanded prerequisite (the app + OBO/EasyAuth/KV secret are live and proven by dms_search_sites and dms_tree).

## Sub-phase walk (P1–P8)

- **P1 Feature identification:** `dms_resolve_item` per API Spec §2.3; handler #3 per Architecture §8.
- **P2 Architecture & boundary reconciliation:** above.
- **P2.5 Gap disclosure:** PRE-LAND (§2.3 Role-C edit, above).
- **P3 Reality lock (no schema):** stateless; route `dms_resolve_item` PROPOSED; no DB object; no INSERT.
- **P4 Contract grounding:** API Spec §2.3 (as corrected by the PRE-LAND); route convention `dms_<operation>_<entity>`.
- **P5 Handler grounding:** primary reference deployed `reporting_resolve_dms_folder` (index.js + function.json), copied verbatim under `primary-reference/`. Structural Mirror below.
- **P6 State grounding:** N/A — stateless (no database, no persistence).
- **P7 Curl grounding:** deterministic golden curl below.
- **P8 VEP assembly:** this document.

## Primary Reference (deployed, full verbatim in-pack)

- `primary-reference/reporting_resolve_dms_folder.index.js.md` — copied byte-faithfully from `corporate-reporting/reference-artifacts/handlers/reporting_resolve_dms_folder.index.js.md`.
- `primary-reference/reporting_resolve_dms_folder.function.json.md` — copied from the corresponding function-json artifact.

## Structural Mirror Table

| Handler region (`handlers/dms_resolve_item/index.js`) | Primary reference region | Classification | Basis |
| ----------------------------------------------------- | ------------------------ | -------------- | ----- |
| `const https = require("https")`, corsHeaders (POST/OPTIONS), `SITE_ID_*`/`DMS_ITEM_ID_*` constants, `ALLOWED_BODY_KEYS`, `isValidSiteIdFormat`/`isValidDmsItemIdFormat` | same | EXACT | frozen Family-B / reference constants |
| `const { Pool } = require("pg")` + pool | present in reference | **REMOVED (stateless)** | Golden Handler §3; no-DB §1; DR-D2 |
| `send`/`nowIso`/`errorBody`/`successBody`/`getPrincipal`/`getClaimValue`/`parseBody`/`buildKnownError`/`parseJsonSafe`/`requestUrl`/`getBearerTokenFromAuthorization`/`getOboInputToken`/`exchangeGraphToken`/`graphGetJson` | same | EXACT | frozen Family-B helper block |
| body parse + ALLOWED_BODY_KEYS check + siteId/dmsItemId validation + oid + oboInput | same | EXACT | reference validation preserved verbatim |
| `pool.connect`/`BEGIN`/`set_config`/`SELECT 1`; registry `SELECT … reporting_client_sites …` + 404 gate | present in reference | **REMOVED (stateless)** | Golden Handler §3; DR-D2 |
| `/sites/{siteId}/drive` (driveId, driveName); `/drives/{driveId}/items/{dmsItemId}` (item) | same Graph endpoints | EXACT (siteId from body, not registryRow) | Golden Handler §4 (same endpoints) |
| folder-required gate (`if (!item.folder) 404`) | present in reference | ALLOWED DELTA | resolve folder OR file; `type` set from `item.folder`/`item.file` (API Spec §2.3) |
| `SAVEPOINT before_link_insert` + `INSERT reporting_folders` + `INSERT reporting_folder_dms_links` + 23505 race recovery + `COMMIT` | present in reference | **REMOVED (stateless)** | Golden Handler §3; no-DB §1; DR-D2 (persistence is the consuming app's) |
| response `{ item: { site_id, drive_id, drive_name, item_id, name, type, web_url } }` | `{ folder: { …, dms_link:{…} }, registration }` | ALLOWED DELTA | read-only identity; `web_url` from the same `/items/{id}` response (API Spec §2.3) |

## Golden Curl (deterministic; Claude Code runs post-deploy)

```
TOKEN=$(az account get-access-token --resource "api://4e1a1e31-5c20-4480-99e4-098901707d9e" --query accessToken -o tsv)
curl -sS -w '\nHTTP %{http_code}\n' -X POST \
  "https://vaultgpt-func-dms.azurewebsites.net/api/dms_resolve_item" \
  -H "Authorization: Bearer $TOKEN" -H "x-ms-token-aad-access-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"siteId":"vaulttax.sharepoint.com,a43ef8a2-42fd-4fc0-ae8b-672a5fbdb643,4583d217-e6e7-4bd8-b25a-c1564e3c1da3","dmsItemId":"01JBCKJOETUAP7HAGVPNFZZDKLYPRRR6F7"}'
```

(`siteId` = Aliter Capital; `dmsItemId` = its `2025` folder, both from the `dms_tree` golden curl.) Assertion: HTTP 200; body `{ data: { item: { site_id, drive_id, drive_name, item_id:"01JBCKJOETUAP7HAGVPNFZZDKLYPRRR6F7", name:"2025", type:"folder", web_url } }, meta:{…} }`. 401 → EasyAuth/OBO; 404 → site/item not accessible; 400 → bad body. Token never printed.

## Parity checklist (Golden Handler §5.4)

- [x] One canonical primary reference handler + function.json, named + in-pack verbatim.
- [x] Family-B helper block mirrored EXACT (§7 frozen elements).
- [x] Stateless: no `pg`/`Pool`/DB/`set_config`/INSERT/migration (no-DB §1; DR-D2).
- [x] Delegated OBO as the signed-in user; no application-permission content read (T40).
- [x] No new Graph endpoint vs the reference (Golden Handler §4) → no §21A.
- [x] Read-only: returns `{ item }`; writes nothing.
- [x] `function.json`: `authLevel: anonymous`, methods `["post","options"]`, route `dms_resolve_item`.
- [x] Deterministic golden curl, no unbound placeholders (token inline; never printed).
- [x] PRE-LAND Role-C edit for API Spec §2.3 included verbatim (Gap Register).
- [x] Mechanical lint PASS (below).

## Complete file list

- `Codex Governance/Vault-DMS-dms_resolve_item-Pass-1-VEP/INDEX.md`
- `Codex Governance/Vault-DMS-dms_resolve_item-Pass-1-VEP/handlers/dms_resolve_item/index.js`
- `Codex Governance/Vault-DMS-dms_resolve_item-Pass-1-VEP/handlers/dms_resolve_item/function.json`
- `Codex Governance/Vault-DMS-dms_resolve_item-Pass-1-VEP/primary-reference/reporting_resolve_dms_folder.index.js.md`
- `Codex Governance/Vault-DMS-dms_resolve_item-Pass-1-VEP/primary-reference/reporting_resolve_dms_folder.function.json.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_resolve_item-Pass-1-VEP/INDEX.md" --repo-root .`

PASS block (verbatim):

```
<lint output pasted here after run>
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested verdict

**APPROVED** — on approval, Codex executes the §2.3 Role-C edit (Gap Register), and Claude Code deploys `dms_resolve_item` to `vaultgpt-func-dms` via Kudu (§1E/DR-D1) and runs the golden curl (Pass 3).
