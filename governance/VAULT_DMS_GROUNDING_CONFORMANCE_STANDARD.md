# VAULT DMS GROUNDING CONFORMANCE STANDARD

Scope: Vault DMS only. No other project or chain is in scope.
Adoption: Immediate on issuance.
Filename / location: `governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md` in the `vault-dms` repository.

> **Status: v0.1 DRAFT.** Adapted in the established Vault governance shape (the Vault Theo Grounding Conformance Standard, itself adapted from Corporate Reporting) and retargeted to Vault DMS per `governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md` §0c. Product-agnostic machinery (§1–§3, §5, §6, §8, §9, §10, §11, §12) is preserved; the cores (§4 turn-type matrix, §4A sub-phase matrix, §4C pass model) are reshaped to a **stateless** DMS mirror gateway (no database, no migration; Claude Code deploys to the dedicated `vaultgpt-func-dms` app). The **reviewer is Codex**; there is no "Bolt." Companion standards referenced by §4/§4A are the sibling Vault DMS standards in `governance/` and `spec/`.

---

## §1 Purpose and Authority

This Standard converts grounding from a behavioral instruction ("read the documents") into a structural, falsifiable artifact ("prove you read the documents this turn and prove which clauses you applied"). It exists because the single root cause of enterprise-grade build failure is the same everywhere: agents conflate *having-read-a-document-earlier* with *having-read-it-this-turn*, and governance has no enforcement artifact that distinguishes the two.

This Standard binds Claude Code and Codex as formal roles in the Vault DMS backend execution pipeline. ChatGPT is out of the formal pipeline and produces only Walter-advisory review; no ChatGPT artifact is acceptable as input to any pipeline gate, and Codex MUST NOT depend on ChatGPT review as a condition of approval or rejection.

A substantive turn is any turn producing a plan, Verified Evidence Pack, Implementation Package, approval, rejection, amendment, deployment handoff, or documentation-update package. Every substantive turn from Claude Code or Codex MUST open with a Grounding Conformance Receipt (GCR) and a Rule Anchor Table per §3–§5. Purely administrative turns (as narrowly defined by §2) are exempt and MUST declare themselves as such.

Failure to comply renders the turn automatically invalid per §6. Invalidity is not discretionary, not appealable by reformatting, and not correctable mid-thread by supplementary turns. The invalid turn MUST be reissued in full.

---

## §2 Definitions

**Turn-Type Matrix.** The published table in §4 mapping each pipeline role + turn-type combination to the set of authoritative documents that MUST be re-read on that turn.

**GCR (Grounding Conformance Receipt).** A fixed-format table opening every substantive Claude Code or Codex turn, listing each required document, the absolute file path, the tool-call invocation that read it *in this turn*, and a currency anchor proving the read reflects current HEAD.

**Rule Anchor.** A four-field record linking one specific clause of one authoritative document to the exact location in the agent's output where that clause was applied. A Rule Anchor Table is the collection of Rule Anchors for a turn.

**Currency Anchor.** A falsifiable proof that the content the agent read is the content at current HEAD. Default form: a first-20-words-plus-last-20-words snippet of the cited region captured via the same Read tool invocation listed in the GCR. Fallback form: the git blob SHA obtained via a tool call this turn — permitted only where first-20/last-20 is impractical.

**Canonical Primary Reference.** Exactly one named deployed handler file and exactly one named deployed function.json file for each implementation package, selected per the Vault DMS Golden Handler Standard. Composite selections are prohibited. For Vault DMS the primary reference is the corresponding deployed monolith `reporting_*` DMS handler.

**Substantive Turn.** Any turn that changes, or requests change to, a plan, a VEP, an implementation package, an approval/rejection state, a deployment, or a documentation amendment. All other turns are administrative. The administrative exemption is narrow.

**Full Baseline Grounding.** A grounding mode requiring broad document-level review of all authority documents required for a new feature/microstep plan, phase-boundary transition, first governed turn after a governance-document change, unresolved drift event, or any turn whose type cannot be safely classified.

