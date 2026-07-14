# THEO FRONTEND GROUNDING CONFORMANCE STANDARD

Scope: Vault Theo frontend only. No other project or pipeline is in scope.
Adoption: Immediate on issuance.
Filename / location: `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` in the `vault-theo` repository.

> **Status: v0.1 DRAFT.** Adapted in the established Corporate Reporting governance shape (`frontend/governance/REPORTING_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md`) and retargeted to Vault Theo per `governance/THEO_ARCHITECTURE_AND_STRUCTURE.md` §0b. The **reviewer role is Codex** (not Bolt). The Theo 1A frontend builds against **contracts** with a **mocked model gateway** and in-memory state (architecture §8.2; 1A handover §2.2/§2.3); persistence/RAG/RLS are 1B. Companion Theo standards referenced here (Theo Frontend Governor, Codex Theo Frontend Review Standard, Theo Golden Component Pack Standard, Theo API Spec, Theo Phase 1A Frontend Plan) are authored in subsequent passes; until each exists, references are forward references. The Visual Authority Registry (§4B) entries (VA-T1/T2/T3) are **CURRENT and landed**: the canonical reference pack was delivered byte-preserving and the `.jsx` sha256 is verified (`fe473eed…f2a`).

---

## §1 Purpose and Authority

This Standard converts frontend grounding from a behavioral instruction ("read the documents") into a structural, falsifiable artifact ("prove you read the documents this turn and prove which clauses you applied"). The single root cause of enterprise-grade frontend failure is the same as backend: agents conflate *having-read-a-document-earlier* with *having-read-it-this-turn*.

This Standard binds Claude Code and Codex as formal roles in the Vault Theo frontend execution pipeline.

**Claude Code** holds three pipeline roles: Pass 1 Plan Author (Verified Evidence Pack), Pass 3 Executor (component implementation + screenshot evidence), and Pass 4 Documentation Author (Role-C verbatim-edit handoff).

