# CLAUDE CODE — THEO FRONTEND GOVERNOR STANDARD

Scope: Vault Theo frontend. Binds Claude Code's authoring behavior in the Theo frontend pipeline.
Filename / location: `governance/CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md`.

> **Status: v0.1 DRAFT — lean Governor.** Names Claude Code's operational obligations for Theo frontend work and points at the truth owners. The grounding machinery (GCR, Rule Anchor Table, grounding modes, invalidity, sub-phase spine, pass model, Visual Authority Registry) lives in `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` ("the Frontend Conformance Standard") and is not restated. The component-structure / visual-parity truth owner is `governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md`. The surface authority is the reference pack (VA-T1/VA-T2/VA-T3 in the Frontend Conformance Standard §4B). The **reviewer is Codex**.

---

## §1 Authority and Relationship

1. On grounding format, modes, invalidity, sub-phases, passes, or the Visual Authority Registry, **the Frontend Conformance Standard governs**; this Standard's references are pointers.
2. On component structure / visual parity, the **Theo Golden Component Pack Standard** governs. On the surface itself, the **reference pack (VA-T1/VA-T3)** governs — reproduce faithfully; do not redesign.
3. Walter is the execution, runtime-acceptance, and exemption authority.

## §2 Planning Gate / Implementation Gate

- **Planning Gate (Pass 1):** no plan leaves Claude Code without a completed internal VEP pass — GCR + Rule Anchor Table, the §4A.1 sub-phase walk F-P1–F-P7, UI Authority Reconciliation (§4), Gap Disclosure (§5), and the Component Contract Table (§3).
- **Implementation Gate (Pass 3):** no implementation begins without a Codex-APPROVED VEP carrying an approved Component Contract Table, and (where a paired backend dependency is real) the corresponding readiness; for 1A, backend-bound calls run against the **mocked gateway / contract layer**.

## §3 VEP Format and the Component Contract Table

A Frontend VEP opens with the GCR + Rule Anchor Table (Frontend Conformance §3/§5) and MUST contain a **Component Contract Table** — one row per in-scope component, locking: (1) the TypeScript prop/input interface (required-before-optional; no `any`); (2) the VA-id citation (from §4B) + section/region; (3) the data/contract dependency (the service-module contract or endpoint + consumed fields; for 1A, the mocked-gateway/contract shape). No implementation may begin without an approved Component Contract Table (Frontend Conformance §6 T12/T20/T21/T22).

## §4 UI Authority Reconciliation Gate

For every Pass 1 VEP, reconcile the planned UI against each in-scope Visual Authority Registry entry (VA-T1 reference surface; VA-T2 architecture; VA-T3 1A handover). The reference surface is the definitive 1A surface: **reproduce it faithfully, do not redesign** (1A handover §0.1/§6). A planned visual deviation must be cited and classified (VISUAL-AUTHORITY-DEVIATION) with a Rule Anchor, or it is invalid.

## §5 Gap Disclosure

Every Pass 1 VEP includes a Gap Disclosure recording foreseeable downstream gaps with a `PROCEED` / `PRE-LAND` / `ESCALATE` pivot, or a verbatim `NO-GAPS` certification. Per-surface real-in-1A vs true-in-1B status is marked explicitly (1A handover §3): all visual + interaction behaviour is real-in-1A; persistence / RAG / RLS / live gateway are true-in-1B.

## §6 Theo Frontend Build Discipline (BINDING guardrails — 1A handover §2/§6)

1. **Gateway abstraction.** The model call routes through a gateway abstraction (mock in 1A), never a direct browser→Anthropic/Foundry call. The browser never holds a model credential (architecture §2).
2. **Single service/contracts module.** Every backend-bound call (chat, projects, artifacts, settings, retrieval) routes through one services/contracts module — no scattered inline fetches — so 1B can swap each mock for a real call with no surface change.
3. **No browser storage.** No `localStorage` / `sessionStorage`; 1A state is React/in-memory. Persistence is 1B.
4. **Preserve the surface.** Keep the reference surface's inline-style approach; **no Tailwind / CSS-in-JS conversion in 1A**. Reproduce the marker-parsed artifact protocol (`[[ARTIFACT …]]`) and the SWAP BLOCK exactly.
5. **App-context layer.** Accept `{ app_key, app_context }` from Origin, carry it on the conversation, and surface it via the header chip idiom — context-only; 1A does not fetch app data (architecture §3; 1A handover §2.4).
6. **Boundary.** No change to `corporate-reporting` or any `reporting_*` table/endpoint; `vault-origin` changes are additive (context-broadcast + Theo mount point) only.

## §7 Active-Surface & Deprecated-Code Discipline (F-P6)

Confirm target files are on the active surface before editing; do not build on deprecated/orphaned code; confirm current file state with a Read this turn.

## §8 Component Implementation Package (F-I1–F-I6)

Emitted only against a Codex-APPROVED VEP; opens with GCR + Rule Anchor Table; contains the Component Structural Mirror Table (truth owner: Theo Golden Component Pack Standard), contract-integration evidence (service boundary + gateway abstraction), the visual contract checklist (faithful reproduction), and the SWA test plan for Walter.

## §9 Branch / Merge Discipline and Post-Merge Testing (Pass 3)

Implementation lands on the dev branch against the approved VEP. Claude Code does not merge; Walter merges and validates in the SWA environment. Claude Code emits explicit SWA test instructions, then assembles the Pass 3 Visual Acceptance Evidence (screenshot vs VA-id + Walter acceptance note). Commit/push/PR/merge each require their normal per-package Walter authorization.

## §10 Verbatim-Edit Handoff / Role-C

On documentation drift against implemented reality, or any change to a governed document, Claude Code emits a Role-C Verbatim-Edit Handoff (exact before/after text) for Codex to execute; it does not silently edit governed documents.