**Targeted Current-Turn Grounding.** A grounding mode requiring current-turn Read invocations for the exact documents and sections governing the specific turn. No memory reliance, no prior-turn citation in place of current reads, no unanchored rule application.

**Delta Grounding.** A grounding mode permitted only when a prior plan or package has been rejected or modified on specific narrow grounds, and the current turn revises only those affected sections under an express delta rule.

---

## §3 Grounding Conformance Receipt Format

Every substantive Claude Code or Codex turn MUST open with a table of the form:

```
GROUNDING CONFORMANCE RECEIPT
Role: <Claude Code | Codex>
Turn Type: <from §4 matrix>
Turn issued against HEAD: <git rev-parse HEAD captured this turn>
Grounding Mode: <Full Baseline Grounding | Targeted Current-Turn Grounding | Delta Grounding>
Pass: <Pass 1 | Pass 3 | Pass 4>
Sub-phase Track: <P1-P8 | I1-I6 | E1-E3 | N/A>

| # | Document (name + absolute path) | Read tool invocation this turn | Currency anchor |
| - | ------------------------------- | ------------------------------ | --------------- |
| 1 | ...                             | Read(file_path=..., offset=..., limit=...) | first-20: "..." ... last-20: "..." |
```

Rules:

1. Each row MUST correspond to a document required for the declared turn-type per §4. No row may be omitted on the grounds of "already in context" or "previously read."
2. The Read tool invocation MUST be a real tool call executed during this turn.
3. The Currency Anchor MUST be independently verifiable. Default first-20/last-20 per §8; blob SHA only as fallback.
4. No row may cite a prior-turn read. Phrases like "captured in prior turn," "previously inlined," "as established above" are prohibited inside the GCR.
5. If the turn is administrative, the GCR is replaced by a single line: `GCR: administrative turn — no substantive output; §4 re-read not required.` Abusing this exemption is itself an invalidity trigger.
6. Full-document reads are not required unless the applicable role standard or turn type expressly requires Full Baseline Grounding.
7. For Targeted Current-Turn Grounding, each GCR row MUST identify the specific section/range read this turn, and the Rule Anchor Table MUST tie every relied-on rule to a current-turn read.
8. For Delta Grounding, the GCR MUST identify the rejected/modified prior artifact, the affected sections, and the rule authorizing delta treatment.

---

## §4 Turn-Type Matrix (Authoritative, Vault DMS Backend Pipeline Only)

