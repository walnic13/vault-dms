# Vault DMS — `dms_read_file` — Pass-1 VEP

Controlling artifact for Codex review. Self-contained: handler under `handlers/`, deployed primary reference under `primary-reference/`.

## Re-submission note (Pass-3 correction — handler changed since the prior APPROVED)

The prior version of this handler was Codex-APPROVED and deployed, but its **Pass-3 golden curl returned HTTP 400** on a valid input: SharePoint **drive ids are base64url and contain `_`** (e.g. `b!…TYd_oLbnH5nU`), and the handler's `driveId`/`itemId` validation rejected `%` and `_` — a rule copied from the *reporting* handlers where it is a **SQL `LIKE`-wildcard injection defense**. Vault DMS is **stateless (no SQL)**, so that defense is inapplicable and wrongly rejected valid ids. **Fix:** `isValidDriveIdFormat`/`isValidItemIdFormat` now use a positive charset allow-list `^[A-Za-z0-9!,._-]+$` (+ the length bounds) instead of the `%/_` rejection; the two 400-message strings were updated to match. No other change. This VEP is re-submitted for Codex re-review of the corrected handler before redeploy.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Verified Evidence Pack (backend plan)
Turn issued against HEAD: db6df517369111b648ce657818bcf880d072327b (development; the commit carrying the corrected package — T29 artifact-presence probe resolves here and at every later commit)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: P5
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §2 | "the primary reference for each `dms_*` handler is the corresponding **deployed monolith `reporting_*` DMS handler**" | Primary reference = reporting_download_dms_item (Primary Reference section) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §3 | "Is **stateless**: no database connection, no `pg`, no table access, no persisted state." | Removed pg/DB row lookup (Structural Mirror) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference)" | Same Graph endpoint (`/drives/{id}/items/{id}/content`); no new endpoint (Structural Mirror) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §2 | "Every Graph call is **on-behalf-of the signed-in user**" | OBO exchange + Graph content read as the user (handler module.exports) |
| spec/VAULT_DMS_API_SPEC.md | §2.4 | "takes **`driveId`+`itemId` directly** (from a prior `dms_tree`/`dms_resolve_item`) instead of resolving a `reporting_folder_dms_links` row id via the DB" | driveId/itemId from query; no DB lookup (Structural Mirror) |
| spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md | §1 | "Vault DMS opens **no** Azure Postgres connection" | Justifies removing pg/Pool + the reporting_folder_dms_links lookup (Structural Mirror) |

## Purpose

`dms_read_file` — stateless streaming of a file's bytes as the signed-in user: `GET /api/dms_read_file?driveId=&itemId=` → delegated Graph `/content` (302 → download URL → bytes) → returned raw with the upstream `Content-Type`/`Content-Disposition`/`Content-Length`. `driveId`+`itemId` come directly from a prior `dms_tree` / `dms_resolve_item` result — no database. This is the last backend read primitive: search → browse → resolve → **read**.

## Scope

- **In scope:** one stateless handler `dms_read_file` (`GET /api/dms_read_file?driveId=&itemId=`) + `function.json`, deployed to `vaultgpt-func-dms`.
- **Out of scope:** SAS-vs-bytes alternative (API Spec §2.4 Note — deferred open item); other `dms_*` handlers; any database; `main`.

## Architecture & boundary reconciliation

- **Stateless mirror (architecture §0a/§5; DR-D2):** the reference resolved a `reporting_folder_dms_links` **row id** via a DB `SELECT` to obtain `drive_id`/`dms_item_id`; this handler takes `driveId`+`itemId` **directly from the query** (supplied by a prior `dms_tree`/`dms_resolve_item`). The `pg`/`Pool`, `BEGIN`/`set_config`/`COMMIT`, and the `reporting_folder_dms_links` lookup are removed. No database.
- **No new external endpoint (Golden Handler §4):** calls only `GET /drives/{driveId}/items/{itemId}/content` — the exact endpoint `reporting_download_dms_item` already calls (via `graphGetContentRedirect`). The binary-stream helpers (`requestBinary`/`fetchDownloadPayload`/`sendBinary`/`buildAttachmentDisposition`) are mirrored verbatim. → no §21A.
- **Delegated OBO as the signed-in user (Conformance §6 T40):** the content read is OBO; no application-permission read; no `reporting_*`/`theo_*` table.

