# Vault DMS — `dms_list_sites` — Pass-1 VEP

Controlling artifact for Codex review. Self-contained package: the handler under `handlers/`, the two deployed primary references (composite, Walter-authorized) under `primary-reference/`.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Verified Evidence Pack (backend plan)
Turn issued against HEAD: <PKG_COMMIT_SHA> (development; the commit that first added this package — the package is present at this SHA and every later commit on development, so the T29 artifact-presence probe resolves here)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: P5
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §2 | "the primary reference for each `dms_*` handler is the corresponding **deployed monolith `reporting_*` DMS handler**" | Primary reference = reporting_search_clients + reporting_dms_tree (Composite Primary Reference section) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §2 | "**Composite** selection (two handlers each contributing part of the target pattern) is prohibited without Walter authorization" | Walter authorization quoted verbatim (Composite Primary Reference Authorization section) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §3 | "Is **stateless**: no database connection, no `pg`, no table access, no persisted state." | Handler removes pg/Pool/DB (Structural Mirror rows: imports, txn) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference)" | No new Graph endpoint — same `/sites?search=` + `/sites/{id}/drive` + `@odata.nextLink` as the composite references (Structural Mirror + Gap Register) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §3 | "site search runs against Graph, not a Vault registry" | Registry query/loop removed; Graph enumeration runs every request (Structural Mirror row: module.exports) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §2 | "Every Graph call is **on-behalf-of the signed-in user**" | OBO exchange + Graph calls as the user; enumeration is security-trimmed to the caller (handler module.exports) |
| spec/VAULT_DMS_API_SPEC.md | §2.1 | "no registry union (Vault DMS has no registry — the Graph search IS the source)" | Enumeration source is Graph, not a registry (Structural Mirror) |
| spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md | §1 | "Vault DMS opens **no** Azure Postgres connection" | Justifies removing pg/Pool (Structural Mirror row: imports) |
| governance/VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md | §1E | "after a Codex-APPROVED VEP" | Deployment to vaultgpt-func-dms gated on this APPROVED (Deployment plan) |

## Purpose

`dms_list_sites` — stateless, tenant-wide SharePoint **site enumeration** for Vault DMS: with **no** query parameter, return **every** SharePoint site the signed-in user can access, each as `{ site_id, site_name, web_url }`. It is the top-level root source for Origin's DMS mirror: instead of a curated registry (the reporting `reporting_list_visible_clients` model, which caps visibility to hand-registered client sites), the entire tenant DMS the user is permitted to see is enumerated live from SharePoint.

`dms_search_sites` (§2.1, deployed) answers "find a site by name"; `dms_list_sites` answers "show me the whole DMS". Both are delegated, on-behalf-of the signed-in user, so SharePoint's own permissions decide what is returned — enumeration via `/sites?search=*` is security-trimmed to the caller, and each candidate site is confirmed by a delegated `/sites/{id}/drive` probe before it is listed.

## Scope

- **In scope:** one stateless handler `dms_list_sites` (`GET /api/dms_list_sites`, no parameters) + its `function.json`, deployed to `vaultgpt-func-dms`. Proposed API-Spec contract §2.6 (below); the API-Spec landing is a follow-up Role-C after approval (Codex is sole doc editor).
- **Out of scope:** all other `dms_*` handlers; browsing/reading (existing `dms_tree`/`dms_read_file`); any database (there is none); any FE change (separate vault-origin package); any change to `main`.

## Proposed contract (API Spec §2.6 — lands via Role-C after approval)

| Field | Value |
|-------|-------|
| Route | `GET /api/dms_list_sites` (no parameters) |
| Purpose | Enumerate **all** SharePoint sites the caller can access (Graph `GET /v1.0/sites?search=*`, paginated via `@odata.nextLink`), filtered to the tenant host (`vaulttax.sharepoint.com`) root sites, each verified by a delegated `/sites/{id}/drive` probe. |
| Success | `{ data: { sites: [ { site_id, site_name, web_url } ] } }` sorted by name then id. |
| Composite primary reference | `reporting_search_clients` (site-search + tenant/root filter + `/drive` probe) **and** `reporting_dms_tree` (`@odata.nextLink` pagination) — Walter-authorized composite (below). **Delta:** no `q` parameter — the wildcard `*` enumerates; no registry union. |
| Status | `proposed` |

