# Vault DMS — `dms_search_sites` — Pass-1 VEP

Controlling artifact for Codex review. Self-contained package: the handler under `handlers/`, the deployed primary reference under `primary-reference/`.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Verified Evidence Pack (backend plan)
Turn issued against HEAD: 0ed7bf6adca23beaf30e92e77e4486731ae0ea02 (development; the commit that first added this package — the package is present at this SHA and every later commit on development, so the T29 artifact-presence probe resolves here)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: P5
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §2 | "the primary reference for each `dms_*` handler is the corresponding **deployed monolith `reporting_*` DMS handler**" | Primary reference = reporting_search_clients (Primary Reference section) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §3 | "Is **stateless**: no database connection, no `pg`, no table access, no persisted state." | Handler removes pg/Pool/DB (Structural Mirror rows: imports, txn) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference)" | No new Graph endpoint — same `/sites?search=` + `/sites/{id}/drive` as the reference (Structural Mirror + Gap Register) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §3 | "site search runs against Graph, not a Vault registry" | Registry query/loop removed; Graph search runs every request (Structural Mirror row: module.exports) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §2 | "Every Graph call is **on-behalf-of the signed-in user**" | OBO exchange + Graph calls as the user (handler module.exports) |
| spec/VAULT_DMS_API_SPEC.md | §2.1 | "no registry union (Vault DMS has no registry — the Graph search IS the source)" | The one behavioral delta vs the reference (Structural Mirror) |
| spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md | §1 | "Vault DMS opens **no** Azure Postgres connection" | Justifies removing pg/Pool (Structural Mirror row: imports) |
| governance/VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md | §1E | "after a Codex-APPROVED VEP" | Deployment to vaultgpt-func-dms gated on this APPROVED (Deployment plan) |

## Purpose

`dms_search_sites` — stateless, tenant-wide SharePoint **site discovery** for Vault DMS: given `?q=`, search the sites the signed-in user can access via Microsoft Graph and return each as `{ site_id, site_name, web_url }`. This is the tenant-wide entry point Origin's App Host DMS bridge (and Sigma's folder-pick) uses to find a client site before browsing into it (`dms_tree`, later).

