# VAULT DMS EXECUTION ORCHESTRATION STANDARD

Scope: Vault DMS backend pipeline. The role-vocabulary, executor-model, and Decision-Register truth owner for the Vault DMS execution pipeline.
Filename / location: `governance/VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md`.

> **Status: v0.1 DRAFT.** Establishes the orchestration layer the Conformance Standard references (§4A P1 "role vocabulary" + "Decision Register"). Adapted from the Vault Theo Execution Orchestration Standard and retargeted to Vault DMS. The four-pass model is owned by `governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md` §4C (this standard points at it, does not restate it).

---

## §1 Authority and Relationship

This standard owns the role vocabulary (§1A), the executor model (§1C), and the Decision Register (§1B). The four-pass model is owned by the Conformance Standard §4C. Substantive truth (contracts, handler structure, architecture/boundary) lives in the spec docs, the Golden Handler Standard, and the architecture doc. On conflict over a matter another document owns, that document governs; detection is a halt + Role-C trigger.

## §1A Role Vocabulary (BINDING)

- **Claude Code** — author. Produces VEPs (Pass 1), implementation packages (Pass 3 execution), and Role-C verbatim-edit handoffs (Pass 4 authoring). Confined to the `vault-dms` `development` branch. Plans and hands off; **never merges** (promotion to `main` is Walter's). **Scoped deployment exception (§1E, DR-D1):** MAY execute Pass-3 deployment of handler/function code to the dedicated `vaultgpt-func-dms` Function App after a Codex-APPROVED VEP; the monolith `vaultgpt-func-premium` remains READ-ONLY / never written by Claude Code. Vault DMS ships no database writes/migrations (stateless).
- **Codex** — reviewer (Pass 2) and Role-C inline executor (Pass 4). Approves or rejects (only those two verdicts); executes verbatim Role-C edits. Does not author plans or substantive governance content. The sole reviewer/editor; there is no "Bolt."
- **ChatGPT** — Walter-advisory second opinion only. **Out of the formal pipeline.** No ChatGPT artifact is a pipeline gate, grounding, or approval input. Neither Claude Code nor Codex acts on a ChatGPT note directly — they act on Walter's direction.
- **Walter** — authority. Sole deployment authority except the §1E scoped `vaultgpt-func-dms` deployment exception; sole merge/promotion authority; sole runtime-acceptance authority; and sole authority who may grant governance exemptions (explicit, scoped, dated, recorded).

## §1B Vault DMS Decision Register (Append-Only) — starter

Append-only register of committed Vault DMS architecture/product decisions. Referenced by Conformance §4A P1. New entries require Walter approval + a Role-C landing.

| DR-id | Decision | Truth owner |
|-------|----------|-------------|
| DR-D1 | **Scoped deployment exception**: Claude Code MAY deploy handler/function code (+ `function.json`) to the dedicated Vault DMS Function App **`vaultgpt-func-dms`** only, after a Codex-APPROVED VEP; the monolith `vaultgpt-func-premium` remains READ-ONLY; merges/promotion remain Walter-only; Vault DMS runs no database writes/migrations (stateless). Walter-granted 2026-07-13 (the same authority pattern as the Vault Theo DR-T7 `vaultgpt-func-chat` exception). | this standard §1E |
| DR-D2 | **Stateless mirror**: Vault DMS holds no state — no database, no copy of DMS content, no registry. SharePoint/Graph is the system of record; every response is produced live via delegated-OBO Graph as the signed-in user; DMS-derived persistence lives in the consuming app. Walter-directed 2026-07-13. | architecture §0a / §3 / §5 |
| DR-D3 | **Consumed through Origin**: all Vault apps reach Vault DMS through Vault Origin's App Host DMS bridge; the mirror surfaces **files and folders** exactly as SharePoint presents them; no app re-implements Graph. Walter-directed 2026-07-13. | architecture §3 / §6 |

## §1C Executor Model

| Operation | Executor |
|-----------|----------|
| Plan / VEP / implementation package authoring | Claude Code |
| Plan review (approve/reject) | Codex |
| Role-C documentation edits | Codex (inline), directed by Claude Code's verbatim handoff |
| Database writes / migrations | **N/A — Vault DMS is stateless (no database)** |
| Deployment — handler/function code to `vaultgpt-func-dms` | **Claude Code** (§1E / DR-D1 scoped exception; only after a Codex-APPROVED VEP) |
| Golden-curl verification (all deploys) | **Claude Code** (authenticated `az` bearer; Walter never runs curls) |
| Azure infrastructure provisioning (Function App, identity, RBAC, EasyAuth) | **Claude Code** with Walter's `az` auth, mirroring an existing app; or **Walter** |
| Branch merge / promotion to `main` | **Walter** |
| Runtime acceptance | **Walter** |

## §1D Pipeline Orchestration

Microsteps flow Pass 1 (Claude Code VEP) → Pass 2 (Codex review) → Pass 3 (Claude Code deployment to `vaultgpt-func-dms` + golden-curl verification) → Pass 4 (Role-C documentation), per Conformance §4C. Passes are ordered, non-skippable, non-substitutable. No pass proceeds without the prior pass's recorded output (a Codex-APPROVED VEP before deployment; a golden-curl verification before documentation).

## §1E Scoped Deployment Authority Exception (Walter-granted, dated 2026-07-13)

Walter, as the sole authority who may grant governance exemptions (§1A), grants Claude Code a narrow, standing deployment exception (Decision Register DR-D1):

- **In scope:** Claude Code MAY execute Pass-3 deployment of **handler/function code + `function.json`** to the dedicated Vault DMS Function App **`vaultgpt-func-dms`** (Windows, Functions v4, EP1 plan `ASP-VaultTax-931c`), via Kudu VFS.
- **Precondition:** a Codex-APPROVED VEP for the microstep. No deployment before Pass-2 APPROVAL.
- **Absolute exclusions:** the monolith **`vaultgpt-func-premium`** is READ-ONLY — Claude Code MUST NEVER write, deploy to, or otherwise mutate it. **Branch merges/promotion remain Walter-only.** Vault DMS runs no database writes/migrations.
- **Post-deploy:** Claude Code runs the deterministic golden-curl verification and reports results; documentation Role-C (Pass 4) follows per the normal pipeline.
- **Provisioning note:** the initial `vaultgpt-func-dms` Function App, its SystemAssigned identity, its Key Vault Secrets User role on `kv-vaultgpt-uks`, its OBO/EasyAuth settings, and its dedicated storage were provisioned by Claude Code with Walter's `az` auth on 2026-07-13, mirroring `vaultgpt-func-chat`.