## Architecture & boundary reconciliation

- **Stateless mirror (architecture §0a/§5; DR-D2):** the handler opens no database connection, imports no `pg`, persists nothing. It removes the reference's `pg`/`Pool`, `BEGIN`/`set_config`/`SELECT 1`/`COMMIT`, and the `reporting_client_sites` registry query + registry-union branch. SharePoint/Graph is the system of record.
- **Delegated OBO, as the signed-in user (architecture §2):** every Graph call — the enumeration search, the pagination follow, and the per-site `/drive` probe — is on-behalf-of the caller; no application-permission content reads. SharePoint search is security-trimmed to the user, so `dms_list_sites` can only ever surface sites that user is provisioned to see. The OBO exchange is the frozen Family-B helper `exchangeGraphToken`.
- **No new external endpoint (Golden Handler §4):** the handler calls only `GET /v1.0/sites?search={term}` and `GET /v1.0/sites/{id}/drive` (both in `reporting_search_clients`) and follows `@odata.nextLink` continuations (the pagination idiom in `reporting_dms_tree`). No new Graph endpoint, no new helper, no new auth surface. The only additions vs a single reference are (a) the wildcard search term `*` (an allowed field-set delta on the same endpoint) and (b) the `@odata.nextLink` pagination loop, which is why a **composite** reference is used — authorized below.
- **Boundary:** touches no `reporting_*`/`theo_*` table (there is no DB); consumed through Origin (architecture §6).

## Composite Primary Reference Authorization

Golden Handler §2 / Conformance §6 T10 prohibit a composite primary reference **without Walter authorization, quoted verbatim and predating the VEP**. No single deployed handler contains both the `/sites?search=` site-discovery path **and** the `@odata.nextLink` pagination loop, so the composite is required, not a convenience.

Walter authorized this composite in the current session, predating this VEP. Proposed scope (offered verbatim to Walter):

> "I authorize a composite primary reference for `dms_list_sites`: `reporting_search_clients` for the `/sites?search=` site-discovery + tenant/root filter + `/drive` permission probe, and `reporting_dms_tree` for the `@odata.nextLink` pagination loop."

Walter's grant (verbatim): **"i authroise you for this"** (2026-07-13).

## Composite Primary Reference (deployed, full verbatim in-pack)

- **Reference A — site discovery.** `primary-reference/reporting_search_clients.index.js.md` + `primary-reference/reporting_search_clients.function.json.md` — the deployed monolith handler, byte-faithful from `corporate-reporting/reference-artifacts/`. Contributes: `/sites?search=` fetch, `siteCollection.hostname === "vaulttax.sharepoint.com"` + `ROOT_SITE_REGEX` + `siteId`/`displayName` filters, `/sites/{id}/drive` verify with 403/404 skip, push, sort, response projection.
- **Reference B — pagination.** `primary-reference/reporting_dms_tree.index.js.md` + `primary-reference/reporting_dms_tree.function.json.md` — the deployed monolith handler, byte-faithful. Contributes: the `while (nextUrl) { page = await graphGetJson(nextUrl, …); … nextUrl = page["@odata.nextLink"] … }` continuation loop.

## Structural Mirror Table

