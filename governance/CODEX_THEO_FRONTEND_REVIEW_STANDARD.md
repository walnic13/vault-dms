# CODEX — THEO FRONTEND REVIEW STANDARD

Scope: Vault Theo frontend. Binds Codex's reviewer behavior (Pass 2) and Role-C inline-execution behavior (Pass 4) in the Theo frontend pipeline.
Filename / location: `governance/CODEX_THEO_FRONTEND_REVIEW_STANDARD.md`.

> **Status: v0.1 DRAFT — lean reviewer standard.** The trigger set Codex enforces is owned by `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` ("the Frontend Conformance Standard") §6 and is not restated here. This standard names *how Codex reviews* frontend packs. Codex replaces Corporate Reporting's "Bolt" reviewer role per `governance/THEO_ARCHITECTURE_AND_STRUCTURE.md` §0b.

---

## §1 Authority and Relationship

1. Codex is the Pass 2 frontend plan reviewer and the Pass 4 Role-C inline executor. It reviews; it does not author plans or surfaces.
2. The Frontend Conformance Standard governs the trigger set, GCR/Rule-Anchor format, grounding modes, the Visual Authority Registry, and the pass model. On conflict, it governs.
3. ChatGPT is out of the pipeline. Codex MUST NOT condition approval/rejection on ChatGPT review and MUST reject any pack citing a ChatGPT note as grounding/approval/authority (Frontend Conformance §6 T18).
4. Walter is the execution, runtime-acceptance, and exemption authority.

## §1A Hard Gates (run BEFORE substantive review)

- **Component Contract Table completeness (Frontend Conformance §6 T12/T20).** A Pass 1 VEP MUST carry a Component Contract Table with, per row, the prop interface, the VA-id citation, and the data/contract dependency. Any missing field ⇒ REJECTED.
- **Visual Authority Registry citation (T21).** Every VA-id cited MUST be registered in Frontend Conformance §4B. Unregistered ⇒ REJECTED.
- **Contract existence (T22).** Every cited contract/endpoint MUST exist in the Theo API Spec or the declared mocked-contract for the surface; no invented final shapes.
- **Artifact presence (T25).** Every controlling artifact path the pack cites is present at the cited HEAD on the active review branch (independent probe).
- **GCR + Rule-Anchor presence (T1/T5).**

A failed hard gate ⇒ REJECTED with the trigger number; do not open substantive review.

## §2 Review Process (Pass 2)

1. Codex's review turn opens with a GCR + Rule Anchor Table per Frontend Conformance §3/§5 and §4 (Codex | Pass 2 row).
2. Codex verifies each §4A sub-phase declared is evidenced (T23), every structural/visual classification is anchored (T6), every quote is a literal HEAD substring (T7), and the grounding mode matches the turn type (T14/T17).
3. Codex enforces the **surface-fidelity guardrails** (Frontend Conformance §6 T26): the reference surface is reproduced faithfully (no redesign); no direct browser→Anthropic/Foundry model call (gateway abstraction only); no `localStorage`/`sessionStorage`; no Tailwind/CSS-in-JS conversion in 1A; no change to `corporate-reporting`/`reporting_*`. A planned visual deviation is acceptable only if classified VISUAL-AUTHORITY-DEVIATION with a Rule Anchor.
4. Codex verifies the Gap Disclosure (or verbatim `NO-GAPS`) is present (T24).
5. Any firing trigger ⇒ REJECTED, trigger cited by number.

## §3 Verdict Discipline (BINDING)

- Codex emits **only `APPROVED` or `REJECTED`**. No conditional, partial, or pending-correction approval. No "approve if fixed."
- On REJECTED, cite the trigger number(s) and the precise location; Claude Code reissues a full new turn.

## §4 Role-C Inline Execution (Pass 4)

When Claude Code emits a Role-C Verbatim-Edit Handoff, Codex executes the directed edits **verbatim**, edits only the named target documents (Theo Frontend Governor, the Frontend Conformance Standard, the Theo Phase 1A Frontend Plan, the §4B Visual Authority Registry), makes no substantive additions, and opens its Role-C turn with a GCR per the Frontend Conformance §4 (Codex | Pass 4 row). Codex MUST NOT edit or create `CLAUDE.local.md`.
