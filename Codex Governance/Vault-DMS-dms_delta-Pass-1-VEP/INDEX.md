# Vault DMS — `dms_delta` — Pass-1 VEP (Layer 2: incremental live-mirror sync)

Controlling artifact for Codex review. Self-contained: handler under `handlers/`, deployed primary reference under `primary-reference/`.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Verified Evidence Pack (backend plan)
Turn issued against HEAD: ee745f3a67d6de441ba6dea870d3467af36b39ad (development; the commit that first adds this package — T29 artifact-presence probe resolves here and at every later commit; grounding reads were against parent 497b4fd)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: P5
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §3 | "Is **stateless**: no database connection, no `pg`, no table access, no persisted state." | No pg/DB/cursor; the caller holds the delta token (Structural Mirror) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference)" | The Graph `/drive/root/delta` endpoint — authorized verbatim by Walter (Gap Register) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §2 | "Every Graph call is **on-behalf-of the signed-in user**" | OBO exchange + Graph delta call as the user (handler module.exports) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §3 | "Vault DMS surfaces **files AND folders**" | Delta change projection includes both `item.folder` and `item.file` |
| governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md | §8 | "`PROCEED` / `PRE-LAND` / `ESCALATE`" | Gap Register PRE-LAND for the API Spec §2.7 addition |
| spec/VAULT_DMS_API_SPEC.md | §2.2 | "browse a site/drive tree (FILES AND FOLDERS)" | §2.7 mirrors the §2.2 site→drive resolution + projection |

## Walter authorization (verbatim; predates this VEP — Golden Handler §4 / T12)

> **Walter authorization (2026-07-19):** Vault DMS handlers are authorized to call the Microsoft Graph drive **delta** endpoints — `GET /v1.0/drives/{drive-id}/root/delta` and its `?token=` continuation/deltaLink form — on-behalf-of the signed-in user, for incremental live-mirror sync. This is a new external Graph interaction per Golden Handler §4.

## Purpose

`dms_delta` — stateless **incremental** sync of a SharePoint drive as the signed-in user: given `siteId` (+ an optional opaque `deltaToken` from a prior response), return the set of changed DriveItems (added / renamed / moved / removed) since that token, plus a fresh `delta_token`. No token ⇒ a full baseline. This is Layer 2 of the OneDrive-style live-mirror plan: the client keeps its cached tree (Layer 1) and, on revalidation, applies only the delta instead of re-listing every folder — cheap, fast, and still a true live mirror. The client holds the token (persisted per the DMS Snapshot Storage Exception); func-dms stays stateless.

## Scope

- **In scope:** one stateless handler `dms_delta` (`GET /api/dms_delta?siteId=&deltaToken=`) + `function.json`, deployed to `vaultgpt-func-dms`; plus a PRE-LAND Role-C addition of API Spec §2.7 (below).
- **Out of scope:** the FE delta-consumption wiring (separate governed FE package — applies changes to the cached tree); Layer 3 change-notifications (func-chat); other `dms_*` handlers; any database (there is none); `main`.

## Architecture & boundary reconciliation

- **Stateless (Golden Handler §3; architecture §5; DR-D2):** no `pg`, no `Pool`, no stored cursor. The delta token is held by the CLIENT and passed back each call; the handler reconstructs the Graph delta URL server-side from the site-derived `driveId`.
- **SSRF-safe token handling:** the client-supplied `deltaToken` is validated to a bounded URL-safe charset (`/^[A-Za-z0-9._~=+-]+$/`, ≤4000) and is used ONLY as the `token` query value on the handler's OWN `https://graph.microsoft.com/v1.0/drives/{driveId}/root/delta` URL. The handler never fetches a client-supplied URL; `@odata.nextLink`/`@odata.deltaLink` are reduced to their `token` param and re-composed onto the server-controlled URL.
- **New external Graph interaction (Golden Handler §4 / T12):** `/drives/{id}/root/delta` is not called by any deployed handler → authorized verbatim by Walter (above). All other Graph calls (`/sites/{id}/drive` site→drive resolution) mirror `reporting_dms_tree` EXACT.
- **Delegated OBO as the signed-in user (Conformance §6 T40):** every Graph call is OBO; no application-permission read; no `reporting_*`/`theo_*` table.
- **Files AND folders (architecture §3):** the change projection maps both `item.folder` and `item.file`, mirroring the §2.2 field set; `deleted` items carry `{ item_id, parent_id, deleted:true }`.
- **Resync (Graph 410):** an expired/invalid delta token → Graph 410 → the handler returns `410 RESYNC_REQUIRED` so the client drops its token and re-baselines (no hard failure).