| Role | Turn-type | Grounding mode | Documents required in GCR |
|------|-----------|----------------|---------------------------|
| Claude Code | Verified Evidence Pack (backend plan) | Full Baseline Grounding | Claude Code Vault DMS Governor Standard; Vault DMS API Spec; Vault DMS Azure Postgres Schema; Vault DMS Golden Handler Standard; Vault DMS Execution Orchestration Standard; Vault DMS Grounding Conformance Standard; Codex Vault DMS Review Standard; Vault DMS Architecture and Structure; every primary reference artifact cited in the pack |
| Claude Code | Materially revised backend plan | Full Baseline Grounding unless expressly limited by Codex rejection scope | Same as Verified Evidence Pack (backend plan), plus the rejected or prior plan being revised |
| Claude Code | Codex-rejection correction / delta-evidence pack | Delta Grounding | Claude Code Vault DMS Governor Standard sections governing rejection/delta treatment; Codex Vault DMS Review Standard sections governing the rejection; Vault DMS Grounding Conformance Standard; the rejected pack; the inbound Codex rejection; documents and sections affected by the correction |
| Claude Code | Implementation Package | Full Baseline Grounding | Claude Code Vault DMS Governor Standard; Vault DMS API Spec; Vault DMS Golden Handler Standard; Vault DMS Execution Orchestration Standard; Vault DMS Grounding Conformance Standard; Codex Vault DMS Review Standard; the approved VEP this package implements; every primary reference artifact cited in the pack |
| Claude Code | Deployment handoff (`vaultgpt-func-dms`) | Targeted Current-Turn Grounding | Claude Code Vault DMS Governor Standard sections governing the scoped deployment exception and golden-curl verification; Vault DMS Golden Handler Standard deploy/curl sections; Vault DMS Execution Orchestration Standard role/executor sections and §1E; Vault DMS Grounding Conformance Standard; the Codex-approved VEP/IP being deployed |
| Claude Code | Deployment verification report (golden curls) | Targeted Current-Turn Grounding | Claude Code Vault DMS Governor Standard golden-curl sections; Vault DMS Golden Handler Standard curl sections; Vault DMS Grounding Conformance Standard; the approved package's curl set |
| Claude Code | Documentation-update package | Targeted Current-Turn Grounding | Claude Code Vault DMS Governor Standard documentation-update sections; Vault DMS API Spec if edited; Vault DMS Architecture and Structure if edited; Vault DMS Execution Orchestration Standard if edited; Vault DMS Grounding Conformance Standard; target documents being edited |
| Claude Code | Response to Codex note | Targeted Current-Turn Grounding unless the response is a new/revised plan or implementation package | Claude Code Vault DMS Governor Standard sections necessary for the response; the Codex note cited by message anchor; Vault DMS Grounding Conformance Standard; any affected authority sections |
| Codex | Plan approval review | Targeted Current-Turn Grounding against review authorities and pack under review | Codex Vault DMS Review Standard; Claude Code Vault DMS Governor Standard; Vault DMS Golden Handler Standard; Vault DMS API Spec; Vault DMS Execution Orchestration Standard; Vault DMS Grounding Conformance Standard; the pack under review |
| Codex | Role-C documentation-update execution | Targeted Current-Turn Grounding | Codex Vault DMS Review Standard documentation-update sections; Vault DMS Execution Orchestration Standard; Vault DMS Grounding Conformance Standard; target documents being edited; the inbound Claude Code / Walter note authorizing edits |
| Codex | Rejection | Targeted Current-Turn Grounding | Codex Vault DMS Review Standard; Vault DMS Grounding Conformance Standard; the invalid pack with the specific trigger cited |

ChatGPT advisory turns are not listed: they are outside this matrix by design.

Any turn-type not listed MUST be declared administrative per §2 or MUST halt pending Walter authorization. A turn that instructs deployment, validates runtime behavior, accepts/rejects an artifact, updates documentation, or advances sequencing is never administrative. (Vault DMS is stateless: there are no migration-execution / Walter-SQL / post-migration-verification turn-types — those Reporting/Theo rows are intentionally absent.)

---

## §4A Microstep-Phase-to-Required-Read Matrix (Authoritative)

§4 classifies turns at the turn-type level. Within a single substantive turn Claude Code executes several operational sub-phases in sequence. This §4A enumerates those sub-phases and names the authority sections that MUST be read in each. §4A is binding on Claude Code; Codex MAY use it to verify a submission shows evidence of each required sub-phase read.

### §4A.1 Plan-authoring sub-phases (applies to Verified Evidence Pack turns)