## Gap Register

`NO-GAPS: sub-phase walk P1–P8 complete; no foreseeable downstream gap identified; certification grounded in the Rule Anchor rows citing VAULT_DMS_GOLDEN_HANDLER_STANDARD.md §2/§3/§4, VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md §2, spec/VAULT_DMS_API_SPEC.md §2.4, and spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md §1.` API Spec §2.4 already matches the grounded handler (route, binary success shape, and the `driveId`+`itemId`-direct delta) — no Role-C correction required. The handler introduces no state and depends on no unlanded prerequisite (the app is live and proven).

## Sub-phase walk (P1–P8)

- **P1 Feature identification:** `dms_read_file` per API Spec §2.4; handler #4 per Architecture §8.
- **P2 Architecture & boundary reconciliation:** above.
- **P2.5 Gap disclosure:** NO-GAPS (above).
- **P3 Reality lock (no schema):** stateless; route `dms_read_file` PROPOSED; no DB object.
- **P4 Contract grounding:** API Spec §2.4; route convention `dms_<operation>_<entity>`.
- **P5 Handler grounding:** primary reference deployed `reporting_download_dms_item` (index.js + function.json), copied verbatim under `primary-reference/`. Structural Mirror below.
- **P6 State grounding:** N/A — stateless (no database).
- **P7 Curl grounding:** deterministic golden curl (acquire-then-read) below.
- **P8 VEP assembly:** this document.

## Primary Reference (deployed, full verbatim in-pack)

- `primary-reference/reporting_download_dms_item.index.js.md` — copied byte-faithfully from `corporate-reporting/reference-artifacts/handlers/reporting_download_dms_item.index.js.md`.
- `primary-reference/reporting_download_dms_item.function.json.md` — copied from the corresponding function-json artifact.

## Structural Mirror Table