As the first deployed `dms_*` handler it also validates the full provisioned path end-to-end: EasyAuth identity → OBO token exchange (proving the `AAD_CLIENT_SECRET` Key Vault reference resolves through the app's managed identity) → Graph **Sites** scope as the signed-in user.

## Scope

- **In scope:** one stateless handler `dms_search_sites` (`GET /api/dms_search_sites?q=`) + its `function.json`, deployed to `vaultgpt-func-dms`.
- **Out of scope:** all other `dms_*` handlers (separate VEPs); browsing/reading; any database (there is none); any change to `main`.

## Architecture & boundary reconciliation

- **Stateless mirror (architecture §0a/§5; DR-D2):** the handler opens no database connection, imports no `pg`, persists nothing. It removes the reference's `pg`/`Pool`, `BEGIN`/`set_config`/`SELECT 1`/`COMMIT`, and the `reporting_client_sites` registry query + registry-union branch. SharePoint/Graph is the system of record.
- **Delegated OBO, as the signed-in user (architecture §2; Conformance §6 T40):** every Graph call is on-behalf-of the caller; no application-permission content reads; the OBO exchange is the frozen Family-B helper `exchangeGraphToken`.
- **No new external endpoint (Golden Handler §4):** the handler calls only `GET /v1.0/sites?search={q}` and `GET /v1.0/sites/{id}/drive` — the exact Graph endpoints the primary reference `reporting_search_clients` already calls. No new Graph endpoint, no new helper, no new auth surface → no §21A authorization required.
- **Boundary:** touches no `reporting_*`/`theo_*` table (there is no DB); consumed through Origin (architecture §6).

## Gap Register

`NO-GAPS: sub-phase walk P1–P8 complete; no foreseeable downstream gap identified; certification grounded in Rule Anchor rows citing VAULT_DMS_GOLDEN_HANDLER_STANDARD.md §2/§3/§4, VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md §2/§3, spec/VAULT_DMS_API_SPEC.md §2.1, and spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md §1.` The handler is self-contained; it introduces no state and depends on no unlanded prerequisite (the app + OBO/EasyAuth/KV secret are provisioned).

## Sub-phase walk (P1–P8)

- **P1 Feature identification:** `dms_search_sites` per API Spec §2.1; first handler per Architecture §8 deliverable sequence.
- **P2 Architecture & boundary reconciliation:** above.
- **P2.5 Gap disclosure:** NO-GAPS (above).
- **P3 Reality lock (no schema):** stateless — no DB object; route `dms_search_sites` is PROPOSED (this microstep). No schema per the no-database declaration.
- **P4 Contract grounding:** API Spec §2.1 (`GET /api/dms_search_sites?q=<2..100, no % or _>` → `{ data: { sites:[{site_id,site_name,web_url}] } }`); route convention `dms_<operation>_<entity>`.
- **P5 Handler grounding:** canonical primary reference = deployed `reporting_search_clients` (index.js + function.json), copied verbatim under `primary-reference/`. Structural Mirror Table below.
- **P6 State grounding:** N/A — stateless (no database).
- **P7 Curl grounding:** deterministic golden curl below.
- **P8 VEP assembly:** this document (GCR + Rule Anchor Table open the pack).

## Primary Reference (deployed, full verbatim in-pack)

- Handler: `primary-reference/reporting_search_clients.index.js.md` — the deployed monolith handler, copied byte-faithfully from `corporate-reporting/reference-artifacts/handlers/reporting_search_clients.index.js.md`.
- function.json: `primary-reference/reporting_search_clients.function.json.md` — copied from `corporate-reporting/reference-artifacts/function-json/reporting_search_clients.function.json.md`.

## Structural Mirror Table

| Handler region (`handlers/dms_search_sites/index.js`) | Primary reference region | Classification | Basis |
| ----------------------------------------------------- | ------------------------ | -------------- | ----- |
| `const https = require("https")` | same | EXACT | Golden Handler §3 (built-in https) |
| `const { Pool } = require("pg")` + `pool` | present in reference | **REMOVED (stateless)** | Golden Handler §3; no-DB declaration §1; DR-D2 |
| `corsHeaders` (GET, OPTIONS) | same | EXACT | frozen Family-B block |
| `ROOT_SITE_REGEX` | same | EXACT | frozen constant |
| `send`/`nowIso`/`errorBody`/`successBody`/`getPrincipal`/`getClaimValue`/`buildKnownError`/`parseJsonSafe`/`requestUrl`/`getBearerTokenFromAuthorization`/`getOboInputToken`/`exchangeGraphToken`/`graphGetJson` | same | EXACT | frozen Family-B helper block |
| `parseBody`/`isUuid` | present in reference | REMOVED (unused for a GET) | Allowed Delta (endpoint-specific helper set) |
| `q` validation (2..100, no % or _) | same | EXACT | Allowed Delta preserved verbatim |
| oid + oboInput extraction | same | EXACT | frozen auth pattern |
| `pool.connect`/`BEGIN`/`set_config`/`SELECT 1`/`COMMIT` | present in reference | **REMOVED (stateless)** | Golden Handler §3; DR-D2 |
| registry `SELECT … reporting_client_sites …` + registry-match loop | present in reference | **REMOVED (stateless)** | Architecture §3 ("site search runs against Graph, not a Vault registry"); API Spec §2.1 (no registry union) |
| Graph `/sites?search=` fetch + hostname/ROOT_SITE_REGEX/siteId/displayName filters + `/sites/{id}/drive` verify (403/404 skip) + push + sort | reference's else-branch (Graph fallback) | EXACT (behavioral mirror) | Golden Handler §4 (same Graph endpoints) |
| response `{ sites:[{site_id,site_name,web_url}] }` | `{ clients:[{client_key,client_label}] }` | ALLOWED DELTA | Golden Handler §4 (returned business fields within the fixed envelope); API Spec §2.1 |

## Golden Curl (deterministic; Claude Code runs post-deploy)

```
TOKEN=$(az account get-access-token --resource "api://4e1a1e31-5c20-4480-99e4-098901707d9e" --query accessToken -o tsv)
curl -sS -w '\nHTTP %{http_code}\n' \
  "https://vaultgpt-func-dms.azurewebsites.net/api/dms_search_sites?q=vault" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-ms-token-aad-access-token: $TOKEN"
```

Assertion: HTTP 200; body `{ "data": { "sites": [ … ] }, "meta": { "timestamp", "version":"1.0" } }` where `sites` is an array of `{ site_id, site_name, web_url }` for tenant sites matching `vault` that the signed-in user can access (array may be empty but MUST be present; shape is the deterministic assertion — SharePoint content is not fixed). 401 → EasyAuth/OBO; 403 → the Graph Sites scope / KV-secret path; 500 → OBO config. Token never printed.

## Parity checklist (Golden Handler §5.4)

- [x] Exactly one canonical primary reference handler + function.json, named + in-pack verbatim (`primary-reference/`).
- [x] Family-B helper block mirrored EXACT (§7 frozen elements): CORS list, OPTIONS handling, `getPrincipal`/`getClaimValue`, envelopes, `context.log.error`.
- [x] Stateless: no `pg`, no `Pool`, no DB connection, no `set_config`, no migration (no-DB declaration §1; DR-D2).
- [x] Delegated OBO as the signed-in user; no application-permission content read (Conformance §6 T40).
- [x] No new Graph endpoint vs the reference (Golden Handler §4) → no §21A.
- [x] `function.json`: `authLevel: anonymous`, methods `["get","options"]`, route `dms_search_sites`.
- [x] Deterministic golden curl, no unbound placeholders (token acquired inline; never printed).
- [x] Mechanical lint PASS (below).

## Complete file list

- `Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/INDEX.md` (this controlling artifact)
- `Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/handlers/dms_search_sites/index.js`
- `Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/handlers/dms_search_sites/function.json`
- `Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/primary-reference/reporting_search_clients.index.js.md`
- `Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/primary-reference/reporting_search_clients.function.json.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/INDEX.md" --repo-root .`

PASS block (verbatim):

```
$ node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/INDEX.md" --repo-root .
PASS  <repo-root>/Codex Governance/Vault-DMS-dms_search_sites-Pass-1-VEP/INDEX.md
exit code: 0
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested verdict

**APPROVED** — on approval, Claude Code deploys `dms_search_sites` to `vaultgpt-func-dms` via Kudu (§1E/DR-D1) and runs the golden curl (Pass 3), then reports the result.