| # | Sub-phase | Purpose | Authority sections required as Targeted Current-Turn reads within the Full Baseline set |
|---|-----------|---------|----------------------------------------------------------------------------------------|
| P1 | Feature identification | Locate the microstep in the governed authority. | Vault DMS Architecture and Structure §4 (handler set) and §8 (deliverable sequence); Vault DMS Execution Orchestration Standard role vocabulary and Decision Register. |
| P2 | Architecture & boundary reconciliation | Confirm no conflict with the Vault DMS architecture authorities and binding boundaries. | Vault DMS Architecture and Structure §0a (stateless / no new DMS), §1 (repository boundary), §2 (gateway seam), §3 (mirror principle), §5 (no schema), §6 (consumed through Origin); Claude Code Vault DMS Governor Standard Never-Guess sections. Condition: applicable to every VEP turn. |
| P2.5 | Gap disclosure (proactive) | Disclose foreseeable downstream gaps and record the pivot (`PROCEED` / `PRE-LAND` / `ESCALATE`) or the verbatim `NO-GAPS` certification. | Claude Code Vault DMS Governor Standard Gap Register section; Vault DMS Execution Orchestration Standard Decision Register; any API Spec / architecture / external-system-contract section whose current-turn read surfaced a gap. Condition: applicable to every VEP turn. |
| P3 | Reality lock (no schema) | Establish DEPLOYED vs PROPOSED **route/contract** truth; confirm the stateless / no-database invariant. | Vault DMS API Spec entries for the affected operations; Vault DMS Azure Postgres Schema (the no-database declaration); Claude Code Vault DMS Governor Standard Reality Lock and Never-Guess sections. |
| P4 | Contract grounding | Confirm existing endpoint contracts and propose-only deltas; confirm the delegated-OBO/Graph profile against the named deployed primary reference. | Vault DMS API Spec endpoint entry for each affected operation; Claude Code Vault DMS Governor Standard Pre-Contract Evidence section; route-naming convention `dms_<operation>[_<entity>]`. |
| P5 | Handler grounding | Select the single canonical Primary Reference handler and function.json per the Vault DMS Golden Handler Standard. | Vault DMS Golden Handler Standard canonical-primary-reference selection; Allowed Deltas; Structural Mirror Table; the named deployed handler file (full verbatim inline required per §6 T9); the named deployed function.json file (full verbatim inline required). |
| P6 | State grounding | Confirm the microstep introduces no persisted state (Vault DMS is stateless). | N/A — Vault DMS is stateless; there is no SQL/migration sub-phase. Declare explicit `N/A — stateless (no database)`; introducing state requires a Walter-authorized architecture amendment (architecture §5). |
| P7 | Curl grounding | Produce deterministic golden curls for every endpoint in scope. | Vault DMS Golden Handler Standard curl sections; Claude Code Vault DMS Governor Standard Golden Curl Standards and Curl Determinism sections. |
| P8 | VEP assembly | Assemble all evidence into the Verified Evidence Pack format. | Claude Code Vault DMS Governor Standard VEP Format section; Vault DMS Grounding Conformance Standard §3 and §5 (GCR + Rule Anchor Table open the pack). |

### §4A.2 Implementation-Package sub-phases (applies to post-approval Implementation Package turns)

| # | Sub-phase | Purpose | Authority sections required as Targeted Current-Turn reads within the Full Baseline set |
|---|-----------|---------|----------------------------------------------------------------------------------------|
| I1 | Approval-state confirmation | Confirm the inbound VEP has a Codex APPROVED state for this microstep. | Codex Vault DMS Review Standard approval-process section; the approved VEP for this microstep; Claude Code Vault DMS Governor Standard Implementation Package Approval Contract. |
| I2 | Structural mirror | Emit the Structural Mirror Table per the Vault DMS Golden Handler Standard. | Vault DMS Golden Handler Standard Structural Mirror section; Claude Code Vault DMS Governor Standard Golden Handler enforcement section; the canonical Primary Reference handler and function.json files. |
| I3 | Deployment target confirmation | Confirm the deployment target is `vaultgpt-func-dms` under the scoped exception. | Vault DMS Execution Orchestration Standard §1E / DR-D1; Claude Code Vault DMS Governor Standard deployment section. |
| I4 | Golden curls (deterministic) | Emit the full deterministic curl set for the implemented endpoints. | Claude Code Vault DMS Governor Standard Golden Curl and Curl Determinism sections; Vault DMS Golden Handler Standard curl sections. |
| I5 | Parity checklist | Emit the parity checklist per the Vault DMS Golden Handler Standard parity section. | Vault DMS Golden Handler Standard parity-checklist section. |
| I6 | Approval contract emission | Assemble the Implementation Package per the Governor Approval Contract and emit. | Claude Code Vault DMS Governor Standard Implementation Package Approval Contract; this Standard §3 and §5. |

### §4A.3 Post-approval Claude Code sub-phases (deployment handoff + verification)

