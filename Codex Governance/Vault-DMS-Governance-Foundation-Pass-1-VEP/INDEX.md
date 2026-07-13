# Vault DMS — Governance Foundation (Regime Bootstrap) — Pass-1 VEP

Controlling artifact for Codex review. Single self-contained package; the deliverables live at their final repo paths (`governance/`, `spec/`, `tools/`, repo root) and are cited below at those paths.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Verified Evidence Pack (governance-foundation regime bootstrap)
Turn issued against HEAD: f5e82421d08fa29d9336faa25ef5e27c20be84e1 (development; the commit that adds this package is the reviewable HEAD Codex probes)
Grounding Mode: Full Baseline Grounding
Pass: Pass 1
Sub-phase Track: N/A
```

**Sub-phase Track N/A rationale:** this is a *regime bootstrap*, not a feature microstep. The §4A.1 P1–P8 feature sub-phases (schema/contract/handler grounding) do not apply — there is no schema (stateless), no prior contract, and no handler in scope. The deliverable *is* the governance regime itself.

**Grounding lineage (transparency, not a false current-turn claim):** every deliverable is a faithful retarget of its Vault Theo counterpart (`vault-theo/governance/*`, `vault-theo/spec/*`, `vault-theo/tools/lint_microstep_submission.mjs`) and the deployed handler/skeleton shapes (`vault-theo/api/theo_message/*`, `vault-origin/api/{host.json,package.json}`, and the monolith `reporting_*` DMS handlers), read during this working session. Codex verifies the deliverables directly: each Rule Anchor quote below is a literal substring at the committed HEAD (T7), and the mechanical lint is independently re-runnable (T24).

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §0a | "Every response is produced live from Microsoft Graph, as the signed-in user, at request time." | Establishes the stateless-mirror invariant governing the whole regime (this INDEX §Scope) |
| governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md | §5 | "Vault DMS has **no data layer**." | No-database posture; drives the no-DB Postgres declaration (file list row: spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md) |
| spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md | §1 | "SharePoint is the system of record. Microsoft Graph is the data plane. Vault DMS holds no state." | The no-database declaration (file list row) |
| governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md | §3 | "Is **stateless**: no database connection, no `pg`, no table access, no persisted state." | Handler-structure invariant (file list row: Golden Handler) |
| governance/VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md | §1B | "Claude Code MAY deploy handler/function code (+ `function.json`) to the dedicated Vault DMS Function App **`vaultgpt-func-dms`** only" | DR-D1 deploy exception (file list row: Orchestration) |
| governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md | §4C | "Vault DMS Pass 3 is Claude-Code deployment + verification, NOT a Walter migration — there is no database." | Pass model reshaped for stateless (file list row: Conformance) |
| spec/VAULT_DMS_API_SPEC.md | §2.2 | "the child projection includes **files** (`item.file`), not folders only" | The files-AND-folders mirror requirement (file list row: API Spec) |
| governance/CODEX_VAULT_DMS_REVIEW_STANDARD.md | §3 | "Codex emits **only `APPROVED` or `REJECTED`**." | Reviewer verdict discipline (file list row: Codex Review) |

## Purpose

Land the Vault DMS governance regime and repo skeleton so subsequent `dms_*` handler VEPs have a committed, Codex-reviewed base to cite (Conformance T29 artifact-presence). Vault DMS is a **stateless mirror gateway** surfacing the tenant's SharePoint DMS inside Vault Origin via delegated Microsoft Graph (OBO); no database; all Vault apps consume it through Origin.

## Scope

- **In scope:** the governance/spec/tools/skeleton files enumerated below (the regime + its mechanical lint + the function-app skeleton). No handlers, no deployment, no runtime behavior.
- **Out of scope:** the `dms_*` handlers themselves (separate Pass-1 VEPs to follow), any deployment to `vaultgpt-func-dms`, any change to `main`.

## Governing context

- Regime: retarget of the Vault Theo governance regime per `VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md` §0c. **Codex** is the sole reviewer (Pass 2) and Role-C editor (Pass 4); there is no "Bolt."
- Walter authorizations recorded in `VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md` §1B: DR-D1 (Claude-Code deploy exception to `vaultgpt-func-dms`, 2026-07-13), DR-D2 (stateless), DR-D3 (consumed through Origin).

## Complete file list (deliverables, at final paths)

| File | Role | Source it retargets |
|------|------|---------------------|
| `governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md` | Foundation / boundary truth owner | THEO_ARCHITECTURE_AND_STRUCTURE.md |
| `governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md` | Grounding machinery (GCR/Rule-Anchor/§4A/§4C/triggers) | THEO_GROUNDING_CONFORMANCE_STANDARD.md |
| `governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md` | Handler-structure / curl truth owner | THEO_GOLDEN_HANDLER_STANDARD.md |
| `governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md` | Claude Code authoring obligations | CLAUDE_CODE_THEO_BACKEND_GOVERNOR_STANDARD.md |
| `governance/CODEX_VAULT_DMS_REVIEW_STANDARD.md` | Reviewer behavior | CODEX_THEO_BACKEND_REVIEW_STANDARD.md |
| `governance/VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md` | Roles / executor model / Decision Register (DR-D1/D2/D3) | THEO_EXECUTION_ORCHESTRATION_STANDARD.md |
| `governance/README.md` | Governance index | governance/README.md |
| `spec/VAULT_DMS_API_SPEC.md` | Contract truth — the 5 `dms_*` contracts | THEO_API_SPEC.md |
| `spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md` | No-database declaration | THEO_AZURE_POSTGRES_SCHEMA.md (inverted → no DB) |
| `tools/lint_microstep_submission.mjs` | Mechanical lint (vault-dms DOC_ALIASES) | vault-theo/tools/lint_microstep_submission.mjs |
| `host.json` · `package.json` · `.gitignore` | Function-app skeleton (Windows/v4; empty deps — stateless) | vault-origin/api/{host.json,package.json} |

## Statelessness / boundary summary (for review)

No `dms_` table, no RLS, no migration, no `pg` dependency, no SECURITY DEFINER helper anywhere. Every handler (when authored) calls Microsoft Graph on-behalf-of the signed-in user; no application-permission content reads; no `reporting_*`/`theo_*` table access. The `dms_tree` mirror surfaces **files and folders**. See Conformance §6 T40 (boundary trigger).

## Mechanical lint

Target: this INDEX.md. Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Governance-Foundation-Pass-1-VEP/INDEX.md" --repo-root .`

PASS block (verbatim):

```
$ node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-Governance-Foundation-Pass-1-VEP/INDEX.md" --repo-root .
PASS  <repo-root>/Codex Governance/Vault-DMS-Governance-Foundation-Pass-1-VEP/INDEX.md
exit code: 0
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested verdict

**APPROVED** — landing the Vault DMS governance foundation on `development` as the reviewed base for subsequent `dms_*` handler VEPs.