| Handler region (`handlers/dms_read_file/index.js`) | Primary reference region | Classification | Basis |
| -------------------------------------------------- | ------------------------ | -------------- | ----- |
| `const https = require("https")`, corsHeaders (GET/OPTIONS) | same | EXACT | frozen Family-B |
| `const { Pool } = require("pg")` + pool | present in reference | **REMOVED (stateless)** | Golden Handler §3; no-DB §1; DR-D2 |
| `sendJson`/`sendBinary`/`nowIso`/`errorBody`/`getPrincipal`/`getClaimValue`/`parseJsonSafe`/`buildKnownError`/`requestText`/`requestBinary`/`getBearerTokenFromAuthorization`/`getOboInputToken`/`exchangeGraphToken`/`graphGetContentRedirect`/`fetchDownloadPayload`/`buildAttachmentDisposition` | same | EXACT | frozen Family-B / download helper block (incl. the reference's 400/401→401, 403→403 exchange mapping) |
| `isUuid` (validates the `id` DB row uuid) | present in reference | REMOVED (no DB row) | replaced by driveId/itemId format validation |
| `isValidDriveIdFormat`/`isValidItemIdFormat` (charset allow-list `^[A-Za-z0-9!,._-]+$` + length) + `DRIVE_ID_*`/`ITEM_ID_*` constants | (new; adapts reporting_dms_tree `isValidSiteIdFormat`) | ALLOWED DELTA | endpoint-specific validation (Golden Handler §4); driveId/itemId are opaque Graph ids, not UUIDs. The reference's "no % or _" is a SQL-LIKE-wildcard defense; Vault DMS is stateless (no SQL) so it is dropped — base64url drive ids contain `_`, so a positive Graph-id charset allow-list is used instead (Pass-3 correction; see Re-submission note) |
| OPTIONS handling, oid extraction, oboInput extraction | same | EXACT | frozen auth pattern |
| `pool.connect`/`BEGIN`/`set_config`; `SELECT drive_id, dms_item_id FROM reporting_folder_dms_links WHERE id=$1` + 404; `COMMIT` | present in reference | **REMOVED (stateless)** | Golden Handler §3; no-DB §1; DR-D2 (driveId+itemId supplied directly per API Spec §2.4) |
| `exchangeGraphToken` → `graphGetContentRedirect(driveId,itemId)` → `fetchDownloadPayload` → `sendBinary` with Content-Type/Content-Disposition/Content-Length | same | EXACT | same Graph `/content` endpoint + binary stream (Golden Handler §4) |

## Golden Curl (deterministic acquire-then-read; Claude Code runs post-deploy)

`driveId`+`itemId` are runtime values acquired deterministically from `dms_tree` (drill into a folder that contains a file), then passed to `dms_read_file` — the Golden-Handler runtime-value-acquisition pattern (no unbound placeholder; the acquisition step is itself a deployed deterministic call).

```
TOKEN=$(az account get-access-token --resource "api://4e1a1e31-5c20-4480-99e4-098901707d9e" --query accessToken -o tsv)
# (A) acquire a file's driveId + itemId: browse a leaf folder known to contain files
#     e.g. drill from a client site root (dms_search_sites) -> year -> quarter until a "type":"file" child appears;
#     capture drive_id + that child's item_id.
# (B) read the file bytes:
curl -sS -D - -o /tmp/dms_file.bin -w '\nHTTP %{http_code}\n' -G \
  "https://vaultgpt-func-dms.azurewebsites.net/api/dms_read_file" \
  --data-urlencode "driveId=<drive_id from A>" \
  --data-urlencode "itemId=<file item_id from A>" \
  -H "Authorization: Bearer $TOKEN" -H "x-ms-token-aad-access-token: $TOKEN"
```

Assertion: HTTP 200 with `Content-Type` (the file's type, e.g. the Excel MIME), a `Content-Disposition` filename, `Content-Length` > 0, and the downloaded body matching that length. 401 → EasyAuth/OBO; 404 → item not accessible; 400 → bad driveId/itemId. Token never printed. (At Pass-3 the `<drive_id>`/`<item_id>` are filled with the concrete values captured in step A and recorded in the verification report.)

## Parity checklist (Golden Handler §5.4)

- [x] One canonical primary reference handler + function.json, named + in-pack verbatim.
- [x] Family-B / download helper block mirrored EXACT (§7 frozen elements), incl. `sendBinary`/`requestBinary`/`graphGetContentRedirect`.
- [x] Stateless: no `pg`/`Pool`/DB/`set_config`/row lookup (no-DB §1; DR-D2).
- [x] Delegated OBO as the signed-in user; no application-permission content read (T40).
- [x] No new Graph endpoint vs the reference (Golden Handler §4) → no §21A.
- [x] `function.json`: `authLevel: anonymous`, methods `["get","options"]`, route `dms_read_file`.
- [x] Deterministic golden curl via the runtime-value-acquisition pattern (driveId/itemId from dms_tree); token never printed.
- [x] NO-GAPS (API Spec §2.4 already matches; no Role-C edit).
- [x] Mechanical lint PASS (below).

## Complete file list

- `Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/INDEX.md`
- `Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/handlers/dms_read_file/index.js`
- `Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/handlers/dms_read_file/function.json`
- `Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/primary-reference/reporting_download_dms_item.index.js.md`
- `Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/primary-reference/reporting_download_dms_item.function.json.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/INDEX.md" --repo-root .`

PASS block (verbatim):

```
$ node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/INDEX.md" --repo-root .
PASS  <repo-root>/Codex Governance/Vault-DMS-dms_read_file-Pass-1-VEP/INDEX.md
exit code: 0
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested verdict

**APPROVED** — on approval, Claude Code deploys `dms_read_file` to `vaultgpt-func-dms` via Kudu (§1E/DR-D1) and runs the acquire-then-read golden curl (Pass 3).
