# Vault DMS — API Spec §2.6 `dms_list_sites` — Pass-4 Role-C Verbatim-Edit Handoff

Controlling artifact for Codex Role-C execution. Directs Codex to add a new §2.6 contract entry for the deployed `dms_list_sites` handler. Only `spec/VAULT_DMS_API_SPEC.md` is edited.

## Grounding Conformance Receipt

```
Role: Claude Code
Turn Type: Documentation-update package
Turn issued against HEAD: <PKG_COMMIT_SHA> (development; the commit that first adds this handoff — T29 artifact-presence probe resolves here and at every later commit)
Grounding Mode: Targeted Current-Turn Grounding
Pass: Pass 4
Sub-phase Track: N/A
```

## Rule Anchor Table

| Source doc (path) | Clause id | Verbatim clause text | Applied in output at |
| ----------------- | --------- | -------------------- | -------------------- |
| governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md | §11 | "emits a Role-C Verbatim-Edit Handoff (exact before/after text for each edit) for Codex to execute" | This handoff (Claude authors; Codex executes the governed-doc edit) |
| governance/CODEX_VAULT_DMS_REVIEW_STANDARD.md | §4 | "Codex executes the directed edits **verbatim** (exact before/after text), edits only the named target documents" | Edit below is verbatim before/after; sole target `spec/VAULT_DMS_API_SPEC.md` |
| spec/VAULT_DMS_API_SPEC.md | §2.5 | "delegated Graph health check" | The new §2.6 is inserted immediately after the §2.5 block |
| spec/VAULT_DMS_API_SPEC.md | §3 | "No `dms_*` endpoint reads/writes `reporting_*` or `theo_*` tables" | The new §2.6 is inserted immediately before the §3 Boundary heading |

## Purpose

`dms_list_sites` is deployed to `vaultgpt-func-dms` and golden-curl-verified against real SharePoint (HTTP 200; **174** tenant sites enumerated with pagination; every row `{ site_id, site_name, web_url }`; name-sorted). Its contract was PROPOSED in the Pass-1 VEP but is not yet in the API Spec. This Role-C adds §2.6 with status **`deployed`**.

## Deployment evidence (basis for `deployed`)

| Handler | § | Deploy commit (package) | Golden-curl result |
|---------|---|-------------------------|--------------------|
| `dms_list_sites` | §2.6 | `419ac87` (VEP) | 200 — enumerated 174 tenant root sites (`3TA … AltaOne …`) with `site_id`/`site_name`/`web_url`, name-sorted, pagination folded transparently |

## Verbatim edit (Codex executes on `spec/VAULT_DMS_API_SPEC.md`)

Insert the new §2.6 subsection between the end of the §2.5 (`dms_probe_connection`) block and the `## §3 Boundary` heading. This is a single anchored replace:

- **BEFORE (locate this exact text):**

```
| Status | `proposed` |

---

## §3 Boundary
```

- **AFTER (replace with):**

```
| Status | `proposed` |

### §2.6 `dms_list_sites` — enumerate the entire DMS (all accessible sites)
| Field | Value |
|-------|-------|
| Route | `GET /api/dms_list_sites` (no parameters) |
| Purpose | Enumerate **all** SharePoint sites the caller can access (Graph `GET /v1.0/sites?search=*`, paginated via `@odata.nextLink`), filtered to the tenant host (`vaulttax.sharepoint.com`) root sites, each verified by a delegated `/sites/{id}/drive` probe. The tenant-wide root source for Origin's DMS mirror — replaces the curated-registry visibility model. |
| Success | `{ data: { sites: [ { site_id, site_name, web_url } ] } }` sorted by name then id. |
| Primary reference | Composite (Walter-authorized): `reporting_search_clients` (site-search + tenant/root filter + `/drive` probe) and `reporting_dms_tree` (`@odata.nextLink` pagination). **Delta:** no `q` parameter — the wildcard `*` enumerates; no registry union. Enumeration is delegated and security-trimmed to the caller. |
| Status | `deployed` |

---

## §3 Boundary
```

The BEFORE block occurs exactly once (only §2.5 precedes §3 Boundary). No other section is changed; §2.1–§2.5 remain unchanged.

## Complete file list

- `Codex Governance/Vault-DMS-API-Spec-2.6-dms_list_sites-Role-C/INDEX.md` (this handoff)
- Target of the edit (not in this package; edited in place): `spec/VAULT_DMS_API_SPEC.md`

## Mechanical lint

Command: `node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-API-Spec-2.6-dms_list_sites-Role-C/INDEX.md" --repo-root .`

PASS block (verbatim):

```
$ node tools/lint_microstep_submission.mjs "Codex Governance/Vault-DMS-API-Spec-2.6-dms_list_sites-Role-C/INDEX.md" --repo-root .
PASS  <repo-root>/Codex Governance/Vault-DMS-API-Spec-2.6-dms_list_sites-Role-C/INDEX.md
exit code: 0
```

Codex: re-run the command above from the vault-dms repo root; expect `PASS` and exit `0` (T24).

## Requested action

Execute the verbatim edit on `spec/VAULT_DMS_API_SPEC.md` (insert §2.6 with status `deployed`; §2.1–§2.5 unchanged), edit only that file, open your Role-C turn with a GCR per Conformance §4 (Codex | Role-C documentation-update execution row). Claude Code then verifies the landing is byte-faithful and commits it.
