# THEO GOLDEN COMPONENT PACK STANDARD

Scope: Vault Theo frontend components. The component-structure / Component Contract Table / visual-parity truth owner for Theo frontend implementation.
Filename / location: `governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md`.

> **Status: v0.1 DRAFT.** Establishes the canonical Component Contract Table format, the Component Structural Mirror format, prop-interface conventions, allowed deltas, and the visual-parity checklist that the Frontend Conformance Standard §4A (F-P4/F-P5, F-I2/F-I4) and the Theo Frontend Governor §3/§8 point at. Reviewer = Codex.

---

## §1 Authority

The Frontend Conformance Standard governs grounding/format/invalidity and the Visual Authority Registry. This standard governs component structure, the Component Contract Table format, and visual parity. The reference pack (VA-T1/VA-T2/VA-T3) is the surface authority — reproduce faithfully; do not redesign.

## §2 Canonical Primary Reference Component

For each implementation package, select **exactly one** existing component file as the structural mirror target. For **1A productionisation**, the named substrate is `frontend/theo-frontend-reference.jsx` (architecture §8.3; 1A handover §0/§2.1) — the definitive surface to lift into the repo. When a component is genuinely new with no deployed/substrate analog, declare `PRIMARY REFERENCE: GREENFIELD` and name the governing authority (the Theo Phase 1A Frontend Plan + the relevant VA-id) as the reference. Composite primary references (two components contributing one pattern) are prohibited without Walter authorization.

## §3 Component Contract Table (canonical format)

One row per component in scope. Each row locks three surfaces:

| Column | Content |
|--------|---------|
| Component (proposed/active) | Name + ownership (shell / Theo surface; ACTIVE vs NEW/GREENFIELD) |
| Prop / input interface | TypeScript types for every prop; required-before-optional; **no `any`**; events/state noted |
| Visual authority citation | VA-id from Frontend Conformance §4B + the specific section/region/screenshot |
| Data / contract dependency | The service-module contract or endpoint + consumed fields; for 1A, the mocked-gateway/contract shape (status: real-in-1A / true-in-1B) |
| Impl eligibility | PROCEED / DEFERRED / OUT-OF-SCOPE |

No implementation may begin without an approved Component Contract Table (Frontend Conformance §6 T12/T20). A row missing any of the three locked surfaces is invalid (T20).

## §4 Prop-Interface Conventions

TypeScript only; explicit types for every prop; required props before optional; no `any` (use a precise type or a discriminated union); event-handler props named `on<Event>`; the discriminated-union shapes the surface already uses (e.g. artifact `type: 'document' | 'code' | 'html'`) are preserved, not widened.

## §5 Allowed Deltas (component)

A component region is classified **EXACT** (structural mirror of the Primary Reference), **ALLOWED DELTA**, or **DEVIATION**. Allowed deltas for 1A productionisation: splitting the monolith into components without rendered-surface change; wiring an inline call to the service-module/gateway abstraction; replacing in-memory stand-ins with the contracts module. **AD-visual:** a CSS / inline-style change that does not alter the rendered surface is an allowed delta; converting the inline-style system to Tailwind/CSS-in-JS in 1A is a **DEVIATION** and prohibited (1A handover §0.1/§6). Any visual change to the rendered surface must be classified VISUAL-AUTHORITY-DEVIATION with a Rule Anchor.

## §6 Component Structural Mirror Table (F-I2)

The implementation package emits a table mapping every component region to the Primary Reference region with its EXACT / ALLOWED DELTA / DEVIATION / VISUAL-AUTHORITY-MATCH / VISUAL-AUTHORITY-DEVIATION classification, each backed by a Rule Anchor.

## §7 Visual-Parity Checklist (F-I4)

The package emits a visual-parity checklist confirming the implemented surface matches the VA-cited authority region: layout, palette (the reference `C` colour object), typography (the `SANS`/`SERIF`/`MONO` stacks), spacing, states (loading / empty / error / selected / hover / focus), and interaction behaviour — reproduced faithfully, no redesign.

## §8 Greenfield Declaration

When the Component Contract Table includes NEW/GREENFIELD components (no deployed/substrate analog), the package states `PRIMARY REFERENCE: GREENFIELD` for those rows and names the governing authority (Theo Phase 1A Frontend Plan + VA-id) as the reference. Greenfield does not waive the Component Contract Table, the prop-interface conventions, or the visual-parity checklist.