**Codex** holds two pipeline roles: Pass 2 Plan Reviewer (approval / rejection) and Pass 4 Inline Executor (executes verbatim edits directed by Claude Code's Role-C handoff).

**ChatGPT** is out of the formal pipeline — a Walter-advisory second-opinion layer only. No ChatGPT advisory note is acceptable as input to any frontend pipeline gate, and Codex MUST NOT condition approval/rejection on ChatGPT review.

**Walter** is the execution authority, runtime acceptance authority, and sole authority who may grant governance exemptions.

This Standard is Vault Theo frontend only. It does not supersede, modify, or relax the backend `governance/THEO_GROUNDING_CONFORMANCE_STANDARD.md` or any Corporate Reporting governance document.

A substantive turn is any turn producing a plan, Verified Evidence Pack, Component Implementation Package, approval, rejection, amendment, screenshot evidence package, or documentation-update package. Every substantive turn from Claude Code or Codex MUST open with a Grounding Conformance Receipt (GCR) and a Rule Anchor Table per §3–§5. Purely administrative turns (per §2) are exempt and MUST declare themselves as such.

Failure to comply renders the turn automatically invalid per §6. Invalidity is not discretionary, not appealable by reformatting, not correctable mid-thread. The invalid turn MUST be reissued in full.

---

## §2 Definitions

**Turn-Type Matrix.** The published table in §4 mapping each pipeline role + turn-type combination to the documents that MUST be re-read on that turn.

**GCR (Grounding Conformance Receipt).** A fixed-format table opening every substantive turn, listing each required document, its absolute path, the tool-call that read it *this turn*, and a currency anchor proving the read reflects current HEAD.

**Rule Anchor.** A four-field record linking one clause of one authoritative document to the exact location in the agent's output where it was applied. A Rule Anchor Table is the collection of Rule Anchors for a turn.

**Currency Anchor.** A falsifiable proof the read content is current HEAD. Default: first-20-words-plus-last-20-words snippet of the cited region captured via the GCR's Read invocation. Fallback: git blob SHA via a tool call this turn — only where first-20/last-20 is impractical.

**Canonical Primary Reference Component.** Exactly one named existing component file selected per the Theo Golden Component Pack Standard as the structural mirror target for an implementation package. For 1A productionisation, the named **substrate** is `frontend/theo-frontend-reference.jsx` (architecture §8.3; 1A handover §0/§2.1). Composite selections are prohibited without Walter authorization.

**Component Contract Table.** A per-component table required in every Pass 1 VEP, locking three surfaces before implementation: (1) prop interface (TS types + required/optional per prop), (2) visual authority citation (VA-id from §4B + section/screenshot reference), and (3) data/contract dependency (the service-module contract or endpoint + consumed fields; for 1A, the mocked-gateway/contract shape). This table is the primary Codex review surface at Pass 2 and the execution contract for Pass 3. No implementation may begin without an approved Component Contract Table.

**Visual Authority Registry.** The append-only table in §4B registering every vision/surface authority that may be cited. A VA-id not registered in §4B is invalid as a citation.

**Substantive Turn / Full Baseline / Targeted Current-Turn / Delta Grounding / Advisory Note.** As in the backend standard `governance/THEO_GROUNDING_CONFORMANCE_STANDARD.md` §2, applied to the frontend pipeline. Advisory notes (ChatGPT) are non-binding and MUST NOT be cited as grounding, approval input, or pipeline authority.

**Visual Acceptance Evidence.** The Pass 3 evidence artifact: a rendered screenshot of the implemented surface in the SWA environment compared against the VA-id cited in the Component Contract Table, plus Walter's explicit acceptance note. (For the 1A surface, "live backend" is the **mocked gateway / contract layer**; the real gateway is 1B.)

---

## §3 Grounding Conformance Receipt Format

Every substantive Claude Code or Codex turn MUST open with a table of the form:

```
GROUNDING CONFORMANCE RECEIPT
Role: <Claude Code | Codex>
Turn-type: <from §4 matrix>
Turn issued against HEAD: <git rev-parse HEAD captured this turn>
Grounding mode: <Full Baseline Grounding | Targeted Current-Turn Grounding | Delta Grounding>

| # | Document (name + absolute path) | Read tool invocation this turn | Currency anchor |
| - | ------------------------------- | ------------------------------ | --------------- |
| 1 | ...                             | Read(file_path=..., offset=..., limit=...) | first-20: "..." ... last-20: "..." |
```

Rules:

1. Each row MUST correspond to a document required for the declared turn-type per §4. No row omitted on "already in context" / "previously read."
2. The Read invocation MUST be a real tool call this turn. Claimed reads without a tool-call record are automatically invalid.
3. The Currency Anchor MUST be independently verifiable (first-20/last-20 per §8; blob SHA only as fallback).
4. No row may cite a prior-turn read. "captured in prior turn," "previously inlined," "as established above" are prohibited inside the GCR.
5. Administrative turns replace the GCR with: `GCR: administrative turn — no substantive output; §4 re-read not required.` Invoking this on a substantive turn is itself an automatic invalidity trigger.
6. For Targeted Current-Turn Grounding, each GCR row MUST identify the specific section/range read this turn, and the Rule Anchor Table MUST tie every relied-on rule to a current-turn read.
7. For Delta Grounding, the GCR MUST identify the rejected/modified prior artifact, the affected sections, and the rule authorizing delta treatment.

---

## §4 Turn-Type Matrix (Authoritative, Vault Theo Frontend Pipeline Only)

| Role | Turn-type | Grounding mode | Documents required in GCR |
|------|-----------|----------------|---------------------------|
| Claude Code | Pass 1 — Frontend Verified Evidence Pack | Full Baseline Grounding | Claude Code Theo Frontend Governor Standard; Theo Phase 1A Frontend Plan; Theo API Spec (sections covering in-scope contracts; mocked-gateway contract for 1A); Theo Frontend Grounding Conformance Standard (this document); Codex Theo Frontend Review Standard; Theo Golden Component Pack Standard; §4B Visual Authority Registry; every named VA-id in the Component Contract Table; every named primary reference component cited in the VEP |
| Claude Code | Pass 1 — Materially revised frontend plan | Full Baseline Grounding unless expressly limited by Codex rejection scope | Same as Pass 1 VEP, plus the rejected or prior plan being revised |
| Claude Code | Pass 1 — Codex-rejection correction / delta-evidence pack | Delta Grounding | Claude Code Theo Frontend Governor Standard sections governing rejection/delta; Codex Theo Frontend Review Standard sections governing the rejection; this Standard; the rejected pack; the inbound Codex rejection; documents/sections affected by the correction |
| Claude Code | Pass 3 — Component Implementation Package | Full Baseline Grounding | Claude Code Theo Frontend Governor Standard; Theo Phase 1A Frontend Plan; Theo API Spec (in-scope contracts); this Standard; Codex Theo Frontend Review Standard; Theo Golden Component Pack Standard; the Codex-approved VEP this package implements; every named primary reference component cited in the package |
| Claude Code | Pass 3 — Visual Acceptance Evidence handoff | Targeted Current-Turn Grounding | Claude Code Theo Frontend Governor Standard Pass-3 visual-acceptance sections; §4B Visual Authority Registry entries for the in-scope feature; the approved VEP's Component Contract Table; Walter's SWA acceptance note for this turn |
| Claude Code | Pass 4 — Documentation-update package (Role-C authoring) | Targeted Current-Turn Grounding | Claude Code Theo Frontend Governor Standard documentation-update sections; Theo Phase 1A Frontend Plan if edited; §4B Visual Authority Registry if edited; this Standard; target documents being edited |
| Claude Code | Response to Codex note | Targeted Current-Turn Grounding unless the response is a new/revised plan | Claude Code Theo Frontend Governor Standard sections necessary for the response; the Codex note cited by message anchor; this Standard; any affected authority sections |
| Codex | Pass 2 — Frontend plan approval review | Targeted Current-Turn Grounding | Codex Theo Frontend Review Standard; Claude Code Theo Frontend Governor Standard; Theo Golden Component Pack Standard; Theo API Spec (in-scope contracts); this Standard; the VEP under review including its Component Contract Table |
| Codex | Pass 4 — Role-C documentation-update execution | Targeted Current-Turn Grounding | Codex Theo Frontend Review Standard documentation-update sections; this Standard; target documents being edited; the inbound Claude Code / Walter note authorizing edits |
| Codex | Rejection | Targeted Current-Turn Grounding | Codex Theo Frontend Review Standard; this Standard; the invalid pack with the specific trigger cited |

ChatGPT advisory turns are outside this matrix by design.

Any turn-type not listed MUST be declared administrative per §2 or MUST halt pending Walter authorization. A turn that instructs Walter to merge code, validate runtime behavior, accept/reject an artifact, update documentation, or advance sequencing is never administrative.

---

## §4A Sub-Phase Spine (Authoritative)

§4 classifies turns at the turn-type level. Within a Pass 1 VEP or a Pass 3 Implementation Package, Claude Code executes several sub-phases in sequence. This §4A names the authority sections that MUST have current-turn Rule Anchors when the corresponding sub-phase is executed. It refines §4; it does not weaken it. §4A is binding on Claude Code; Codex MAY use it to verify sub-phase evidence.

### §4A.1 Pass 1 Plan-Authoring Sub-Phases

| # | Sub-phase | Purpose | Authority sections required as Targeted Current-Turn reads within the Full Baseline set |
|---|-----------|---------|----------------------------------------------------------------------------------------|
| F-P1 | Feature identification | Locate the microstep in the governed frontend plan; classify per-surface real-in-1A vs true-in-1B (1A handover §3). | Theo Phase 1A Frontend Plan feature entry; Theo Execution Orchestration Standard role vocabulary; Decision Register (in-scope entries). |
| F-P2 | UI authority reconciliation | Confirm no conflict with CURRENT visual/surface authorities. | Every in-scope §4B Visual Authority Registry entry (VA-T1 reference surface; VA-T2 architecture; VA-T3 1A handover). Condition: every Pass 1 VEP. |
| F-P2.5 | Gap disclosure | Disclose foreseeable downstream gaps; record `PROCEED` / `PRE-LAND` / `ESCALATE` or verbatim `NO-GAPS`. | Claude Code Theo Frontend Governor Standard gap-disclosure sections; Theo Phase 1A Frontend Plan feature entries (current + adjacent); Decision Register. Condition: every Pass 1 VEP. |
| F-P3 | Backend / contract grounding | Lock request/response shape for in-scope contracts. For 1A, the **mocked model gateway** uses the standard Anthropic Messages API shape (architecture §2.2; 1A handover §2.2); persistence/RAG contracts are mocked (1A handover §2.3). Reporting-API tool calls (1B) reference the Theo Tool Manifest, never a forked Reporting spec. | Theo API Spec entry for each in-scope contract; Claude Code Theo Frontend Governor Standard never-guess sections; for mocked/proposed contracts, mark Pass 3 1A-vs-1B status. |
| F-P4 | Component reference grounding | Select the canonical Primary Reference per the Theo Golden Component Pack Standard; for 1A productionisation the substrate is `frontend/theo-frontend-reference.jsx`; read its full content. | Theo Golden Component Pack Standard canonical-primary-reference selection; the named primary reference component file (full verbatim read where required). |
| F-P5 | Component Contract Table assembly | Produce the Component Contract Table (prop interface, VA-id citation, contract dependency) for every component in scope. | Theo Golden Component Pack Standard component-contract section; Theo API Spec / contract shape for in-scope contracts; §4B VA-id entry. |
| F-P6 | Repository & active-surface grounding | Confirm target files are on the active surface; no deprecated-code contamination; **no `localStorage`/`sessionStorage`** (1A handover §2.5); inline-style surface preserved, **no Tailwind/CSS-in-JS conversion in 1A** (1A handover §0.1/§6). | Current state of target files (Read invocations); Claude Code Theo Frontend Governor Standard active-surface and deprecated-code sections. |
| F-P7 | VEP assembly | Assemble all evidence into the Frontend VEP format. | Claude Code Theo Frontend Governor Standard VEP-format section; this Standard §3, §5 (GCR + Rule Anchor Table open the pack). |

### §4A.2 Pass 3 Component Implementation Package Sub-Phases

| # | Sub-phase | Purpose | Authority sections required as Targeted Current-Turn reads within the Full Baseline set |
|---|-----------|---------|----------------------------------------------------------------------------------------|
| F-I1 | Approval-state confirmation | Confirm the inbound VEP has a Codex APPROVED state. | Codex Theo Frontend Review Standard approval-process section; the approved VEP; Claude Code Theo Frontend Governor Standard implementation-package approval contract. |
| F-I2 | Component structural mirror | Emit the Component Structural Mirror Table per the Theo Golden Component Pack Standard, tying every region to the canonical primary reference (the reference surface for 1A). | Theo Golden Component Pack Standard structural-mirror section; Claude Code Theo Frontend Governor Standard enforcement section; the canonical Primary Reference component file. |
| F-I3 | Contract integration evidence | Confirm every backend-bound call routes through the **single service/contracts module** (1A handover §2.3 / §7.3) and the **gateway abstraction** (never a direct browser→Anthropic/Foundry call; 1A handover §2.2 / §6). | Theo API Spec sections for in-scope contracts; Claude Code Theo Frontend Governor Standard service-boundary / gateway-abstraction sections. |
| F-I4 | Visual contract checklist | Verify the implementation matches the VA-cited authority (the reference surface reproduced faithfully; no redesign — 1A handover §0.1/§6). | Theo Golden Component Pack Standard visual-parity section; §4B VA-id entry. |
| F-I5 | SWA test plan | Emit explicit SWA testing instructions for Walter to produce Pass 3 Visual Acceptance Evidence. | Claude Code Theo Frontend Governor Standard post-merge testing section; Theo Golden Component Pack Standard testing section. |
| F-I6 | Implementation package emission | Assemble the Component Implementation Package and emit. | Claude Code Theo Frontend Governor Standard implementation-package section; this Standard §3, §5. |

### §4A.3 Post-Approval Pass 3 and Pass 4 Sub-Phases

| # | Sub-phase | Purpose | Authority sections required as Targeted Current-Turn reads |
|---|-----------|---------|-----------------------------------------------------------|
| F-E1 | Visual acceptance evidence package | Receive Walter's SWA results + screenshot; assemble Pass 3 Visual Acceptance Evidence vs the VA-id authority. | Claude Code Theo Frontend Governor Standard Pass-3 visual-acceptance sections; the approved VEP's Component Contract Table; §4B VA-id entry; Walter's SWA acceptance note. |
| F-E2 | Pending Role-C handoff | On documentation drift against implemented reality, emit the Deterministic Note to Codex per Role-C discipline. | Claude Code Theo Frontend Governor Standard Verbatim-Edit Handoff / Role-C sections; target documents requiring Role-C edits. |

### §4A.4 Rule

For any substantive Claude Code turn, the GCR per §3 MUST reflect at minimum the authority sections in the applicable sub-phase rows. §4A does not add documents beyond §4; it localizes the reads. Reliance on memory or prior-turn reading of a sub-phase-required section is automatically invalid per §6.

---

## §4B Visual Authority Registry (Authoritative, Append-Only) — Theo starter

Every vision/surface authority used as grounding for Component Contract Tables, Rule Anchor Tables, or GCR rows MUST be registered here before it may be cited.

| VA-id | Document name | Path | Scope | Status |
|-------|--------------|------|-------|--------|
| VA-T1 | Theo Frontend Reference Surface | `frontend/theo-frontend-reference.jsx` | The definitive Claude-for-Teams replica surface: sidebar (Chats/Projects/Artifacts/Customize), live chat, Projects (instructions + knowledge), versioned Artifacts side panel, Customize, app-context chip. The exact approved surface — reproduce faithfully, do not redesign (1A handover §0/§0.1). | CURRENT — landed byte-preserving; sha256 verified `fe473eed3364505824639d3ef0c9fd0059f2d1ae164ae22976fc3268aed33f2a` |
| VA-T2 | Theo Architecture and Structure | `governance/THEO_ARCHITECTURE_AND_STRUCTURE.md` | Foundation: repo boundaries, model gateway, Origin→Theo context contract, tool-dispatch, `theo_` schema/RLS, RAG, 1A/1B seam | CURRENT — landed byte-preserving |
| VA-T3 | Theo 1A Frontend Handover | `governance/THEO_1A_FRONTEND_HANDOVER.md` | Productionisation contract for the 1A surface (gateway swap, contracts-vs-mocks, app-context layer, per-surface real-in-1A vs true-in-1B, guardrails, acceptance criteria) | CURRENT — landed byte-preserving |
| VA-T4 | Theo-in-Origin Mount Layout | `governance/THEO_ARCHITECTURE_AND_STRUCTURE.md` §3A + `governance/THEO_1A_FRONTEND_HANDOVER.md` §4 | The hosted mount layout: Theo as the Origin 9/10 landing surface; permanent collapsible Theo nav section in the 1/10 (below Vault Files, above Vault Origin Apps); app-sidebar stacking; in-app right-hand Theo panel ("Open Theo" 9/10 toggle); in-shell Module Federation (no iframe) | CURRENT — landed via Role-C |
| VA-T5 | Theo Citation Rendering Reference | `artifacts/theo-citations-reference.jsx` | Inline web-grounding citation affordance: a favicon+sequential-index chip immediately after each cited claim; hover/focus opens a source card (host, title, 3-line-clamped cited_text snippet); adjacent chips for multi-source claims; each chip a real `<a target="_blank" rel="noopener noreferrer">` with an aria-label; keyboard-accessible. Zero-dependency inline-style idiom (matches VA-T1). Reproduce faithfully, do not redesign. | CURRENT — landed via Role-C; sha256 verified `56a3be463cddde10f6a02db0031b50952aa2cfa28ee33f206f284cb949f9812a` |
| VA-T6 | Theo Narrow-Viewport (Mobile) Hosted Surface | `governance/THEO_1A_FRONTEND_HANDOVER.md` §4.1 | The narrow-viewport (mobile) adaptation of the hosted Theo surface: single-column reflow (nav via the Origin off-canvas drawer), artifact viewer as a full-screen overlay, touch-first (tap-reachable) manage affordances; wide-viewport VA-T1 surface unchanged. Driving authority = landed Origin VO1 §2B/§10B/§12 (VA-F1). | CURRENT — landed via Role-C |
| VA-D1 | Vault DMS File Browser (1/10-rail-only remote) | `src/DmsBrowser.tsx` (exposed `dmsApp/DmsBrowser`) + the faithful-port source `vault-origin/src/shell/dms/DmsMirror.tsx` + `vault-origin/src/shell/appHost/dmsMirrorClient.ts` | The federated DMS file-browser: a **1/10-rail-only** tree (no 9/10) that portals into a host `navSlot` (Origin / Sigma) or renders standalone; browses `func-dms` (`dms_list_sites` / `dms_tree`) OBO as the signed-in user. **Pixel-identical to Origin's "Vault Files" rail** — Tailwind `theo-*` tokens + `lucide-react` icons (Database client roots [indigo], Folder/FolderOpen [amber], file-type icons by extension, chevrons, indent `4 + depth*12`), `clientLabel = site_name`; files open via their SharePoint `web_url`. The host shell owns the rail's collapse/drag chrome. Reproduce `DmsMirror` faithfully — do not redesign. | CURRENT — Walter-directed 2026-07-14; the authority for the vault-dms FE (a faithful port of the Reporting-FE-approved `DmsMirror`). |

Append rules:
1. New rows added at the bottom with a monotonically increasing `VA-Tn` identifier.
2. No VA-id reused or deleted. Superseded documents are marked `SUPERSEDED BY VA-Tn-of-successor` and retained.
3. A new row is a governance change: Walter approval + a Pass 4 landing required.
4. Any VEP or Rule Anchor Table citing a VA-id path not registered here is automatically invalid per §6 T21.

---

## §4C Multi-Pass Discipline (Authoritative Pass Enumeration)

| Pass | Name | Actor | Primary artifacts | Governing section |
|------|------|-------|-------------------|-------------------|
| Pass 1 | Claude Code internal VEP pass | Claude Code | Frontend VEP — GCR §3, Rule Anchor Table §5, sub-phase walk §4A.1, UI Authority Reconciliation (F-P2), Gap Disclosure (F-P2.5), Component Contract Table (F-P5), plan body | Claude Code Theo Frontend Governor Standard; this Standard §3, §4A.1, §5 |
| Pass 2 | Codex frontend plan review pass | Codex | The submitted VEP against the Codex Theo Frontend Review Standard rubric; detects unmet grounding, missing sub-phases, missing Component Contract Table, unanchored classifications, any §6 invalidity | `CODEX_THEO_FRONTEND_REVIEW_STANDARD.md`; this Standard §6 |
| Pass 3 | Claude Code execution + Walter SWA acceptance | Claude Code + Walter | Implementation on the dev branch against the approved VEP; Walter SWA validation; Visual Acceptance Evidence (screenshot vs VA-id + acceptance note) | Claude Code Theo Frontend Governor Standard (branch/merge, post-merge testing); this Standard §4A.2, §4A.3 |
| Pass 4 | Role-C documentation-update pass | Claude Code (Role-C author) + Codex (inline executor) | Verbatim documentation edits to the Theo Frontend Governor, this Standard, Theo Phase 1A Frontend Plan, §4B Visual Authority Registry | Claude Code Theo Frontend Governor Standard (Verbatim-Edit Handoff, Role-C); `CODEX_THEO_FRONTEND_REVIEW_STANDARD.md` Role-C Variant |

**Pass ordering and non-bypass (BINDING):** Pass 1 before any plan leaves Claude Code; Pass 2 by Codex (Walter does not stand in); Pass 3 only against a Pass 2-approved plan; Pass 4 standalone for documentation. No pass skipped, merged, or re-labelled. ChatGPT advisory review is Walter-advisory only and MUST NOT be cited as a pass.

**Relationship to §4A:** §4A sub-phases are the internal grammar of a pass. Pass 1 walks F-P1–F-P7; Pass 3 walks F-I1–F-I6 then F-E1; Pass 4 invokes F-E2.

---

## §4D Advisory Note Discipline

ChatGPT advisory notes are Walter-advisory and carry no pipeline gate authority. They are produced at Walter's request, are not governed turns, require no GCR, and MUST NOT be cited in a GCR, Rule Anchor Table, or VEP as grounding, approval input, or pipeline authority. Claude Code and Codex act on Walter's direction, not on the advisory note directly. A governed output citing a ChatGPT advisory note as a reason for a structural choice is automatically invalid per §6.

---

## §4E Authority-Clause Mapping Table (Read-Only, Append-Only) — Theo starter

| # | Theo Frontend Governor Standard clause | Topic | Canonical truth owner | Drift-resolution rule |
|---|----------------------------------------|-------|------------------------|-----------------------|
| FM1 | GCR / Rule Anchor / grounding modes / invalidity | GCR format, grounding modes, invalidity | This Standard §2, §3, §5, §6, §8 | This Standard governs; the Governor pointer is non-authoritative. |
| FM2 | Required-document grounding | Per-turn required documents | This Standard §4 | §4 matrix governs. |
| FM3 | UI Authority Reconciliation | Visual-authority enumeration | §4B Visual Authority Registry | The Registry is the canonical enumeration. |
| FM4 | Surface authority (productionise, do not redesign) | The reference surface as the definitive 1A surface; inline-style / no-Tailwind / no-browser-storage guardrails | VA-T1 + VA-T3 (1A handover §0.1/§2.5/§6) | The reference surface + handover govern; reproduce faithfully. |

Append rules: monotonically increasing FM-identifier; no deletion; Walter approval + Pass 4 landing before a new row is authoritative.

---

## §5 Rule Anchor Table

Every substantive turn MUST include, after the GCR, a Rule Anchor Table:

```
RULE ANCHORS
| # | Source doc | Clause id | Verbatim clause text | Applied in output at |
| - | ---------- | --------- | -------------------- | -------------------- |
| 1 | Theo Golden Component Pack Standard | §[n] Structural Mirror | "<verbatim substring>" | §F-I2 mirror table rows ... |
| 2 | VA-T1 Theo Frontend Reference Surface | §[region] | "<verbatim substring>" | Component Contract Table row 2, VA-id citation |
```

Rules:
1. Every rule relied on to justify a structural choice, classification, or approval MUST appear.
2. Verbatim Clause Text MUST be a direct substring as read this turn. No paraphrase, no ellipsis longer than four words, no summary.
3. Applied-In MUST cite an exact section/row/line in the agent's own output. "Throughout" is prohibited.
4. Over-anchoring is preferred to under-anchoring.
5. Every structural/visual classification (EXACT, ALLOWED DELTA, DEVIATION, APPROVED, REJECTED, DEPLOYED, PROPOSED, NOT_IMPLEMENTED, VISUAL-AUTHORITY-MATCH, VISUAL-AUTHORITY-DEVIATION) MUST be backed by at least one Rule Anchor.

---

## §6 Automatic Invalidity Rules — Consolidated Rejection Triggers

| # | Trigger | Binding on |
|---|---------|-----------|
| T1 | GCR absent | Claude Code (self-gate), Codex (against inbound) |
| T2 | GCR row missing a tool-call invocation for any required document | Claude Code, Codex |
| T3 | GCR row citing a prior-turn read | Claude Code, Codex |
| T4 | Currency Anchor missing, malformed, or not independently verifiable | Claude Code, Codex |
| T5 | Rule Anchor Table absent | Claude Code, Codex |
| T6 | Structural or visual classification without a supporting Rule Anchor | Claude Code, Codex |
| T7 | Rule Anchor quoting text not present in the cited document at current HEAD | Claude Code, Codex |
| T8 | Administrative-turn exemption invoked on a substantive turn | Claude Code, Codex |
| T9 | Primary reference component cited without full verbatim source inline this turn (where the pack standard requires it) | Codex, Claude Code (self-gate) |
| T10 | Composite primary reference without Walter authorization | Codex, Claude Code |
| T11 | "Omitted for context-window" or equivalent phrase applied to any required artifact | Codex, Claude Code |
| T12 | Pass 1 VEP submitted without a Component Contract Table | Codex (against inbound), Claude Code (self-gate) |
| T13 | Doc-vs-runtime drift surfaced without a prior Walter decision | Codex, Claude Code |
| T14 | Grounding mode absent from the GCR | Claude Code, Codex |
| T15 | Targeted Current-Turn Grounding claimed but a relied-on rule is not read and anchored this turn | Claude Code, Codex |
| T16 | Delta Grounding claimed outside a narrow authorized delta correction | Claude Code, Codex |
| T17 | Full Baseline Grounding required but only Targeted Current-Turn or Delta Grounding provided | Claude Code, Codex |
| T18 | Pack cites ChatGPT advisory note as grounding, approval input, or pipeline authority | Codex, Claude Code (self-gate) |
| T19 | Pass 3 implementation submitted without the Walter / Codex approval-state confirmation for this microstep | Claude Code (self-gate), Codex |
| T20 | Component Contract Table row missing prop interface, VA-id citation, or contract dependency | Claude Code (self-gate), Codex |
| T21 | VA-id cited in Component Contract Table not registered in §4B | Claude Code (self-gate), Codex |
| T22 | Contract dependency cited that does not exist in the Theo API Spec / declared mocked-contract for the surface, or claims final shapes not present in accepted authority | Claude Code (self-gate), Codex |
| T23 | Sub-phase completeness failure: the §4A sub-phase track requires authority sections absent from the Rule Anchor Table | Claude Code, Codex |
| T24 | Pass 1 VEP missing Gap Disclosure or verbatim NO-GAPS certification per F-P2.5 | Claude Code (self-gate), Codex |
| T25 | Codex-review submission cites a controlling artifact path not present in the working tree at the cited HEAD on the active review branch | Claude Code (self-gate), Codex (independent presence probe) |
| T26 | Direct browser→Anthropic/Foundry model call in productionised code (not via the gateway abstraction), `localStorage`/`sessionStorage` use, Tailwind/CSS-in-JS conversion of the reference surface in 1A, or any change to `corporate-reporting` / `reporting_*` — each contrary to 1A handover §6 guardrails | Claude Code (self-gate), Codex |

Any trigger firing: REJECTED, trigger cited by number, sender reissues a full new turn. No conditional approval. No "approve if fixed."

---

## §7 Relationship to Backend Grounding Conformance Standard

This Standard is additive, Vault-Theo-frontend-only, and parallel to `governance/THEO_GROUNDING_CONFORMANCE_STANDARD.md`. It does not supersede, modify, or relax any backend requirement. Where a frontend turn cites a backend authority (Theo API Spec, Theo Azure Postgres Schema, Theo Tool Manifest), that document governs its own contents; this Standard governs how the read is recorded in the GCR.

---

## §8 Currency Anchor Verification Detail

Default form:

```
first-20: "<exactly 20 whitespace-separated tokens from the start of the cited region>"
last-20:  "<exactly 20 whitespace-separated tokens from the end of the cited region>"
```

Both snippets MUST be recoverable by the reviewer via Grep/Read against HEAD. If the file moved/renamed since the read, the GCR is invalid and the turn MUST be reissued. Fallback (blob SHA): permitted only when the cited region is fewer than 40 tokens or the clause is structural; the SHA MUST be obtained by a tool call this turn.

---

## §9 Enforcement Responsibilities

- **Claude Code** enforces this Standard against its own output before emission, and against every inbound Codex message it responds to.
- **Codex** enforces this Standard against every inbound Claude Code plan or package as a hard gate, and against its own output before emission.
- **ChatGPT** is out of the formal frontend pipeline; no ChatGPT artifact is acceptable as input to any frontend pipeline gate, and Codex MUST NOT condition approval/rejection on ChatGPT advisory content.
- **Walter** is not bound by this Standard in his own messages and is the sole authority who may grant exemptions (explicit, scoped, dated, recorded).

---

## §10 Adoption and Operational Note

Adoption is immediate on issuance. No grandfathering. No partial compliance.

`CLAUDE.local.md` is local-only to the Claude Code clone, gitignored, and outside Codex's editable governance document set. Codex MUST NOT edit or create `CLAUDE.local.md`.