## Gap Register

**PRE-LAND** — API Spec §2.7 (`dms_delta`) does not yet exist; this VEP lands it via a scoped Role-C addition in the same microstep (Governor §8 PRE-LAND). The new Graph delta endpoint is authorized verbatim above (Golden Handler §4 / T12), so it is not an ESCALATE.

**Role-C verbatim edit (for Codex to execute on approval), target `spec/VAULT_DMS_API_SPEC.md` — add new section §2.7 after §2.6:**

```
### §2.7 `dms_delta` — incremental drive change sync (live mirror)
| Field | Value |
|-------|-------|
| Route | `GET /api/dms_delta?siteId=<10..200, no % or _>&deltaToken=<optional opaque, [A-Za-z0-9._~=+-], ≤4000>` |
| Purpose | Return the DriveItems changed (added/renamed/moved/removed) since the caller's `deltaToken`, plus a fresh token; no token ⇒ full baseline. Cheap incremental refresh so a host patches its cached tree in place instead of re-listing (Layer 2 of the live-mirror plan). |
| Success | `{ data: { dms_delta: { site_id, drive_id, baseline, changes: [ { item_id, parent_id, deleted, type?:"folder"\|"file", name?, size?, date_modified?, web_url?, has_children? (folders), mime_type?/web_dav_url? (files) } ], delta_token } } }` |
| Errors | 400 invalid siteId/deltaToken; 401 EasyAuth/OBO; 404 site not accessible; 410 `RESYNC_REQUIRED` (token expired → re-baseline); 500 OBO config. |
| Primary reference | `reporting_dms_tree` (OBO + `/sites/{id}/drive` resolution + `@odata.nextLink` pagination). **Delta:** the Graph `/drives/{id}/root/delta` endpoint (Walter-authorized 2026-07-19); client-held opaque token (stateless); SSRF-safe server-reconstructed URL. |
| Status | `proposed` |
```

No other gaps: stateless; depends on no unlanded prerequisite (the app + OBO/EasyAuth/KV secret are live and proven by `dms_tree`/`dms_list_sites`).

## Sub-phase walk (P1–P8)

- **P1 Feature identification:** `dms_delta` — Layer 2 incremental sync; new `dms_*` handler.
- **P2 Architecture & boundary reconciliation:** above (stateless, SSRF-safe, OBO, new-endpoint authorized).
- **P2.5 Gap disclosure:** PRE-LAND (§2.7 Role-C addition).
- **P3 Reality lock (no schema):** stateless; route `dms_delta` PROPOSED; no DB object.
- **P4 Contract grounding:** API Spec §2.7 (added by the PRE-LAND); route convention `dms_<operation>`.
- **P5 Handler grounding:** primary reference deployed `reporting_dms_tree` (index.js + function.json), inlined verbatim under `primary-reference/`. Structural Mirror below.
- **P6 State grounding:** N/A — stateless.
- **P7 Curl grounding:** deterministic golden curl below.
- **P8 VEP assembly:** this document.

## Primary Reference (deployed, full verbatim in-pack)

- `primary-reference/reporting_dms_tree.index.js.md` — the canonical OBO Graph-browse handler whose boilerplate `dms_delta` mirrors EXACT.
- `primary-reference/reporting_dms_tree.function.json.md` — its function-json.

## Structural Mirror Table

| Handler region (`handlers/dms_delta/index.js`) | Primary reference region | Classification | Basis |
| --- | --- | --- | --- |
| `require("https")`, corsHeaders, `SITE_ID_*` constants, `isValidSiteIdFormat`, `send`/`nowIso`/`errorBody`/`successBody`/`getPrincipal`/`getClaimValue`/`buildKnownError`/`parseJsonSafe`/`requestUrl`/`getBearerTokenFromAuthorization`/`getOboInputToken`/`exchangeGraphToken` | same | EXACT | frozen Family-B helper block (copied verbatim from deployed `dms_tree`) |
| `graphGetJson` | same | ALLOWED DELTA | adds a distinct `410 → RESYNC_REQUIRED` mapping (delta-token expiry) atop the identical 403/404/500 mapping |
| oid + oboInput extraction, siteId validation | same | EXACT | reference validation preserved |
| `DELTA_TOKEN_*` + `isValidDeltaTokenFormat`, `extractTokenParam` | (none) | ALLOWED DELTA | new bounded/SSRF-safe token validation + token-only extraction (never fetch a client URL) |
| `/sites/{siteId}/drive` site→drive resolution | same Graph endpoint | EXACT | Golden Handler §4 (same endpoint) |
| `/drives/{driveId}/root/delta[?token=]` paginated loop + `mapDeltaItem` | (none) | ALLOWED DELTA (Walter-authorized new endpoint) | Golden Handler §4 / T12 — verbatim authorization above; projection mirrors §2.2 fields + `deleted`/`parent_id` |
| response `{ dms_delta: { site_id, drive_id, baseline, changes, delta_token } }` | `{ dms_tree: { … } }` | ALLOWED DELTA | new contract per §2.7; same envelope/`successBody` shape |
| `pg`/`Pool`/DB/registry | present in monolith reference | **REMOVED (stateless)** | Golden Handler §3; no-DB; DR-D2 |

