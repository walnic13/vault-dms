# Vault DMS Governance — DMS Snapshot Storage Exception — Role-C authority amendment (Pass 4, documentation-update)

Walter authorized (2026-07-19) a **scoped browser-storage exception** for the productionised DMS remote, so its live-mirror snapshot (and the future Graph delta cursor) may persist to `sessionStorage` for instant-paint-across-reload. The FE standard previously hard-gated all `localStorage`/`sessionStorage` (a Phase-1A "persistence is 1B" guardrail; Codex T26). This amendment adds a named, narrow exception and **sweeps every mention** of the prohibition across the three authority docs so no contradictory authority remains (per the amend-cross-cutting-authority discipline). Substance authorized by Walter; this package lands the doc edits for Codex review. No code in this package.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Pass 4 — Documentation-update (Role-C authority amendment)
Turn issued against HEAD: 99c13193d15db16538b86d19128d159bbe6d5410 (development; the commit that lands this amendment + package; grounding reads were against parent 79e7e8a)
Grounding Mode: Full Baseline Grounding
Pass: Pass 4
Sub-phase Track: N/A
```

Current-turn grounding: Read the three governed authority docs' storage-prohibition sites — `governance/CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md` §6.3 (the authority source, blob `b9c0e11`), `governance/CODEX_THEO_FRONTEND_REVIEW_STANDARD.md` §2.3 (blob `e2b7e0b`), `governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md` F-P6 / FM4 / T26 (blob `dc86350`) — and swept all five mention-sites.

## Rule Anchor Table

| Source doc (absolute path) | Clause id | Verbatim clause text | Applied in output at |
|-------------------|-----------|----------------------|----------------------|
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md | §6.3 | "No browser storage" | The authority-source rule amended to add the named exception |
| c:/Users/WalterMansfield/Vault Group LLP/Innovate - Documents/Tax Workpapers Project/2026/vault-dms/governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | T26 | "each contrary to 1A handover §6 guardrails" | T26 amended so the authorized exception does not trigger |

## §1 — Authorization
Walter, 2026-07-19 (this session), answering the storage-gate decision: **"Authorize scoped client storage."** Scope granted: the DMS remote (`vault-dms`) may use `sessionStorage` for its non-sensitive browse snapshot + delta cursor only.

## §2 — The exception (as landed in Governor §6.3)
`sessionStorage` ONLY (per-tab; cleared on tab close); persists SharePoint site/folder listing **metadata** (names, item ids, web_url/web_dav_url) + the expanded-node set + the future Graph delta cursor; **never** file content, access tokens, secrets, or credentials; employees-only origin; ALWAYS paired with revalidation (instant-paint seed, never authoritative-stale); cleared by `clearDmsCache()`; all writes try/guarded. All other browser storage, and any other repo/surface, remains prohibited.

## §3 — Sweep (all five mention-sites, consistent)
| # | Doc | Site | Edit |
|---|-----|------|------|
| 1 | CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md | §6.3 "No browser storage" | Renamed "No browser storage — scoped exception"; full exception text added (authority source). |
| 2 | CODEX_THEO_FRONTEND_REVIEW_STANDARD.md | §2.3 surface-fidelity guardrails | "no localStorage/sessionStorage" → "… except the Walter-authorized DMS Snapshot Storage Exception … which is NOT a trigger". |
| 3 | THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | F-P6 | "no localStorage/sessionStorage (1A handover §2.5)" → "… except the DMS Snapshot Storage Exception (Governor §6.3 …)". |
| 4 | THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | FM4 | "no-browser-storage guardrails" → "… (browser-storage subject to the DMS Snapshot Storage Exception, Governor §6.3)". |
| 5 | THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md | T26 | Added the parenthetical that the authorized exception "does NOT trigger T26". |

Post-edit doc blobs recorded by the landing commit. No prohibition mention left unqualified (verified via per-line check).

## §4 — Boundary / provenance
Authority-doc documentation edit only; no code, no runtime, no contract change. The Governor Standard remains the authority source; the Conformance + Codex Review standards reference it. Enables the paired **L1 sessionStorage** VEP (`…-SnapshotPersistence-L1-…`) and the future **L2 delta cursor** persistence. Reviewer: Codex.

## Requested action
Codex Pass-2 review of this authority amendment (consistency of the sweep; scope faithful to Walter's authorization). On APPROVED it is authoritative and the resubmitted L1 VEP may cite Governor §6.3.
