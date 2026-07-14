#!/usr/bin/env node
// Mechanical linter for Vault DMS backend Claude Code submissions.
// Zero-dependency Node ESM. Validates a submission text file against VAULT DMS Grounding Conformance Standard §3/§4/§4A/§5/§8.
//
// Usage:
//   node tools/lint_microstep_submission.mjs <submission.md> [--repo-root <path>]
//
// Exit codes:
//   0 = PASS
//   1 = FAIL (violations printed)
//   2 = USAGE error
//
// Checks:
//   C1  GCR block present with required fields (Turn Type, Grounding Mode, Pass, Sub-phase Track).
//   C2  Grounding Mode is one of {Full Baseline Grounding, Targeted Current-Turn Grounding, Delta Grounding}.
//   C3  Pass identity is one of {Pass 1, Pass 3, Pass 4}.
//   C4  Sub-phase track is one of {P1-P8, I1-I6, E1-E3, N/A}.
//   C5  Rule Anchor Table present.
//   C6  Each Rule Anchor quote is a literal substring of the cited file at HEAD.
//   C7  Each cited file path resolves against the repo root.
//   C8  Currency anchors (first-20 and last-20 tokens) for each cited file are literal substrings of HEAD content.
//   C9  No forbidden phrases that indicate fabrication ("from memory", "as previously noted", "per earlier turn").
//   C10 Sub-phase completeness: the declared §4A sub-phase track's required authority sections are anchored.
//   C11 Pass 1 VEP structural obligations: Architecture & boundary reconciliation + Gap Register / NO-GAPS.
//   C12 No prohibited psql meta-commands in fenced ```sql blocks (Vault DMS is stateless; SQL blocks are not expected).

import { readFileSync, existsSync } from "node:fs";
import { resolve, join, isAbsolute } from "node:path";

const ALLOWED_GROUNDING_MODES = new Set([
  "Full Baseline Grounding",
  "Targeted Current-Turn Grounding",
  "Delta Grounding",
]);

const ALLOWED_PASSES = new Set(["Pass 1", "Pass 3", "Pass 4"]);

const SUBPHASE_PATTERNS = [
  /^P[1-8]$/,
  /^I[1-6]$/,
  /^E[1-3]$/,
  /^N\/A$/,
];

// Document-alias map: resolves informal §4A doc names to canonical repo-root file paths.
// Longest-alias-first match is applied by the parser.
const DOC_ALIASES = [
  ["Claude Code Vault DMS Governor Standard", "governance/CLAUDE_CODE_VAULT_DMS_GOVERNOR_STANDARD.md"],
  ["Vault DMS Execution Orchestration Standard", "governance/VAULT_DMS_EXECUTION_ORCHESTRATION_STANDARD.md"],
  ["Vault DMS Grounding Conformance Standard", "governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md"],
  ["Vault DMS Golden Handler Standard", "governance/VAULT_DMS_GOLDEN_HANDLER_STANDARD.md"],
  ["Vault DMS Architecture and Structure", "governance/VAULT_DMS_ARCHITECTURE_AND_STRUCTURE.md"],
  ["Codex Vault DMS Review Standard", "governance/CODEX_VAULT_DMS_REVIEW_STANDARD.md"],
  ["Vault DMS Azure Postgres Schema", "spec/VAULT_DMS_AZURE_POSTGRES_SCHEMA.md"],
  ["Vault DMS API Spec", "spec/VAULT_DMS_API_SPEC.md"],
  ["this Standard", "governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md"],
  // FE-RETARGETED (2026-07-14): vault-dms adopts the Theo FE governance STANDARDS verbatim
  // (governance/*FRONTEND* + Golden Component Pack) for the dmsApp/DmsBrowser remote; its FE plan
  // authority is vault-dms's own spec/VAULT_DMS_FRONTEND_PLAN.md. Both the Theo-named turn-type
  // matrix keys and DMS-named keys resolve to the same authority so an F-track VEP lints clean.
  ["Theo Phase 1A Frontend Plan", "spec/VAULT_DMS_FRONTEND_PLAN.md"],
  ["Vault DMS Frontend Plan", "spec/VAULT_DMS_FRONTEND_PLAN.md"],
  ["Claude Code Theo Frontend Governor Standard", "governance/CLAUDE_CODE_THEO_FRONTEND_GOVERNOR_STANDARD.md"],
  ["Codex Theo Frontend Review Standard", "governance/CODEX_THEO_FRONTEND_REVIEW_STANDARD.md"],
  ["Theo Golden Component Pack Standard", "governance/THEO_GOLDEN_COMPONENT_PACK_STANDARD.md"],
  ["Theo Frontend Grounding Conformance Standard", "governance/THEO_FRONTEND_GROUNDING_CONFORMANCE_STANDARD.md"],
];

