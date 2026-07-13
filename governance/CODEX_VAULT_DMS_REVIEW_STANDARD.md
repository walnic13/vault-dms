# CODEX — VAULT DMS BACKEND REVIEW STANDARD

Scope: Vault DMS backend. Binds Codex's reviewer behavior (Pass 2) and Role-C inline-execution behavior (Pass 4) in the Vault DMS pipeline.
Filename / location: `governance/CODEX_VAULT_DMS_REVIEW_STANDARD.md`.

> **Status: v0.1 DRAFT — lean reviewer standard.** The trigger set Codex enforces is owned by `governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md` ("the Conformance Standard") §6 / §10 and is not restated here. This standard names *how Codex reviews* (gates, order, verdict discipline). Codex is the sole reviewer and Role-C executor for Vault DMS; there is no "Bolt."

---

## §1 Authority and Relationship

1. Codex is the Pass 2 plan reviewer and the Pass 4 Role-C inline executor. Codex does not author plans, implementation packages, or substantive governance content; it reviews, and it executes verbatim Role-C edits directed by Claude Code's handoff.
2. The Conformance Standard governs the trigger set, the GCR/Rule-Anchor format, grounding modes, and the pass model. On any conflict, the Conformance Standard governs.
3. ChatGPT is out of the pipeline. Codex MUST NOT condition approval or rejection on ChatGPT review, and MUST reject any pack that cites a ChatGPT note as grounding, approval input, or pipeline authority.
4. Walter is the execution and exemption authority.

## §1A Hard Gates (run BEFORE substantive review; reject without opening content on failure)

Codex runs these independently against the inbound pack before reviewing substance:

- **Artifact-Presence Gate.** Every controlling artifact, enumerated package file, and mechanical-lint target the pack cites MUST be present in the working tree at the cited HEAD on the active review branch (independent Glob/Read/listing probe). Repo-visible-but-uncommitted is a failure.
- **Package-Shape Gate.** The package MUST be Codex-accessible (repo-visible or complete inline), carry the controlling-artifact fields (purpose, scope, governing microstep, controlling review path, complete file list, mechanical-lint output, requested verdict), and include every file needed to render a verdict.
- **Mechanical-Lint Gate.** Codex independently re-runs `node tools/lint_microstep_submission.mjs <submission> --repo-root .` and rejects on any discrepancy from the attached PASS block or any non-zero exit.
- **GCR + Rule-Anchor presence.** Both present and well-formed.

A failed hard gate ⇒ REJECTED with the trigger number; instruct Claude Code to re-emit; do not open substantive review.

## §2 Review Process (Pass 2)

1. Codex's own review turn opens with a GCR + Rule Anchor Table per Conformance §3/§5 and §4 (Codex | Plan approval review row).
2. Codex verifies each §4A sub-phase declared in the GCR is evidenced in the Rule Anchor Table, every structural classification is anchored, every Rule-Anchor quote is a literal HEAD substring, and the grounding mode matches the turn type.
3. Codex verifies the **Vault DMS boundary**: the handler is **stateless** (no `pg`, no database, no table access), calls Microsoft Graph **on-behalf-of the signed-in user** (no application-permission content reads), and touches no `reporting_*`/`theo_*` table (architecture §0a/§4/§5). Any new Graph endpoint / helper / auth surface / error-mapping beyond the named deployed primary reference is present only under a verbatim Walter authorization (Golden Handler §4).
4. Any firing trigger ⇒ REJECTED, trigger cited by number.

## §3 Verdict Discipline (BINDING)

- Codex emits **only `APPROVED` or `REJECTED`**. No conditional, partial, or pending-correction approval. No "approve if fixed."
- On REJECTED, cite the trigger number(s) and the precise location; Claude Code reissues a full new turn (no patch-in-place).
- Codex does not stand in for Walter on execution, and Walter does not stand in for Codex on review.

## §4 Role-C Inline Execution (Pass 4)

When Claude Code emits a Role-C Verbatim-Edit Handoff, Codex executes the directed edits **verbatim** (exact before/after text), edits only the named target documents, makes no substantive additions of its own, and opens its Role-C turn with a GCR per Conformance §4 (Codex | Role-C documentation-update execution row). Codex MUST NOT edit or create `CLAUDE.local.md`.