| Handler region (`handlers/dms_list_sites/index.js`) | Primary reference region | Classification | Basis |
| --------------------------------------------------- | ------------------------ | -------------- | ----- |
| `const https = require("https")` | Ref A / Ref B (same) | EXACT | Golden Handler §3 (built-in https) |
| `const { Pool } = require("pg")` + `pool` | present in Ref A | **REMOVED (stateless)** | Golden Handler §3; no-DB declaration §1; DR-D2 |
| `corsHeaders` (GET, OPTIONS) | Ref A (same) | EXACT | frozen Family-B block |
| `ROOT_SITE_REGEX` | Ref A (same) | EXACT | frozen constant |
| `send`/`nowIso`/`errorBody`/`successBody`/`getPrincipal`/`getClaimValue`/`buildKnownError`/`parseJsonSafe`/`requestUrl`/`getBearerTokenFromAuthorization`/`getOboInputToken`/`exchangeGraphToken`/`graphGetJson` | Ref A (same) | EXACT | frozen Family-B helper block |
| `parseBody`/`isUuid` | present in Ref A | REMOVED (unused for a no-body GET) | Allowed Delta (endpoint-specific helper set) |
| `q` param + validation (2..100, no % or _) | present in Ref A (search-clients q) | **REMOVED** | Allowed Delta — `dms_list_sites` takes no parameter; the wildcard `*` enumerates (API Spec §2.6 proposed) |
| oid + oboInput extraction | Ref A (same) | EXACT | frozen auth pattern |
| `pool.connect`/`BEGIN`/`set_config`/`SELECT 1`/`COMMIT` | present in Ref A | **REMOVED (stateless)** | Golden Handler §3; DR-D2 |
| registry `SELECT … reporting_client_sites …` + registry-match loop | present in Ref A | **REMOVED (stateless)** | Architecture §3 ("site search runs against Graph, not a Vault registry"); API Spec §2.1 (no registry union) |
| enumeration search URL `/sites?search=${encodeURIComponent("*")}` | Ref A `/sites?search=${encodeURIComponent(q)}` | ALLOWED DELTA | same endpoint; search term is `*` (enumerate) not a typed `q` — Golden Handler §4 (same Graph endpoint) |
| `while (nextUrl) { page = await graphGetJson(nextUrl,…); … nextUrl = page["@odata.nextLink"]?.trim() ? … : null }` | Ref B pagination loop | EXACT (behavioral mirror) | Walter-authorized composite; Golden Handler §4 (same endpoint continuation) |
| per-row hostname/ROOT_SITE_REGEX/siteId/displayName filters + `seenSiteIds` dedup + `/sites/{id}/drive` verify (403/404 skip) + push | Ref A else-branch (Graph fallback) | EXACT (behavioral mirror) | Golden Handler §4 (same Graph endpoints) |
| `sites.sort(name, then site_id)` | Ref A (same) | EXACT | frozen sort |
| response `{ sites:[{site_id,site_name,web_url}] }` | Ref A `{ clients:[{client_key,client_label}] }` | ALLOWED DELTA | returned business fields within the fixed envelope; API Spec §2.6 (mirrors §2.1 `dms_search_sites` shape) |
| catch: `context.log.error("dms_list_sites failed", err)` + isKnown mapping + 500 fallback | Ref A (same shape) | EXACT | frozen error mapping |

## Gap Register

`NO-GAPS: sub-phase walk P1–P8 complete; no foreseeable downstream gap identified; certification grounded in Rule Anchor rows citing VAULT_DMS_GOLDEN_HANDLER_STANDARD.md §2/§3/§4, VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md §2/§3, spec/VAULT_DMS_API_SPEC.md §2.1, and spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md §1.` The handler is self-contained; it introduces no state and depends on no unlanded prerequisite (the app + OBO/EasyAuth/KV secret are provisioned and proven by the four deployed `dms_*` handlers). Enumeration completeness is bounded by SharePoint search indexing (delegated `/sites?search=*` returns the indexed, permission-trimmed set); a guaranteed-every-site enumeration would require application Graph permissions (`getAllSites`), which is deliberately NOT used because it would bypass the per-user delegated model (architecture §2). This is a disclosed product property, not a downstream code gap; the Pass-3 golden curl verifies live enumeration.

## Sub-phase walk (P1–P8)