| # | Sub-phase | Purpose | Authority sections required as Targeted Current-Turn reads |
|---|-----------|---------|-----------------------------------------------------------|
| E1 | Deployment handoff | Deploy the approved handler/function code to `vaultgpt-func-dms` via Kudu. | Claude Code Vault DMS Governor Standard deployment section; Vault DMS Golden Handler Standard deploy-target section; Vault DMS Execution Orchestration Standard §1E. |
| E2 | Golden-curl verification | Run the deterministic golden curls against the deployed app and report results. | Claude Code Vault DMS Governor Standard golden-curl section; Vault DMS Golden Handler Standard curl sections; the approved package's curl set. |
| E3 | Pending Role-C handoff | If documentation drift against deployed reality is detected, emit the Deterministic Note to Codex per the Verbatim-Edit Handoff requirement. | Claude Code Vault DMS Governor Standard Verbatim-Edit Handoff and Pending Role-C sections; target documents that require Role-C edits. |

### §4A.4 Rule

For any substantive Claude Code turn, the GCR per §3 MUST reflect at minimum the authority sections listed in the sub-phase rows that apply to the turn. §4A does not add new documents beyond those required by §4; it localizes the reads within those documents to the sub-phase executed. Reliance on memory or prior-turn reading of a required section is automatically invalid per §6 T3, T15, and §10 T25.

---

## §4C Multi-Pass Discipline (Authoritative Pass Enumeration)

The Vault DMS backend pipeline executes every microstep through a sequence of distinct review passes. Passes are ordered, non-skippable, non-substitutable.

| Pass | Name | Actor | Primary artifacts reviewed | Governing section |
|------|------|-------|----------------------------|-------------------|
| Pass 1 | **Claude Code internal VEP pass** | Claude Code | Verified Evidence Pack — GCR per §3, Rule Anchor Table per §5, sub-phase walk per §4A.1 P1–P8, Gap Register, plan body | Claude Code Vault DMS Governor Standard; this Standard §3, §4A.1, §5 |
| Pass 2 | **Codex plan review pass** | Codex | The submitted VEP against the Codex Vault DMS Review Standard rubric | `CODEX_VAULT_DMS_REVIEW_STANDARD.md`; this Standard §6, §10 |
| Pass 3 | **Claude Code deployment + verification pass** | Claude Code (deployment authority under the §1E scoped exception) | Kudu deployment of the approved handler/function code to `vaultgpt-func-dms`; deterministic golden-curl verification report | Claude Code Vault DMS Governor Standard (deployment, golden-curl); Vault DMS Execution Orchestration Standard §1E; this Standard §4A.3 (E1–E3) |
| Pass 4 | **Role-C documentation-update pass** | Claude Code (Role-C authoring) + Codex (Role-C execution) | Verbatim documentation edits to governed Vault DMS docs | Claude Code Vault DMS Governor Standard (Verbatim-Edit Handoff); `CODEX_VAULT_DMS_REVIEW_STANDARD.md` Role-C |

**Pass ordering (BINDING):** Pass 1 before any plan leaves Claude Code; Pass 2 by Codex against Pass 1; Pass 3 deployment ONLY against a Pass 2-approved package (no deployment before APPROVAL); Pass 4 standalone for documentation. No pass may be skipped, merged, or re-labelled. ChatGPT advisory review is never one of the four passes. (Vault DMS Pass 3 is Claude-Code deployment + verification, NOT a Walter migration — there is no database.)

**Relationship to §4A sub-phases:** §4A sub-phases (P1–P8, I1–I6, E1–E3) are the internal grammar of a pass, not passes themselves. The pass axis and the sub-phase axis are orthogonal and both govern the turn.

---

## §5 Rule Anchor Table

Every substantive Claude Code or Codex turn MUST include, after the GCR, a Rule Anchor Table:

```
RULE ANCHORS
| # | Source doc | Clause id | Verbatim clause text | Applied in output at |
| - | ---------- | --------- | -------------------- | -------------------- |
| 1 | Vault DMS Golden Handler Standard | §4 Allowed Deltas | "<verbatim substring, no paraphrase>" | §[n] mirror table rows ... |
```

Rules:

1. Every rule relied on to justify a structural choice, classification, or approval MUST appear.
2. Verbatim Clause Text MUST be a direct substring of the source doc as read this turn. No paraphrase; no ellipsis longer than four words.
3. Applied-In MUST cite an exact section/row/line in the agent's own output. "Throughout" is prohibited.
4. Over-anchoring is preferred to under-anchoring.
5. Every structural classification (EXACT, ALLOWED DELTA, DEVIATION, APPROVED, REJECTED, DEPLOYED, PROPOSED) MUST be backed by at least one Rule Anchor.

