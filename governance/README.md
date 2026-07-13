# Vault DMS — Governance (README / Index)

This folder holds Vault DMS's governance standards, adapted from the Vault Theo governance regime (which was itself adapted from Corporate Reporting) per `VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md` §0c. **Status: v0.1 — in-progress port.**

## Regime (architecture §0c)

- **Claude Code** authors work, confined to the `vault-dms` `development` branch; promotion to `main` is Walter's.
- **Codex** reviews Claude Code's work (Pass 2) and executes Role-C verbatim edits (Pass 4). Sole reviewer/editor; there is no "Bolt."
- **ChatGPT** is Walter-advisory only — out of the formal pipeline; never a gate.
- **Walter** holds authority; no deviation without explicit Walter approval.

## What makes Vault DMS different from the other Vault backends

Vault DMS is a **stateless SharePoint mirror gateway** — it holds no database and persists nothing (architecture §0a; DR-D2). SharePoint/Graph is the system of record. So the data-owning regimes' schema/RLS/migration/Golden-SQL machinery is intentionally **not** carried; the Azure-Postgres doc is a **no-database declaration**, and the Golden Handler Standard omits SQL.

## Two layers (why some things are copied and some are new)

1. **Process / "shape" standards** — product-agnostic; **adapted (forked + retargeted)** from the Vault Theo regime. Retargeting: `theo_`/`reporting_` → `dms_*`; repo/doc paths → Vault DMS; data-layer machinery → stateless/no-DB; deploy target → `vaultgpt-func-dms`.
2. **Authoritative spec docs** — new, lean, in `../spec/`: the Vault DMS API Spec (the `dms_*` contract surface) and the no-database Azure-Postgres declaration.

## Standard set

| Standard | Status |
|----------|--------|
| `VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md` (foundation) | **v0.1 landed** |
| `VAULT_DMS_GOLDEN_HANDLER_STANDARD.md` | **v0.1 landed** |
| `CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md` (Claude Code obligations) | **v0.1 landed (lean)** |
| `CODEX_VAULT_DMS_REVIEW_STANDARD.md` (reviewer) | **v0.1 landed (lean)** |
| `VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md` (roles + Decision Register + DR-D1 deploy exception) | **v0.1 landed** |
| `VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md` (grounding machinery — GCR / Rule Anchor / sub-phases / triggers / passes / lint) | **pending (next)** |
| `../tools/lint_microstep_submission.mjs` (mechanical lint) | **pending (next)** — parses this folder's conformance §4A |
| `../spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md` (no-database declaration) | **v0.1 landed** |
| `../spec/VAULT_DMS_API_SPEC.md` (contract truth — the `dms_*` surface) | **pending (next)** |

## Mechanical lint usage (once landed)

```
node tools/lint_microstep_submission.mjs <submission.md> --repo-root .
```
Exit `0` = PASS, `1` = FAIL, `2` = usage. Parses `governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md` §4A at runtime and resolves doc aliases to the Vault DMS file paths in its `DOC_ALIASES` map.

## Build sequence

1. ✅ Architecture & Structure foundation.
2. ✅ Golden Handler, Governor, Codex Review, Execution Orchestration (lean process standards).
3. ✅ No-database Azure-Postgres declaration.
4. ⏳ Grounding Conformance Standard + mechanical lint (retargeted from Vault Theo).
5. ⏳ Vault DMS API Spec — the `dms_*` contract surface (after reading the two remaining monolith reference handlers: `reporting_download_dms_item`, `reporting_probe_dms_connection`).
6. ⏳ `dms_*` handler ports + Pass-1 VEP → Codex → deploy to `vaultgpt-func-dms` → golden curls → wire Origin bridge.
