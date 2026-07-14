# VAULT DMS — ARCHITECTURE & STRUCTURE FOUNDATION
**Version: 0.1 — DRAFT for Walter review**
**Status: Foundation authority for `vault-dms`. The Vault DMS API Spec, the (no-database) Azure Postgres declaration, and the Vault DMS Golden Handler Standard sit on top of this document.**

---

## 0. Purpose and Authority

This document is the architecture and structure foundation for **Vault DMS** — a **stateless mirror gateway** that surfaces the tenant's **SharePoint document management system inside Vault Origin**, via delegated Microsoft Graph (on-behalf-of the signed-in user). It is the shared DMS backend that **all Vault apps consume through Origin**.

It is NOT a schema authority, an API spec, or a handler standard. The downstream governed documents (the Vault DMS API Spec, the Vault DMS Azure Postgres declaration, the Vault DMS Golden Handler Standard) are authored in the established Vault governance shape and own contract / data / handler-pattern truth respectively. This document defines the boundaries, seams, and contracts those documents must respect.

In any conflict between this document and a downstream governed document on a matter the downstream document owns, the downstream document governs once it exists. Until it exists, this document is the grounding authority.

### 0a. The defining principle — this is NOT a new DMS

**Vault DMS is a mirror, not a system of record.** SharePoint *is* the DMS. Vault DMS holds **no state of its own** — no database, no copy of folders/files, no registry, no maintained index. Every response is produced live from Microsoft Graph, as the signed-in user, at request time. What a user sees inside Vault Origin is **exactly** what they see in SharePoint — the same sites, folders, and files, the same permissions — with **zero maintenance burden** on Vault. Persisting or curating any DMS content would make it "our own DMS," which is explicitly rejected.

Consequences that are BINDING:

- **No database.** Vault DMS touches no Azure Postgres table. The Azure-Postgres governed document for this repo is a **"no database — SharePoint/Graph is the system of record"** declaration, not a schema. There is no `dms_` table set, no RLS, no migration, no `_exists_unscoped` helper.
- **SharePoint is the authority.** Site/folder/file visibility is whatever the signed-in user's delegated Graph token grants — never a Vault-maintained allow-list. A user reaches every site they can access and only those.
- **App-specific persistence is NOT here.** When a consuming app needs to *remember* something about the DMS (e.g. Corporate Reporting anchoring a `reporting_folders` row to a drive item, or its `reporting_client_sites` registry, or the `reporting_entities` FK), that persistence lives in **that app's** backend. Vault DMS provides only the live Graph identity; it never writes another app's tables.

### 0b. Relationship to existing Vault authority documents

- This document does NOT replace, restate, or override the **Corporate Reporting** authority documents or the **Vault Theo** authority documents.
- Vault DMS is a net-new, dedicated Azure Function App (`vaultgpt-func-dms`); it is not part of the `vaultgpt-func-premium` monolith and does not carry `reporting_*` or `theo_*` handlers.
- The predecessor DMS surface — the `reporting_dms_*` / `reporting_search_clients` / `reporting_list_visible_clients` handlers deployed in the monolith — is the historical implementation Vault DMS supersedes. After cut-over, Origin's App Host DMS bridge consumes Vault DMS instead of those handlers (§7).

### 0c. Governance regime

`vault-dms` adopts the existing Vault governance regime (the Vault Theo regime) without modification:

- **Claude Code** authors work, confined to a dedicated `development` branch of the `vault-dms` repository; promotion to `main` is Walter's.
- **Codex** reviews Claude Code's work (Pass 2) and executes Role-C verbatim documentation edits (Pass 4). Codex is the sole reviewer and the sole documentation editor; there is no "Bolt."
- **ChatGPT** is Walter-advisory only — out of the formal pipeline; never a gate, never grounding.
- **Walter** holds authority: sole execution authority for any writes, sole deployment authority except the scoped deployment exception granted to Claude Code for `vaultgpt-func-dms` (Execution Orchestration Standard §1E / DR-D1), and sole merge/runtime-acceptance authority.

---

## 1. Repository Boundary Model

### 1.1 `vault-dms` (NEW — primary build target)

Owns the entire DMS mirror gateway: the delegated-OBO → Microsoft Graph broker and the `dms_*` handler set (§4). Claude Code operates here freely, on its dedicated `development` branch, under the governance regime. Deployed to the dedicated `vaultgpt-func-dms` Function App.

