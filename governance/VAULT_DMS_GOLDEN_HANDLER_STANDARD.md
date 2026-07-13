# VAULT DMS GOLDEN HANDLER STANDARD

Scope: Vault DMS backend handlers. The structural / external-call / curl truth owner for Vault DMS handler implementation.
Filename / location: `governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md`.

> **Status: v0.1 DRAFT — canonical structures only.** This standard establishes the handler-structure and curl conventions Vault DMS handlers MUST follow, and is the truth owner the Conformance Standard §4A (P5/P6/P7, I2–I5) and the Vault DMS Governor §7 point at. The concrete handler **family registry** (§6) is populated as the `dms_*` handlers are authored against the Vault DMS API Spec. Vault DMS is **stateless** (no database); the SQL / Golden-SQL machinery of the data-owning Vault regimes is intentionally NOT carried — see §5.2.

---

## §1 Authority

The Conformance Standard governs grounding/format/invalidity. This standard governs handler structure and the Golden Curl Standard. The Vault DMS API Spec owns contract truth; `VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md` owns the architecture/boundary truth (stateless mirror; no database; OBO-as-user). On conflict over those matters, those documents govern.

## §2 Canonical Primary Reference Selection

For each implementation package, Claude Code selects **exactly one** deployed handler file and **exactly one** deployed `function.json` file as the canonical Primary Reference, and inlines both full-verbatim in the turn (Conformance §6 T9). **Composite** selection (two handlers each contributing part of the target pattern) is prohibited without Walter authorization (T10). Because Vault DMS is greenfield in its own app, the primary reference for each `dms_*` handler is the corresponding **deployed monolith `reporting_*` DMS handler** — a deployed Family-B handler whose delegated-OBO + Microsoft Graph call profile is the closest match (e.g. `reporting_dms_tree`, `reporting_search_clients`, `reporting_resolve_dms_folder`, `reporting_download_dms_item`, `reporting_probe_dms_connection`). The reporting handler is a permitted cross-repo deployed reference and MUST be named and inlined in full, exactly as `theo_message` referenced `reporting_probe_dms_connection`.

## §3 Handler Structure (Vault DMS conventions)

Every Vault DMS handler:
1. Authenticates the caller via EasyAuth (`x-ms-client-principal` → Entra OID; 401 if missing) and calls Microsoft Graph **on-behalf-of the signed-in user** (OBO token exchange to `https://graph.microsoft.com/.default`). It NEVER reads SharePoint content with application-level Graph permissions — visibility is always the user's own SharePoint access.
2. Is **stateless**: no database connection, no `pg`, no table access, no persisted state. Built-in `https` only; the response is produced live from Graph at request time.
3. Reads/writes NOTHING outside Microsoft Graph. It MUST NOT read or write `reporting_*` or `theo_*` tables; DMS-derived persistence is the consuming app's concern (architecture §0a/§6).
4. Validates input against the Vault DMS API Spec contract; rejects unknown/extra fields; returns the spec's status codes; maps Graph 403/404 to the spec's error taxonomy (existence-disclosure-safe).
5. Leaks nothing sensitive (no tokens, no raw OBO/Graph tokens, no client secret, no upstream Graph URLs beyond what the contract returns) in responses or logs.

## §4 Allowed Deltas

A handler region is classified **EXACT** (byte-identical structural mirror of the Primary Reference) or **ALLOWED DELTA** (a permitted variation). Allowed deltas are limited to: route/endpoint names; the specific validated field set; the specific Graph call(s) and projection; the contract's response shape. A **new external-system interaction** (a Microsoft Graph endpoint not called in the chosen primary reference), a **new helper layer** wrapping Graph, a **new token/auth surface**, or a **new error-to-status mapping** is NOT an allowed delta: it must be an EXACT mirror against a deployed handler that already contains it, or a Walter authorization quoted verbatim and predating the VEP (Conformance §6 item 12 / §10 T12). Anything else is a **DEVIATION** and must be justified or removed. (Note: the shared Family-B helper block — `send`/`errorBody`/`successBody`/`getPrincipal`/`getClaimValue`/`parseBody`/`parseJsonSafe`/`requestUrl`/`getOboInputToken`/`exchangeGraphToken`/`graphGetJson` — is EXACT across handlers.)

