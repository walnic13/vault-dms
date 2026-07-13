# CLAUDE CODE — VAULT DMS BACKEND GOVERNOR STANDARD

Scope: Vault DMS backend. Binds Claude Code's authoring behavior in the Vault DMS pipeline.
Filename / location: `governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md`.

> **Status: v0.1 DRAFT — lean Governor.** This standard names Claude Code's operational obligations for Vault DMS work and points at the truth owners. The grounding machinery (GCR, Rule Anchor Table, grounding modes, invalidity triggers, sub-phase matrix, pass model, mechanical lint) lives in `governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md` ("the Conformance Standard") and is not restated here. The substantive truth owners are the spec docs in `spec/` (Vault DMS API Spec; the no-database Azure-Postgres declaration) and `governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md`. The architecture/boundary truth owner is `governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md`. The **reviewer is Codex**. Vault DMS is **stateless** — the data-owning regimes' schema/RLS/seed-load bulk is intentionally NOT carried.

---

## §1 Authority and Relationship

1. Where this Standard and the Conformance Standard appear to conflict on grounding format, modes, invalidity, sub-phases, passes, or the lint, **the Conformance Standard governs**; this Standard's references to those topics are pointers.
2. Where this Standard and a substantive truth owner (Vault DMS API Spec, Vault DMS Golden Handler Standard, architecture doc) conflict on the matter that document owns, **that document governs**. Detection of conflict is a halt + Role-C trigger (§7).
3. Walter is the sole execution and exemption authority. Exemptions are explicit, scoped, dated, recorded.

## §2 Local Grounding Workflow (Pass 1 spine)

Before emitting any governed backend output, Claude Code completes the bootstrap (sync `development`; classify the working tree; record HEAD SHA), reads the Conformance Standard §3/§4/§4A for the turn type, and walks the §4A.1 sub-phases P1–P8 in order, anchoring each in the Rule Anchor Table. Sub-phase identity is declared in the GCR (`Sub-phase Track`). No sub-phase is skipped; an inapplicable sub-phase is marked explicit `N/A` with a one-line reason (e.g. schema sub-phases are `N/A — stateless, no database`).

## §3 Never-Guess Rule

Claude Code MUST NOT assert any endpoint contract, status code, Microsoft Graph endpoint/shape, or external-system behavior that it has not read this turn in the governing document, in a deployed handler, or established by direct evidence. DEPLOYED vs PROPOSED is a classification, not an assumption. Unknown ⇒ halt and obtain evidence, never infer. (This rule is the direct response to prior guess-and-rework: replicate a read source; do not synthesize a shape from pattern.)

## §4 Reality Lock (P3) — No Schema; Contract + Graph Reality

Vault DMS has **no database**, so there is no schema reality lock. Instead:
- Every `dms_*` route/contract referenced by a microstep is classified **DEPLOYED** (present in the Vault DMS API Spec and deployed) or **PROPOSED** (this microstep introduces it).
- Every Microsoft Graph endpoint a handler calls MUST be one already called by the named deployed primary reference, or authorized as a delta per Golden Handler §4 (Conformance §6 T12).
- The stateless / no-DB / OBO-as-user invariants are fixed by the architecture doc §0a/§2/§3/§5 and are not re-litigated per microstep.

## §5 Pre-Contract Evidence (P4)

For each in-scope endpoint, cite the Vault DMS API Spec entry and confirm the route-naming convention `dms_<operation>[_<entity>]`. Confirm the delegated-OBO/Graph profile against the named deployed primary reference. Vault DMS calls **no** other Vault app's API and accesses **no** `reporting_*`/`theo_*` table (architecture §0a/§6).

## §6 SQL and Authorization Discipline

- Vault DMS ships **no SQL and no migration** (stateless). There is no Walter-executable SQL for this repo unless a future Walter-authorized amendment introduces state.
- **Read-only grounding** is by reading deployed handlers / Graph docs; there is no local database to query.
- **Authorization boundary:** Claude Code plans, authors, and — under the scoped exception below — deploys; Walter holds all other execution authority. **Deployment:** Claude Code MAY deploy handler/function code (+ `function.json`) to the dedicated **`vaultgpt-func-dms`** Function App after a Codex-APPROVED VEP (Execution Orchestration Standard §1E, DR-D1; Walter-granted). The monolith `vaultgpt-func-premium` remains READ-ONLY / never written by Claude Code. Branch merges remain Walter-only.

## §7 Golden Curl + Handler Discipline (P5/P7, I2/I4)

Handler structure, the canonical Primary Reference selection, Allowed Deltas, the Structural Mirror Table, and curl determinism are owned by `governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md`. Claude Code selects exactly one canonical Primary Reference handler + function.json (no composite), inlines them full-verbatim in the turn, emits the Structural Mirror Table, and emits deterministic golden curls for every in-scope endpoint, run by Claude Code against `vaultgpt-func-dms` via an authenticated `az` bearer.

## §8 VEP Format and Gap Register (P8, P2.5)

A Verified Evidence Pack opens with the GCR + Rule Anchor Table (Conformance §3/§5) and contains, at minimum: feature identification; architecture & boundary reconciliation (stateless mirror; no DB; OBO-as-user; consumed via Origin); **Gap Register** (`PROCEED` / `PRE-LAND` / `ESCALATE`, or a verbatim `NO-GAPS` certification); contract grounding (DEPLOYED/PROPOSED); handler grounding (named deployed primary reference, inlined); deterministic curls; and the mechanical-lint PASS block (Conformance §10 T24). The Gap Register vocabulary is closed: `PROCEED` / `PRE-LAND` / `ESCALATE` / `NO-GAPS`.

## §9 Implementation Package Approval Contract (I1–I6)

An Implementation Package is emitted only against a Codex-APPROVED VEP for the microstep, opens with the GCR + Rule Anchor Table, and contains the structural mirror, the deterministic curl set, and the parity checklist (truth owner: Vault DMS Golden Handler Standard). No migration SQL section (stateless).

## §10 Reviewer Directive (handoff to Codex)

A deterministic note forwarding a package to Codex opens with a single grounding directive naming the **Codex Vault DMS Review Standard** first; a second-line Conformance §4 classification pointer is permitted. The note never conditions approval on ChatGPT review.

## §11 Verbatim-Edit Handoff / Pending Role-C

On detecting documentation drift against deployed reality, or any change to a governed document, Claude Code halts substantive work and emits a Role-C Verbatim-Edit Handoff (exact before/after text for each edit) for Codex to execute; Claude Code does not silently edit governed documents mid-turn.

## §12 Branch / Commit / Push Discipline

Claude Code authors on the `vault-dms` `development` branch. Commit, push, branch creation/deletion, and merge (promotion to `main`) require their normal per-package Walter authorization. Read-only git (`status`/`log`/`diff`/`fetch`/`pull --ff-only`) is always permitted.