---

## §6 Automatic Invalidity Rules (Claude Code and Codex)

Any of the following renders the turn automatically invalid; the reviewer MUST reject without further review of substantive content.

1. GCR absent.
2. GCR row missing a tool-call invocation for any required document.
3. GCR row citing a prior-turn read.
4. Currency Anchor missing, malformed, or not independently verifiable.
5. Rule Anchor Table absent.
6. Structural classification made without a supporting Rule Anchor.
7. Rule Anchor quoting text not present in the cited document at current HEAD.
8. Administrative-turn exemption invoked on a turn producing substantive output per §2.
9. Primary reference artifact cited without full verbatim source inline *in this turn*.
10. Composite primary reference (two handlers contributing to one pattern).
11. "Omitted for context-window" or equivalent phrase applied to any required artifact.
12. New external-system interaction (a Microsoft Graph endpoint not called in the chosen primary reference), new Graph-wrapping helper, new auth/token surface, or new error-to-status mapping classified as ALLOWED DELTA without either an EXACT mirror against a deployed handler containing it, or a Walter authorization quoted verbatim in the pack and predating the VEP.
13. Doc-vs-runtime drift surfaced in the turn without a prior Walter decision resolving it.
14. Grounding mode absent from the GCR.
15. Targeted Current-Turn Grounding claimed but a relied-on rule is not read and anchored this turn.
16. Delta Grounding claimed outside a narrow authorized delta correction.
17. A deployment handoff or golden-curl verification report classified as administrative.
18. A turn requiring Full Baseline Grounding emitted with only Targeted Current-Turn Grounding or Delta Grounding.
19. A governed SQL block contains a prohibited psql meta-command. (Vault DMS is stateless and ships no SQL; any SQL block is itself suspect and must be justified.)
20. Boundary violation: any governed output that proposes a Vault DMS handler reading/writing a `reporting_*` or `theo_*` table, or reading SharePoint content with application-level (non-delegated) Graph permissions, rather than a stateless delegated-OBO call as the signed-in user (architecture §0a/§2/§5), is automatically invalid.

---

## §7 Relationship to Existing Standards

This Standard is additive and Vault DMS only. It does not supersede, modify, or relax any requirement in the Claude Code Vault DMS Governor Standard, Codex Vault DMS Review Standard, Vault DMS Golden Handler Standard, Vault DMS Execution Orchestration Standard, Vault DMS API Spec, the no-database Azure-Postgres declaration, or any Corporate Reporting / Vault Theo authority document. Where this Standard imposes a stricter gate, the stricter gate governs; where any existing standard imposes a stricter gate, that standard governs.

---

## §8 Currency Anchor Verification Detail

Default form:

```
first-20: "<exactly 20 whitespace-separated tokens from the start of the cited region>"
last-20:  "<exactly 20 whitespace-separated tokens from the end of the cited region>"
```

Both snippets MUST be directly recoverable by the reviewer via a Grep or Read against HEAD. Fallback form (blob SHA): permitted only when the cited region is fewer than 40 whitespace-separated tokens, or when the clause is structural. The SHA MUST be obtained by a tool call this turn.

---

## §9 Enforcement Responsibilities

- **Claude Code** enforces this Standard against its own output before emission, and against every inbound Codex message it responds to.
- **Codex** enforces this Standard against every inbound Claude Code plan or package as a hard gate, and against its own output before emission.
- **ChatGPT** is out of the formal pipeline and is not bound as a pipeline gate. No ChatGPT artifact is acceptable as input to any gate.
- **Walter** is not bound in his own messages and is the sole authority who may grant exemptions (explicit, scoped, dated, recorded).

---

## §10 Consolidated Automatic Rejection Triggers