### 1.2 `vault-origin` (EXISTING — consumes Vault DMS; additive change only)

Owns the surface everything launches from and **hosts the shell-level DMS consumption layer** — the App Host DMS bridge (`src/shell/appHost/dmsBridge.ts`, `dmsMirrorClient.ts`, `dmsResolveClient.ts`, `useFolderPicker.ts`) governed by the Vault Origin App Host Contract. At cut-over, that bridge's base URL + endpoint names repoint from the monolith `reporting_dms_*` endpoints to Vault DMS's `dms_*` endpoints. Origin changes are **additive / configuration** only, made under the Reporting-FE / App-Host governance regime (Codex), not this repo's regime.

### 1.3 Consuming apps — `corporate-reporting`, `vault-theo`, future apps (near read-only wrt Vault DMS)

Each app consumes the `dms_*` API **through Origin**, as the signed-in user. Vault DMS publishes the `dms_*` contract; apps call it. Vault DMS never reaches into a consuming app, and a consuming app's DMS-derived persistence (folder anchors, registries, entity FKs) stays in that app's own governed backend.

---

## 2. The Gateway Seam

### 2.1 Why a gateway exists

Browser-direct Microsoft Graph calls with a delegated token are possible but would scatter Graph logic, token-exchange, and SharePoint-shape handling across every app's frontend. A single **server-side gateway** in `vault-dms` centralises: the on-behalf-of token exchange, the Graph call shape, the SharePoint→Vault projection, and the one place all apps + Origin consume. This is the enterprise-correct seam.

### 2.2 Binding properties

- The gateway is **stateless**: it holds no data and persists nothing. Its only server-held credential is the AAD app client secret, supplied as a **Key Vault reference** (`AAD_CLIENT_SECRET` → `kv-vaultgpt-uks/aad-client-secret`) resolved via the app's managed identity.
- Authentication in front of the gateway is **EasyAuth** (Entra); the signed-in user's identity arrives as `x-ms-client-principal` (Entra OID) and the delegated access token as `x-ms-token-aad-access-token` / `Authorization: Bearer`.
- Every Graph call is **on-behalf-of the signed-in user** (OBO exchange to `https://graph.microsoft.com/.default`). The gateway never uses application-level Graph permissions to read content — visibility is always the user's own SharePoint access.
- The request/response shape is the **standard Vault Family-B envelope** (`{ data, meta }` / `{ error }`), so consumers treat Vault DMS exactly like every other Vault backend.

### 2.3 Carried constraints (state explicitly)

- The gateway's reach equals the signed-in user's delegated Graph permissions and the delegated scopes consented on the AAD app (`Sites.Read.All` / `Files.Read.All` or equivalent, admin-consented). If a scope is missing, the corresponding `dms_*` call returns the mapped Graph error, never a fabricated result.
- Latency is a Graph round-trip per call; deep trees paginate via `@odata.nextLink`. Short-TTL caching is a possible later optimisation and is explicitly out of scope for v1 (and must never become a persisted store).

---

## 3. The Mirror Principle (BINDING)

- Vault DMS surfaces **files AND folders** — the full SharePoint tree as the user sees it, not a folder-only or curated subset. (The predecessor `reporting_dms_tree` returned folders only; the mirror must show files too.)
- Discovery is **tenant-wide within the user's access**: site search runs against Graph, not a Vault registry; browse descends any drive the user can open; nothing is gated on a Vault-maintained list.
- Vault DMS performs **no writes to SharePoint** in v1 (read/mirror only: search, browse, resolve identity, read file bytes). Folder *creation* and folder *anchoring* are consuming-app concerns; if a write-through mirror capability is ever wanted it is a separate Walter-authorized extension.
- The mirror is **automatic**: because it reads SharePoint live via Graph, it stays in sync with SharePoint with no sync job, no maintenance, and no drift.

---

## 4. The `dms_*` Handler Set

Full contracts are authored in the Vault DMS API Spec; full structure/SQL(N-A)/curl rules in the Vault DMS Golden Handler Standard. This section fixes the handler surface.

