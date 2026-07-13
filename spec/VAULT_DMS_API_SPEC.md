# VAULT DMS API SPEC

Scope: Vault DMS backend API. **Contract truth** owner.
Filename / location: `spec/VAULT_DMS_API_SPEC.md`.

> **Status: v0.1 SKELETON — contract surface; deployed contracts finalized as each `dms_*` handler lands.** This document enumerates the `dms_*` contract surface. Each entry carries a status: **`proposed`** (contract fixed here, handler not yet deployed) and/or **`deployed`** (a live `dms_*` handler on `vaultgpt-func-dms`). Each `dms_*` handler is a stateless delegated-OBO → Microsoft Graph mirror; its **primary reference** is the named deployed monolith `reporting_*` DMS handler cited in its VEP (Golden Handler Standard §2). Nothing here invents a Graph shape not present in a named reference handler.

---

## §1 Conventions

- Route naming: `dms_<operation>[_<entity>]` (e.g. `dms_search_sites`, `dms_tree`).
- Every endpoint executes **as the signed-in user** (Entra OID from EasyAuth `x-ms-client-principal`), calling Microsoft Graph **on-behalf-of** the user (OBO exchange to `https://graph.microsoft.com/.default`). No application-permission content reads; SharePoint permissions are the authority.
- Every endpoint is **stateless** — no database, no `pg`, no persisted state. Responses are produced live from Graph at request time.
- Envelope: the standard Vault Family-B shape — success `{ "data": { … }, "meta": { "timestamp", "version": "1.0" } }`; error `{ "error": { "code", "message", "status", "timestamp" } }`. Exception: `dms_read_file` returns the raw file bytes (binary), not the JSON envelope.
- Status codes: `401 UNAUTHORIZED` (missing EasyAuth identity or delegated token), `400 INVALID_REQUEST` (bad/missing params), `404 NOT_FOUND` (Graph 403/404 on the target — existence-disclosure-safe), `500 INTERNAL_SERVER_ERROR`, `502`-class mapped to `500` unless a reference handler specifies otherwise. Graph 403/404 → route 404.
- Boundary: no endpoint reads/writes any `reporting_*` or `theo_*` table. DMS-derived persistence is the consuming app's concern (architecture §0a/§6).

## §2 Contract Surface

### §2.1 `dms_search_sites` — tenant-wide site discovery
| Field | Value |
|-------|-------|
| Route | `GET /api/dms_search_sites?q=<2..100 chars, no % or _>` |
| Purpose | Search SharePoint sites the caller can access (Graph `GET /v1.0/sites?search={q}`), filtered to the tenant host (`vaulttax.sharepoint.com`) root sites, each verified by a delegated `/sites/{id}/drive` probe. |
| Success | `{ data: { sites: [ { site_id, site_name, web_url } ] } }` sorted by name. |
| Primary reference | `reporting_search_clients` (the Graph `/sites?search=` fallback path). **Delta:** no registry union (Vault DMS has no registry — the Graph search IS the source). |
| Status | `proposed` |

### §2.2 `dms_tree` — browse a site/drive tree (FILES AND FOLDERS)
| Field | Value |
|-------|-------|
| Route | `GET /api/dms_tree?siteId=<10..200, no % or _>&parentItemId=<optional, 5..200>` |
| Purpose | List the immediate children — **both folders and files** — of a drive node under a site, as the signed-in user; `parentItemId` omitted → the drive root's children. Paginates via `@odata.nextLink`. |
| Success | `{ data: { dms_tree: { site_id, drive_id, parent: { item_id, name, type:"folder" }, children: [ { item_id, name, type:"folder"\|"file", size, date_modified, web_url, has_children? (folders), mime_type? (files) } ] } } }` (folders first, then files, alphabetical within each). |
| Primary reference | `reporting_dms_tree`. **Delta (BINDING mirror requirement):** the child projection includes **files** (`item.file`), not folders only — `type` discriminates `folder`/`file`; file rows carry `size`/`mime_type`. No registry gate (site authority is delegated Graph). No site-label fetch — the caller carries the site name from dms_search_sites — so dms_tree calls no /sites/{id} endpoint. |
| Status | `proposed` |

### §2.3 `dms_resolve_item` — resolve an item to its live Graph identity (no persistence)
| Field | Value |
|-------|-------|
| Route | `POST /api/dms_resolve_item` `{ siteId, dmsItemId }` |
| Purpose | Resolve a site + drive item to its live Graph identity, for a consuming app to anchor in its own store. **Read-only — writes nothing.** |
| Success | `{ data: { item: { site_id, drive_id, drive_name, item_id, name, type:"folder"\|"file", web_url } } }` |
| Primary reference | `reporting_resolve_dms_folder` (the read half: Graph `/sites/{id}`, `/sites/{id}/drive`, `/drives/{id}/items/{itemId}`). **Delta:** the `reporting_folders` / `reporting_folder_dms_links` INSERTs and the registry gate are **removed** — Vault DMS returns identity only; the consuming app owns persistence. |
| Status | `proposed` |

### §2.4 `dms_read_file` — read a file's bytes
| Field | Value |
|-------|-------|
| Route | `GET /api/dms_read_file?driveId=<…>&itemId=<…>` |
| Purpose | Stream a file's bytes as the signed-in user (Graph `/drives/{driveId}/items/{itemId}/content` → 302 → fetch bytes), returning them with the upstream `Content-Type`/`Content-Disposition`. |
| Success | Raw binary body (HTTP 200) with `Content-Type`, `Content-Disposition`, `Content-Length` headers. |
| Primary reference | `reporting_download_dms_item` (the `graphGetContentRedirect` + binary-stream pattern). **Delta:** takes **`driveId`+`itemId` directly** (from a prior `dms_tree`/`dms_resolve_item`) instead of resolving a `reporting_folder_dms_links` row id via the DB — Vault DMS is stateless, so there is no DB lookup. |
| Note | Whether v1 streams bytes (as above) or instead mints a short-lived read SAS is an open item (architecture §9.1); the reference pattern is the byte-stream. |
| Status | `proposed` |

### §2.5 `dms_probe_connection` — delegated Graph health check
| Field | Value |
|-------|-------|
| Route | `GET /api/dms_probe_connection` |
| Purpose | Confirm the EasyAuth → OBO → Graph path works for the signed-in user (lightweight Graph call, e.g. `/me` or a root site probe). Diagnostic. |
| Success | `{ data: { ok: true, delegated_token_source, evaluated_under: "signed-in-user" } }` |
| Primary reference | `reporting_probe_dms_connection`. **Delta:** no hardcoded target site, **no DB / no `set_config`** (stateless); the probe is purely the OBO exchange + a delegated Graph call. |
| Status | `proposed` |

---

## §3 Boundary

No `dms_*` endpoint reads/writes `reporting_*` or `theo_*` tables, and none uses application-level Graph permissions to read content. All access is delegated, on-behalf-of the signed-in user, honouring SharePoint permissions (architecture §0a / §2 / §3). Consuming apps reach these endpoints through Vault Origin's App Host DMS bridge (architecture §6).