- **P1 Feature identification:** `dms_list_sites` — tenant-wide enumeration entry point; extends the API Spec site-discovery surface (§2.1 sibling); architecture §4 handler set (delegated-Graph DMS mirror family HF-D1).
- **P2 Architecture & boundary reconciliation:** above.
- **P2.5 Gap disclosure:** NO-GAPS (above), with the disclosed enumeration-completeness product property.
- **P3 Reality lock (no schema):** stateless — no DB object; route `dms_list_sites` is PROPOSED (this microstep, API Spec §2.6). No schema per the no-database declaration.
- **P4 Contract grounding:** proposed contract §2.6 above; envelope + status codes per API Spec §1 conventions; route convention `dms_<operation>_<entity>`; delegated-OBO/Graph profile grounded against the composite references.
- **P5 Handler grounding:** composite canonical primary references = deployed `reporting_search_clients` (index.js + function.json) and deployed `reporting_dms_tree` (index.js + function.json), copied verbatim under `primary-reference/`; Structural Mirror Table above; composite authorized verbatim by Walter (above).
- **P6 State grounding:** N/A — stateless (no database).
- **P7 Curl grounding:** deterministic golden curl below.
- **P8 VEP assembly:** this document (GCR + Rule Anchor Table open the pack).

## Golden Curl (deterministic; Claude Code runs post-deploy)

```
TOKEN=$(az account get-access-token --resource "api://4e1a1e31-5c20-4480-99e4-098901707d9e" --query accessToken -o tsv)
curl -sS -w '\nHTTP %{http_code}\n' \
  "https://vaultgpt-func-dms.azurewebsites.net/api/dms_list_sites" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-ms-token-aad-access-token: $TOKEN"
```

Assertion: HTTP 200; body `{ "data": { "sites": [ … ] }, "meta": { "timestamp", "version":"1.0" } }` where `sites` is an array of `{ site_id, site_name, web_url }` for tenant root sites the signed-in user can access. The array MUST be present; it is expected to be **non-empty** and to include **more** sites than the curated `reporting_list_visible_clients` registry returns (the enumeration is the whole permission-trimmed DMS, not the registry). Pagination is exercised transparently (multiple `@odata.nextLink` pages fold into one array). 401 → EasyAuth/OBO; 403 → the Graph Sites scope / KV-secret path; 500 → OBO config. Token never printed.

## Parity checklist (Golden Handler §5.4)

- [x] Composite primary reference (two deployed handlers), each named + in-pack verbatim as index.js + function.json (`primary-reference/`); composite authorized by Walter verbatim, predating this VEP (Golden Handler §2 / T10).
- [x] Family-B helper block mirrored EXACT (frozen elements): CORS list, OPTIONS handling, `getPrincipal`/`getClaimValue`, envelopes, `context.log.error`.
- [x] Stateless: no `pg`, no `Pool`, no DB connection, no `set_config`, no migration (no-DB declaration §1; DR-D2).
- [x] Delegated OBO as the signed-in user; enumeration security-trimmed to the caller; no application-permission content read (architecture §2).
- [x] No new Graph endpoint vs the composite references (Golden Handler §4); only additions are the `*` search term (allowed delta) + `@odata.nextLink` pagination (authorized composite).
- [x] `function.json`: `authLevel: anonymous`, methods `["get","options"]`, route `dms_list_sites`.
- [x] Deterministic golden curl, no unbound placeholders (token acquired inline; never printed).
- [x] Mechanical lint PASS (below).

## Complete file list

- `Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/INDEX.md` (this controlling artifact)
- `Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/handlers/dms_list_sites/index.js`
- `Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/handlers/dms_list_sites/function.json`
- `Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/primary-reference/reporting_search_clients.index.js.md`
- `Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/primary-reference/reporting_search_clients.function.json.md`
- `Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/primary-reference/reporting_dms_tree.index.js.md`
- `Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/primary-reference/reporting_dms_tree.function.json.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/INDEX.md" --repo-root .`

PASS block (verbatim):

```
$ node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/INDEX.md" --repo-root .
PASS  <repo-root>/Codex Governance/Vault-DMS-dms_list_sites-Pass-1-VEP/INDEX.md
exit code: 0
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested verdict

**APPROVED** — on approval, Claude Code deploys `dms_list_sites` to `vaultgpt-func-dms` via Kudu (§1E/DR-D1) and runs the golden curl (Pass 3), then reports the result. A follow-up Role-C lands API Spec §2.6 (`proposed`, then `deployed` after the golden curl).