| # | Trigger | Binding on |
|---|---------|-----------|
| T1 | GCR absent | Claude Code (self-gate), Codex (against inbound) |
| T2 | GCR row missing a tool-call invocation for any required doc | Claude Code, Codex |
| T3 | GCR row cites prior-turn read | Claude Code, Codex |
| T4 | Currency Anchor missing, malformed, or not independently verifiable | Claude Code, Codex |
| T5 | Rule Anchor Table absent | Claude Code, Codex |
| T6 | Structural classification without a Rule Anchor | Claude Code, Codex |
| T7 | Rule Anchor quotes text not at current HEAD | Claude Code, Codex |
| T8 | Administrative-turn exemption abused | Claude Code, Codex |
| T9 | Primary reference artifact cited without full verbatim inline this turn | Claude Code (self-gate), Codex (against inbound) |
| T10 | Composite primary reference | Claude Code, Codex |
| T11 | "Context-window" or equivalent omission phrase | Claude Code, Codex |
| T12 | New external-system interaction / helper / auth surface / error-mapping classified ALLOWED DELTA without Walter authorization | Claude Code, Codex |
| T13 | Doc-vs-runtime drift in pack without prior Walter decision | Claude Code, Codex |
| T16 | Conditional or pending-correction approval | Codex (self) |
| T18 | Pack cites ChatGPT review as grounding, approval input, or pipeline authority | Codex |
| T19 | Grounding mode absent from GCR | Claude Code, Codex |
| T20 | Targeted Current-Turn Grounding claimed but a relied-on rule is not read and anchored this turn | Claude Code, Codex |
| T21 | Delta Grounding claimed outside a narrow authorized delta correction | Claude Code, Codex |
| T22 | Deployment handoff / golden-curl verification report classified as administrative | Claude Code, Codex |
| T23 | Full Baseline Grounding required but only Targeted Current-Turn Grounding or Delta Grounding provided | Claude Code, Codex |
| T24 | Mechanical lint output (`tools/lint_microstep_submission.mjs`) missing, FAIL, or not independently reproducible against the committed repo root. Binding on every Claude Code VEP, Implementation Package, and Role-C Verbatim-Edit Handoff submission. Claude Code MUST run the linter and attach the verbatim PASS block (exit code `0`); Codex MUST re-run and reject on any discrepancy. | Claude Code (self-gate), Codex (independent re-run) |
| T25 | Sub-phase completeness failure: the §4A sub-phase track declared in the GCR requires authority sections absent from the Rule Anchor Table. Detected by `tools/lint_microstep_submission.mjs`. | Claude Code, Codex |
| T26 | Prohibited psql meta-command in a governed SQL block. (Vault DMS is stateless; SQL blocks are not expected.) | Claude Code (self-gate), Codex (against inbound) |
| T29 | Codex-review submission cites a controlling artifact, enumerated package file, or mechanical-lint target not present in the working tree at the cited HEAD on the active review branch, OR repo-visible but uncommitted/unpushed. Codex MUST reject without opening substantive review. | Claude Code (self-gate), Codex (independent presence probe) |
| T30 | Codex-reviewable package delivered with operative review surface only under a local-only path; OR repo-visible but lacking the controlling-artifact fields; OR omitting files Codex needs to render its verdict. Codex MUST reject without opening substantive review. | Claude Code (self-gate), Codex (against inbound) |
| T40 | Vault DMS boundary violation: direct `reporting_*`/`theo_*` table access, or application-permission Graph content read, proposed instead of a stateless delegated-OBO call as the signed-in user (architecture §0a/§2/§5). | Claude Code (self-gate), Codex (against inbound) |

Any trigger firing: REJECTED, trigger cited by number, sender reissues full new turn. No conditional approval.

---

## §11 Adoption

Adoption is immediate on issuance. No grandfathering. As a v0.1 draft, the trigger numbering preserves the Vault Theo / Corporate Reporting numbering for cross-reference continuity; the Vault-DMS-specific boundary trigger (T40) is retargeted at the bottom.

---

## §12 Operational Note — CLAUDE.local.md

`CLAUDE.local.md` (if present in the Claude Code clone) is local-only, gitignored, and outside Codex's editable governance document set. Codex MUST NOT edit or create `CLAUDE.local.md`.
