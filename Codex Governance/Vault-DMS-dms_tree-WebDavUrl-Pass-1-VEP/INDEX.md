# Vault DMS — `dms_tree` `web_dav_url` field — Pass 1 Verified Evidence Pack

Controlling artifact for Codex review. Self-contained: amended handler under `handlers/dms_tree/`, deployed primary reference under `primary-reference/`. Adds one projected field — `web_dav_url` — to `dms_tree` file nodes so the Vault Origin shell can open Office files in the desktop app (Akshay #1b). The SharePoint `web_url` is a `Doc.aspx?sourcedoc=…` viewer URL the desktop Office URI scheme (`ms-excel:ofe|u|`) cannot open; `webDavUrl` is the direct path it can.

## Grounding Conformance Receipt

Role: Claude Code
Turn Type: Verified Evidence Pack (backend plan)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: P5
Turn issued against HEAD: vault-dms `c2d344093fc3573dd0fb269b4289532bd012910b` (pre-commit; GCR HEAD repointed to the package-present commit on landing per Conformance T25)
Currency-anchor form: git blob SHA at HEAD (Conformance §8 fallback), captured via `git rev-parse HEAD:<path>` this turn. Absolute paths in the Rule Anchor Table.

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|----------------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §2 | "inlines both full-verbatim in the turn" | Primary Reference — `reporting_dms_tree` index.js + function.json copied verbatim under `primary-reference/` |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "the specific validated field set; the specific Graph call(s) and projection; the contract's response shape" | Structural Mirror — `web_dav_url` is an ALLOWED-DELTA projection field |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §4 | "A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference)" | Gap Register / Boundary — `web_dav_url` is NOT a new endpoint (same `/children` DriveItem) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §5 | "Every in-scope endpoint gets a deterministic golden curl" | Golden Curls section |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md | deploy | "Claude Code MAY deploy handler/function code (+ `function.json`) to the dedicated **`vaultgpt-func-dms`** Function App after a Codex-APPROVED VEP" | Pass-3 deploy plan (Claude Code deploys func-dms) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/spec/VAULT_DMS_API_SPEC.md | §2.2 | "browse a site/drive tree (FILES AND FOLDERS)" | The `dms_tree` contract being amended (Role-C §2.2) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md | §1 | "Vault DMS opens **no** Azure Postgres connection" | Boundary — stateless; no DB touched by this field-add |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/Codex Governance/Vault-DMS-dms_tree-Pass-1-VEP/handlers/dms_tree/index.js | baseline | "Enumerate the immediate children of a drive node — FILES AND FOLDERS" | Deployed baseline being amended (byte-identical except the delta) |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/Codex Governance/Vault-DMS-dms_tree-WebDavUrl-Pass-1-VEP/handlers/dms_tree/index.js | delta | "the file's WebDAV direct path, projected from the SAME" | The single added field (file projection) |

### Currency anchors (HEAD blob SHAs, this turn)
- GOLDEN_HANDLER `dfc7fe2701f20ab6f255f3a5f280e771639d9ca1`; ARCHITECTURE `ceb3fd5caea307e13db0d649230130d897833663`; API_SPEC `ec25d828c950362f5e4d5bfa781da844078babac`; AZURE_POSTGRES `b6a5b1c65b787230b2492820538558f449e2bd33`; deployed `dms_tree` `871a39b8f3d56d3b065772f55e5b7716a80a9f57`.

## §1 Feature Identification + Architecture & boundary reconciliation
- **Feature:** `dms_tree` file nodes gain **`web_dav_url`** (the DriveItem `webDavUrl`, the direct SharePoint path). The Vault Origin shell uses it to build the Office desktop URI (`ms-excel:ofe|u|<web_dav_url>`); the existing `web_url` (a `Doc.aspx?sourcedoc=…` viewer URL) errors with "Office doesn't recognise the command." **DEPLOYED** endpoint modified: `dms_tree` (§2.2). No new route.
- **Boundary (architecture):** stateless — no database, no `pg`, no `reporting_*`/`theo_*` access; delegated OBO as the signed-in user. `web_dav_url` is read from the **SAME** `/drives/{id}/items/{id}/children` DriveItem already fetched — **no new Graph endpoint, no new token/auth surface, no new helper** (Golden Handler §4). Folders do not carry it (open-in-app is a file affordance). No Azure Postgres connection (Azure Postgres Schema §1).

## §2 Gap Register
**PRE-LAND** — the API Spec §2.2 `dms_tree` Success shape does not yet list `web_dav_url`. This VEP lands a scoped Role-C verbatim edit adding it to the children file projection in the SAME microstep (Governor PRE-LAND; §5 below). No other gap: `webDavUrl` is a default DriveItem property present in the existing `/children` response (no `$select` is used), so no Graph query change is required.

## §3 Sub-phase walk (P1–P8)
- **P1 Feature identification:** §1 above — `dms_tree` DEPLOYED; add one projection field.
- **P2 Architecture/boundary reconciliation:** stateless mirror; same `/children` DriveItem; no DB (§1 Boundary).
- **P3 Gap register:** PRE-LAND (§2).
- **P4 Contract grounding:** `dms_tree` DEPLOYED (API Spec §2.2). Response gains `web_dav_url? (files)` via the Role-C edit (§5).
- **P5 Handler grounding:** primary reference deployed **`reporting_dms_tree`** (index.js + function.json) copied verbatim under `primary-reference/`; the amended handler under `handlers/dms_tree/` is byte-identical to the APPROVED deployed `dms_tree` (`871a39b8`) except the one ALLOWED-DELTA line. Structural Mirror below.
- **P6 Boundary re-check:** no new external call/helper/auth; folders unchanged (§4).
- **P7 Golden curls:** deterministic curl run by Claude Code against `vaultgpt-func-dms` post-deploy (§6).
- **P8 Assembly:** this pack (GCR + Rule Anchor Table + lint PASS).

## §4 Structural Mirror Table
Baseline = the APPROVED deployed `dms_tree` (`871a39b8`), itself the approved structural mirror of primary reference `reporting_dms_tree` (Vault-DMS-dms_tree-Pass-1-VEP). This microstep changes exactly one region:

| Region | vs deployed `dms_tree` / `reporting_dms_tree` | Classification | Anchor |
|--------|-----------------------------------------------|----------------|--------|
| Family-B helper block (send/errorBody/successBody/getPrincipal/getClaimValue/parseBody/parseJsonSafe/requestUrl/getOboInputToken/exchangeGraphToken/graphGetJson) | byte-identical | EXACT | Golden Handler §4 (helper block EXACT) |
| Validation, OBO input, Graph token exchange, drive/root/parent resolution, sort, envelope, error mapping | byte-identical to deployed `dms_tree` | EXACT | baseline anchor `871a39b8` |
| `enumerateImmediateChildren` — **file** projection | adds `web_dav_url: typeof item.webDavUrl === "string" ? item.webDavUrl : null` to the file node, from the SAME `/children` DriveItem | **ALLOWED DELTA** (projection field; no new Graph call) | Golden Handler §4 ("the specific … projection; the contract's response shape") |
| `enumerateImmediateChildren` — **folder** projection | unchanged | EXACT | baseline anchor |

No DEVIATION rows.

## §5 Role-C §2.2 verbatim edit (PRE-LAND, this microstep)
Target: `spec/VAULT_DMS_API_SPEC.md` §2.2 Success row. Add `web_dav_url? (files)` to the children file projection.

BEFORE:
```
| Success | `{ data: { dms_tree: { site_id, drive_id, parent: { item_id, name, type:"folder" }, children: [ { item_id, name, type:"folder"\|"file", size, date_modified, web_url, has_children? (folders), mime_type? (files) } ] } } }` (folders first, then files, alphabetical within each). |
```
AFTER:
```
| Success | `{ data: { dms_tree: { site_id, drive_id, parent: { item_id, name, type:"folder" }, children: [ { item_id, name, type:"folder"\|"file", size, date_modified, web_url, has_children? (folders), mime_type? (files), web_dav_url? (files, WebDAV direct path for desktop-app open) } ] } } }` (folders first, then files, alphabetical within each). |
```

## §6 Golden Curls (run by Claude Code against `vaultgpt-func-dms` at Pass-3 deploy; never print the token)
Auth: `TOKEN=$(az account get-access-token --resource api://4e1a1e31-5c20-4480-99e4-098901707d9e --query accessToken -o tsv)` (as `wmansfield@vault-tax.com`). Site/folder pinned at run from `dms_list_sites` → the `7percent` site + the `2023/Vault/Deliverables` folder (a known Office-file folder).
1. **OPTIONS** `dms_tree` → `204`.
2. **Unauth** GET `dms_tree` (no bearer) → `401`.
3. **Happy** GET `/api/dms_tree?siteId=<7percent>&parentItemId=<Deliverables folder>` with bearer → `200`; assert each `children[]` node with `type:"file"` carries a non-null `web_dav_url` that is an `https://vaulttax.sharepoint.com/…` direct path (NOT a `Doc.aspx` URL); folders carry no `web_dav_url`.

## §7 Out of scope
No change to any other `dms_*` handler, the Graph call set, auth, folders, or the stateless boundary. FE consumption of `web_dav_url` (vault-dms `DmsBrowser`/`dmsClient` + Origin `officeOpen`) is the paired FE follow-up, not this backend microstep.

## Mechanical Lint
Run `node tools/lint_microstep_submission.mjs "<this file>" --repo-root .` → PASS (block asserted on submission).