| Handler | Purpose | Notes |
|---|---|---|
| `dms_search_sites` | Tenant-wide SharePoint site search (Graph `/sites?search=`) scoped to the caller's access | Read-only; no registry |
| `dms_tree` | Browse a site/drive tree — **files and folders** | Per-node expansion via `parentItemId`; `@odata.nextLink` pagination |
| `dms_resolve_item` | Resolve a site + item to its live Graph identity (site/drive/item/name/webUrl) | Read-only; **no persistence** — returns identity for a consuming app to anchor |
| `dms_read_file` | Read/download a file's bytes (or mint a short-lived read SAS / stream) | Membership honoured by Graph as the user |
| `dms_probe_connection` | Health / connectivity check for the delegated Graph path | |

Binding rules:

- Every handler authenticates via EasyAuth, resolves the Entra OID, performs the OBO exchange, and calls Graph **as the signed-in user**. No application-permission content reads.
- Every handler is **stateless** — no database connection, no `pg`, no table access. Built-in `https` only; no runtime dependencies.
- The route convention is `dms_<operation>[_<entity>]`; the deployed primary reference for each handler is the corresponding monolith `reporting_*` DMS handler (a deployed Family-B handler whose Graph/OBO profile matches), cited full-verbatim per the Golden Handler Standard.

---

## 5. No Schema Authority (BINDING)

Vault DMS has **no data layer**. There is no `dms_` table, no RLS, no migration, no SECURITY DEFINER helper. The repo's `spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md` is a **declaration** that SharePoint/Graph is the system of record and that any DMS-derived persistence lives in the consuming app. This is a deliberate, principled departure from the data-owning Vault apps (Theo/Reporting), because Vault DMS is a mirror, not a store (§0a).

---

## 6. Consumption Through Origin

- All apps reach Vault DMS **through Vault Origin's App Host DMS bridge**, never by each app re-implementing Graph. Origin is the single wiring point (base URL + `dms_*` endpoints); apps call the bridge.
- The bridge passes the signed-in user's auth through to Vault DMS (EasyAuth/OBO), so RLS-equivalent SharePoint permission enforcement is automatic and per-user.
- A consuming app that needs to remember a DMS location persists that in its **own** backend (e.g. Reporting anchors a `reporting_folders` row from a `dms_resolve_item` result). Vault DMS returns identity; the app owns the memory.

---

## 7. Predecessor Decommissioning (NON-BLOCKING)

- The monolith `reporting_dms_*` / `reporting_search_clients` / `reporting_list_visible_clients` handlers are the predecessor DMS implementation. They remain in place and functional until cut-over.
- Cut-over: Origin's App Host DMS bridge repoints to Vault DMS; consuming apps that called the monolith DMS endpoints directly are migrated to consume Vault DMS through Origin.
- Deprecating/removing the monolith DMS handlers is a **separate, non-blocking workstream** under the Reporting regime; Claude Code MUST NOT alter the monolith (`vaultgpt-func-premium` is read-only) and MUST NOT drop those handlers without explicit Walter direction.

---

## 8. Deliverable Sequence

1. **This architecture/structure doc** (foundation) — under review.
2. **Governance set** — Grounding Conformance, Claude-Code Governor, Codex Review, Golden Handler, Execution Orchestration (with DR-D1 granting Claude Code deploy to `vaultgpt-func-dms`), retargeted from the Vault Theo regime; plus the mechanical lint.
3. **Spec docs** — Vault DMS API Spec (the `dms_*` contract surface) and the no-database Azure-Postgres declaration.
4. **Handlers** — the `dms_*` set, ported from the monolith `reporting_*` DMS handlers (stateless, tenant-wide, files+folders), each with a Pass-1 VEP for Codex.
5. **Deploy + verify** — Kudu deploy to `vaultgpt-func-dms`, golden curls via `az` token, KV-ref/OBO resolution confirmed.
6. **Wire Origin** — repoint the App Host DMS bridge to Vault DMS (Reporting-FE/App-Host regime); then predecessor decommissioning.

---

## 9. Open Items for Walter

1. Confirm the delegated Graph scopes consented on the "Vault GPT API" app (`4e1a1e31…`) cover tenant-wide `dms_*` (`Sites.Read.All`, `Files.Read.All`); if `dms_read_file` should return bytes vs. a short-lived read SAS.
2. Confirm the cut-over sequencing for Origin's bridge repoint and the monolith DMS deprecation timeline.

---

*End of foundation document v0.1.*