function resolveDocAlias(chunk) {
  const sorted = [...DOC_ALIASES].sort((a, b) => b[0].length - a[0].length);
  for (const [alias, file] of sorted) {
    if (chunk.includes(alias)) return file;
  }
  return null;
}

// Parse "§9C", "§11.1A", and ranges "§11.1–§11.3" / "§11.1-§11.3".
function extractSections(chunk) {
  const sections = new Set();
  const rangeRe = /§([\d]+(?:\.[\d]+)*[A-Z]?)\s*[–-]\s*§([\d]+(?:\.[\d]+)*[A-Z]?)/g;
  let rm;
  const consumed = [];
  while ((rm = rangeRe.exec(chunk)) !== null) {
    const a = rm[1], b = rm[2];
    const ap = a.split("."), bp = b.split(".");
    if (ap.length === 2 && bp.length === 2 && ap[0] === bp[0] && /^\d+$/.test(ap[1]) && /^\d+$/.test(bp[1])) {
      const lo = parseInt(ap[1], 10), hi = parseInt(bp[1], 10);
      for (let i = lo; i <= hi; i++) sections.add(`§${ap[0]}.${i}`);
    } else {
      sections.add(`§${a}`);
      sections.add(`§${b}`);
    }
    consumed.push(rm[0]);
  }
  let remaining = chunk;
  for (const c of consumed) remaining = remaining.split(c).join("");
  const sectRe = /§[\d]+(?:\.[\d]+)*[A-Z]?/g;
  let sm;
  while ((sm = sectRe.exec(remaining)) !== null) sections.add(sm[0]);
  return [...sections];
}

// Parse governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md §4A at runtime.
// Returns map { P1: [{docFile, sections:[...]}, ...], ... }.
// Each entry is an AND-required group: for each (docFile, section) the Rule Anchor Table
// must contain at least one anchor citing docFile and including section in its section field
// (when sections is non-empty; otherwise any anchor to docFile satisfies).
function loadSubphaseRequirements(repoRoot) {
  const conf = loadFile(repoRoot, "governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md");
  if (!conf) return null;
  const sectionStart = conf.search(/^###\s+§4A\.1/m);
  if (sectionStart < 0) return null;
  const sectionEnd = conf.search(/^###\s+§4A\.4/m);
  const body = conf.slice(sectionStart, sectionEnd >= 0 ? sectionEnd : undefined);
  const rowRe = /^\|\s*(P[1-8]|I[1-6]|E[1-3])\s*\|[^|\n]*\|[^|\n]*\|\s*([^\n|][^\n]*?)\s*\|\s*$/gm;
  const map = {};
  let m;
  while ((m = rowRe.exec(body)) !== null) {
    const id = m[1];
    const required = m[2];
    const chunks = required.split(";").map((s) => s.trim()).filter(Boolean);
    const groups = [];
    for (const chunk of chunks) {
      const docFile = resolveDocAlias(chunk);
      if (!docFile) continue;
      const sections = extractSections(chunk);
      groups.push({ docFile, sections });
    }
    if (groups.length > 0) map[id] = groups;
  }
  return map;
}

function basename(p) {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1];
}

function anchorSatisfies(anchors, docFile, section) {
  const wantBase = basename(docFile).toLowerCase();
  const wantPath = docFile.replace(/\\/g, "/").toLowerCase();
  for (const a of anchors) {
    const af = a.file.replace(/\\/g, "/").toLowerCase();
    const fileHit = af === wantPath || basename(af) === wantBase || af.endsWith("/" + wantBase);
    if (!fileHit) continue;
    if (!section) return true;
    if (a.section.includes(section)) return true;
  }
  return false;
}

const FORBIDDEN_PHRASES = [
  "from memory",
  "as previously noted",
  "per earlier turn",
  "prior session",
  "already read above",
];

function parseArgs(argv) {
  const args = { submission: null, repoRoot: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo-root") args.repoRoot = argv[++i];
    else if (!args.submission) args.submission = a;
  }
  return args;
}

function die(code, msg) {
  process.stderr.write(msg + "\n");
  process.exit(code);
}

function tokenize(text) {
  return text.split(/\s+/).filter(Boolean);
}

function extractBlock(text, startHeader) {
  const re = new RegExp(`^\\s*#{1,6}?\\s*${startHeader}\\s*:?\\s*$`, "mi");
  const m = text.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^\s*#{1,6}\s+/m);
  return rest.slice(0, next >= 0 ? next : undefined);
}

function parseGcr(text) {
  const block = extractBlock(text, "Grounding Conformance Receipt");
  if (!block) return null;
  const field = (name) => {
    const m = block.match(new RegExp(`${name}\\s*:\\s*([^\\n]+)`, "i"));
    return m ? m[1].trim() : null;
  };
  return {
    turnType: field("Turn Type"),
    groundingMode: field("Grounding Mode"),
    pass: field("Pass"),
    subphaseTrack: field("Sub-phase Track") || field("Sub-phase"),
    raw: block,
  };
}

function parseRuleAnchors(text) {
  const block = extractBlock(text, "Rule Anchor Table");
  if (!block) return null;
  const rows = [];
  const rowRe = /^\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*"([^"]+)"\s*\|/gm;
  let m;
  while ((m = rowRe.exec(block)) !== null) {
    rows.push({ file: m[1].trim(), section: m[2].trim(), quote: m[3] });
  }
  return rows;
}