## Golden Curl (deterministic; Claude Code runs post-deploy)

```
TOKEN=$(az account get-access-token --resource "api://4e1a1e31-5c20-4480-99e4-098901707d9e" --query accessToken -o tsv)
# Baseline (no deltaToken): expect 200 + a full change set + a delta_token.
curl -sS -G -w '\nHTTP %{http_code}\n' \
  "https://vaultgpt-func-dms.azurewebsites.net/api/dms_delta" \
  --data-urlencode "siteId=vaulttax.sharepoint.com,a43ef8a2-42fd-4fc0-ae8b-672a5fbdb643,4583d217-e6e7-4bd8-b25a-c1564e3c1da3" \
  -H "Authorization: Bearer $TOKEN" -H "x-ms-token-aad-access-token: $TOKEN"
```

Assertion: HTTP 200; body `{ data: { dms_delta: { site_id, drive_id, baseline:true, changes:[…], delta_token:"<opaque>" } }, meta:{…} }`; each non-deleted change carries `item_id, parent_id, type` (+ `name` etc.); `delta_token` present + non-empty. A second call with `--data-urlencode "deltaToken=<that token>"` returns `baseline:false` + (typically empty) `changes` + a fresh token. 400 invalid input; 401 EasyAuth/OBO; 404 site; 410 resync; 500 OBO config. Token never printed.

## Parity checklist (Golden Handler §5.4)

- [x] One canonical primary reference handler + function.json, named + in-pack verbatim (`primary-reference/`).
- [x] Family-B helper block mirrored EXACT (frozen elements).
- [x] Stateless: no `pg`/`Pool`/DB/cursor/migration (no-DB §1; DR-D2) — client holds the token.
- [x] Delegated OBO as the signed-in user; no application-permission content read (T40).
- [x] New Graph endpoint (`/drive/root/delta`) authorized verbatim by Walter, predating this VEP (Golden Handler §4 / T12).
- [x] SSRF-safe: client supplies only a bounded token; server reconstructs its own URL.
- [x] Files AND folders (+ deleted) in the change projection (Architecture §3).
- [x] `function.json`: `authLevel: anonymous`, methods `["get","options"]`, route `dms_delta`.
- [x] Deterministic golden curl, no unbound placeholders (token inline; never printed).
- [x] PRE-LAND Role-C addition for API Spec §2.7 included verbatim (Gap Register).
- [x] Mechanical lint PASS (below).

## Complete file list

- `Codex Governance/Vault-DMS-dms_delta-Pass-1-VEP/INDEX.md`
- `Codex Governance/Vault-DMS-dms_delta-Pass-1-VEP/handlers/dms_delta/index.js`
- `Codex Governance/Vault-DMS-dms_delta-Pass-1-VEP/handlers/dms_delta/function.json`
- `Codex Governance/Vault-DMS-dms_delta-Pass-1-VEP/primary-reference/reporting_dms_tree.index.js.md`
- `Codex Governance/Vault-DMS-dms_delta-Pass-1-VEP/primary-reference/reporting_dms_tree.function.json.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-dms_delta-Pass-1-VEP/INDEX.md" --repo-root .` — expect `PASS`.

## Requested verdict

**APPROVED** — on approval, Codex executes the §2.7 Role-C addition (Gap Register), and Claude Code deploys `dms_delta` to `vaultgpt-func-dms` via Kudu (scoped deploy exception) and runs the golden curl (Pass 3). The FE delta-consumption wiring follows as a separate governed FE package (Layer 2 client).
