# VAULT DMS — AZURE POSTGRES SCHEMA (NO DATABASE DECLARATION)

Scope: Vault DMS data layer. **Data truth** owner.
Filename / location: `spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md`.

> **Status: v0.1 — BINDING DECLARATION. Vault DMS has NO database.** This document exists to occupy the "data truth owner" slot in the Vault governance shape and to state, unambiguously, that Vault DMS persists nothing. It is not a schema; there is no DDL, no table, no policy, no migration, no helper.

---

## §1 Declaration (BINDING)

**SharePoint is the system of record. Microsoft Graph is the data plane. Vault DMS holds no state.**

- Vault DMS opens **no** Azure Postgres connection and requires **no** `POSTGRES_CONNECTION_STRING`. The `pg` dependency is intentionally absent from `package.json`.
- There is **no** `dms_` table set, **no** RLS, **no** SECURITY DEFINER helper, **no** `_exists_unscoped` function, and **no** migration file in this repository.
- Every `dms_*` handler produces its response **live** from Microsoft Graph, on-behalf-of the signed-in user, at request time. Nothing is cached to a store, indexed, or copied.

## §2 Why (architecture §0a / §3 / §5; DR-D2)

Vault DMS is a **mirror**, not a store. Its entire purpose is that the tenant's SharePoint DMS appears inside Vault Origin exactly as it does in SharePoint, with zero maintenance burden. Persisting DMS content would create "our own DMS" — a parallel system to keep in sync — which is explicitly rejected. Statelessness is therefore a **feature and an invariant**, and a deliberate, principled departure from the data-owning Vault regimes (Vault Theo `theo_`, Corporate Reporting `reporting_`).

## §3 Where DMS-derived persistence DOES live (boundary)

When a consuming app needs to *remember* a DMS location, that persistence is the **consuming app's** responsibility, in its **own** governed backend and schema — never here. Examples:

- Corporate Reporting anchoring a `reporting_folders` / `reporting_folder_dms_links` row, its `reporting_client_sites` registry, and the `reporting_entities.client_site_id` FK — all governed by the **Corporate Reporting Azure Postgres Schema**, populated by that app from a `dms_resolve_item` result.
- Vault Theo persisting a project-knowledge pointer — governed by the **Vault Theo Azure Postgres Schema**.

Vault DMS returns the live Graph **identity**; the consuming app owns any **memory** of it. Vault DMS MUST NOT read or write any `reporting_*` or `theo_*` table.

## §4 Change control

Introducing any state into Vault DMS (a cache table, an audit log, an index) is a **material architecture change** requiring a Walter-authorized amendment to `governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md` §5 and this declaration, landed as a Role-C edit, before any such object may be proposed. Absent that amendment, any pack introducing a database object for Vault DMS is invalid on its face.