function parseCurrencyAnchors(text) {
  const block = extractBlock(text, "Currency Anchors");
  if (!block) return [];
  const rows = [];
  const rowRe = /^\s*\|\s*([^|]+?)\s*\|\s*first20:\s*"([^"]+)"\s*\|\s*last20:\s*"([^"]+)"\s*\|/gm;
  let m;
  while ((m = rowRe.exec(block)) !== null) {
    rows.push({ file: m[1].trim(), first20: m[2], last20: m[3] });
  }
  return rows;
}

function loadFile(repoRoot, relPath) {
  const full = isAbsolute(relPath) ? relPath : join(repoRoot, relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf8");
}

function check(text, repoRoot) {
  const violations = [];
  const fail = (id, msg) => violations.push({ id, msg });

  // C1–C4: GCR
  const gcr = parseGcr(text);
  if (!gcr) {
    fail("C1", "GCR block not found. Expected heading 'Grounding Conformance Receipt'.");
  } else {
    if (!gcr.turnType) fail("C1", "GCR missing 'Turn Type' field.");
    if (!gcr.groundingMode) fail("C1", "GCR missing 'Grounding Mode' field.");
    else if (!ALLOWED_GROUNDING_MODES.has(gcr.groundingMode))
      fail("C2", `Grounding Mode '${gcr.groundingMode}' is not one of {${[...ALLOWED_GROUNDING_MODES].join(", ")}}.`);
    if (!gcr.pass) fail("C1", "GCR missing 'Pass' field.");
    else if (!ALLOWED_PASSES.has(gcr.pass))
      fail("C3", `Pass '${gcr.pass}' is not one of {${[...ALLOWED_PASSES].join(", ")}}.`);
    if (!gcr.subphaseTrack) fail("C1", "GCR missing 'Sub-phase Track' field.");
    else if (!SUBPHASE_PATTERNS.some((re) => re.test(gcr.subphaseTrack)))
      fail("C4", `Sub-phase Track '${gcr.subphaseTrack}' is not a valid P/I/E row or N/A.`);
  }

  // C5–C7: Rule Anchor Table
  const anchors = parseRuleAnchors(text);
  if (anchors === null) {
    fail("C5", "Rule Anchor Table not found. Expected heading 'Rule Anchor Table' with markdown table rows of form | file | section | \"quote\" |.");
  } else if (anchors.length === 0) {
    fail("C5", "Rule Anchor Table present but contains zero rows.");
  } else {
    for (const [idx, row] of anchors.entries()) {
      const src = loadFile(repoRoot, row.file);
      if (src === null) {
        fail("C7", `Rule Anchor row ${idx + 1}: cited file '${row.file}' does not exist at repo root '${repoRoot}'.`);
        continue;
      }
      if (!src.includes(row.quote)) {
        fail("C6", `Rule Anchor row ${idx + 1}: quote is NOT a literal substring of '${row.file}' at HEAD. Quote: "${row.quote.slice(0, 80)}${row.quote.length > 80 ? "…" : ""}"`);
      }
    }
  }

  // C8: Currency anchors
  const currency = parseCurrencyAnchors(text);
  for (const [idx, row] of currency.entries()) {
    const src = loadFile(repoRoot, row.file);
    if (src === null) {
      fail("C7", `Currency Anchor row ${idx + 1}: cited file '${row.file}' does not exist.`);
      continue;
    }
    const toks = tokenize(src);
    const first20 = toks.slice(0, 20).join(" ");
    const last20 = toks.slice(-20).join(" ");
    if (!first20.includes(row.first20) && !row.first20.includes(first20.slice(0, Math.min(40, first20.length)))) {
      if (!src.includes(row.first20))
        fail("C8", `Currency Anchor row ${idx + 1}: first20 for '${row.file}' does not match HEAD.`);
    }
    if (!last20.includes(row.last20) && !row.last20.includes(last20.slice(-Math.min(40, last20.length)))) {
      if (!src.includes(row.last20))
        fail("C8", `Currency Anchor row ${idx + 1}: last20 for '${row.file}' does not match HEAD.`);
    }
  }

  // C10: sub-phase completeness at section granularity (§6 T25).
  // Requirements are derived at runtime from governance/VAULT_DMS_GROUNDING_CONFORMANCE_STANDARD.md §4A.1.
  if (gcr && gcr.subphaseTrack && anchors && anchors.length > 0) {
    const track = gcr.subphaseTrack.trim();
    const subphaseMap = loadSubphaseRequirements(repoRoot);
    if (subphaseMap && subphaseMap[track]) {
      for (const group of subphaseMap[track]) {
        if (group.sections.length === 0) {
          if (!anchorSatisfies(anchors, group.docFile, null)) {
            fail("C10", `Sub-phase ${track} requires an anchor citing ${group.docFile}. None found in Rule Anchor Table.`);
          }
        } else {
          for (const sec of group.sections) {
            if (!anchorSatisfies(anchors, group.docFile, sec)) {
              fail("C10", `Sub-phase ${track} requires an anchor citing ${group.docFile} ${sec}. Not found in Rule Anchor Table.`);
            }
          }
        }
      }
    }
  }

  // C11: Vault DMS Pass 1 VEP structural obligations — §4A.1 P2 Architecture & boundary
  // reconciliation; Gap Register / Gap Disclosure (Vault DMS Governor §8 / Conformance §4A.1 P2.5).
  // Applies when Pass is "Pass 1" and Sub-phase Track is a plan-authoring row (P1-P8).
  if (gcr && gcr.pass === "Pass 1" && gcr.subphaseTrack && /^P[1-8]$/.test(gcr.subphaseTrack.trim())) {
    const hasGapRegisterHeading = /\bGap Register\b/.test(text) || /\bGap Disclosure\b/.test(text);
    const hasNoGapsCert = /\bNO-GAPS\b/.test(text);
    if (!hasGapRegisterHeading && !hasNoGapsCert) {
      fail("C11", "Pass 1 VEP turn requires a 'Gap Register' / 'Gap Disclosure' subsection or a verbatim 'NO-GAPS' certification (Vault DMS Governor §8; Conformance §4A.1 P2.5). Neither found.");
    }
    const hasArchReconciliation = /Architecture (?:&|and) boundary reconciliation/i.test(text);
    if (!hasArchReconciliation) {
      fail("C11", "Pass 1 VEP turn requires an 'Architecture & boundary reconciliation' section (Conformance §4A.1 P2). Not found.");
    }
  }

  // C9: forbidden phrases
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      fail("C9", `Forbidden fabrication-indicator phrase present: "${phrase}".`);
    }
  }

  // C12: prohibited psql meta-commands in fenced ```sql blocks (Vault DMS is stateless; SQL not expected).
  const PSQL_META_RE = /^[ \t]*\\(echo|set|i|include|copy|gset|gx|timing|connect|c|q|watch|!)\b/m;
  const sqlFenceRe = /```sql\b[^\n]*\n([\s\S]*?)```/gi;
  let fm;
  while ((fm = sqlFenceRe.exec(text)) !== null) {
    const block = fm[1];
    const hit = block.match(PSQL_META_RE);
    if (hit) {
      fail("C12", `Prohibited psql meta-command "\\${hit[1]}" found in a fenced \`\`\`sql block. Governed SQL blocks must be plain PostgreSQL SQL; use SQL comments (-- label) for section labels. See Conformance §6 trigger 19 and §10 T26.`);
    }
  }

  return violations;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.submission) {
    die(2, "Usage: node tools/lint_microstep_submission.mjs <submission.md> [--repo-root <path>]");
  }
  const submissionPath = resolve(args.submission);
  if (!existsSync(submissionPath)) {
    die(2, `Submission file not found: ${submissionPath}`);
  }
  const text = readFileSync(submissionPath, "utf8");
  const repoRoot = resolve(args.repoRoot);
  const violations = check(text, repoRoot);
  if (violations.length === 0) {
    process.stdout.write(`PASS  ${submissionPath}\n`);
    process.exit(0);
  }
  process.stdout.write(`FAIL  ${submissionPath}\n`);
  for (const v of violations) {
    process.stdout.write(`  [${v.id}] ${v.msg}\n`);
  }
  process.exit(1);
}

main();