## §5 Structural Mirror Table, Curl Standard, Parity

- **§5.1 Structural Mirror Table.** The implementation package emits a table mapping every handler region to the Primary Reference region with its EXACT / ALLOWED DELTA / DEVIATION classification, each backed by a Rule Anchor.
- **§5.2 No SQL / Golden-SQL (stateless).** Vault DMS executes no SQL and ships no migration. The data-owning regimes' Golden-SQL Standard is intentionally not carried. If a future feature ever requires state, introducing it requires a Walter-authorized amendment to the architecture doc §5 and this section.
- **§5.3 Golden Curl Standard.** Every in-scope endpoint gets a deterministic golden curl: fixed method + path + headers + body, no unbound placeholders, an asserted response shape, run by **Claude Code** against the deployed `vaultgpt-func-dms` app using an authenticated `az` bearer (`az account get-access-token`, audience `api://4e1a1e31-5c20-4480-99e4-098901707d9e`, as `wmansfield@vault-tax.com`). Curl determinism is enforced at Conformance §4A P7 / I4. Never print the token.
- **§5.4 Parity Checklist.** The package emits a parity checklist confirming each structural requirement of this standard is met (incl. statelessness — no `pg`, no DB).
- **§5.5 Deploy Target & Kudu Procedure (operational — mirrors the Vault Theo Golden Handler §5.5 / corporate-reporting Golden Handler Pack §13).**
  - **Deploy split.** `vaultgpt-func-dms` (Windows, Functions v4, classic per-fn `/site/wwwroot/<fn>/{index.js,function.json}`, EP1 plan `ASP-VaultTax-931c`) — **Claude Code deploys** via Kudu VFS after a Codex-APPROVED VEP, under the scoped deployment exception (Execution Orchestration Standard §1E / DR-D1). The monolith `vaultgpt-func-premium` remains READ-ONLY and is NEVER written by Claude Code.
  - **Curl verification is ALWAYS Claude Code's job.** Claude Code both deploys and runs the golden curls for `vaultgpt-func-dms`. Walter never runs curls.
  - **SCM hostnames are region-stamped — resolve every time:** `az functionapp show -n vaultgpt-func-dms -g Vault-Tax --query enabledHostNames`. A wrong host fails with "could not resolve host" (a hostname error, not egress).
  - **Kudu VFS surgical overwrite** (RG `Vault-Tax`): `TOKEN=$(az account get-access-token --resource https://management.core.windows.net/ --query accessToken -o tsv)`; GET the current file first (rollback baseline); `PUT` with `If-Match: *` + `Content-Type: application/octet-stream` `--data-binary @file` (expect 204); GET-back + diff; `az functionapp restart -n vaultgpt-func-dms -g Vault-Tax`; unauth-curl health (expect 401/redirect via EasyAuth; a 500 = load/syntax error). Never print the token.
  - **The deployed handler is the source of truth.** Kudu-GET the live file as the base for any fix; repo `Codex Governance/` artifacts can drift behind what is deployed.

## §6 Handler Family Registry (Vault DMS starter)

Stable-id registry of Vault DMS handler families, populated as families are authored.

| HF-id | Family | Scope | Status |
|-------|--------|-------|--------|
| HF-D1 | Delegated-Graph DMS mirror | Stateless OBO → Microsoft Graph read/mirror of SharePoint: site search, tree browse (files+folders), item resolve, file read, connection probe. Family-B helper block; no database. | PROPOSED (architecture §4; authored in build) |

Append rule: new families are added with a monotonically increasing `HF-Dn` id by a Walter-approved Role-C landing as each is authored against the Vault DMS API Spec.
