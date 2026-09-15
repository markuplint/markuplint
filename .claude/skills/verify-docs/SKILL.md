---
name: verify-docs
metadata:
  internal: true
description: >
  Verify documentation claims (README, JSDoc) in spec-heavy packages —
  @markuplint/types (attribute value types; WHATWG/W3C/RFC/CSS/SVG grammars) and
  @markuplint/ml-spec (HTML/WAI-ARIA algorithms, spec resolution) — against the
  live web standards and the actual implementation. Use when auditing or updating
  README/JSDoc in these packages, or when a doc claim (spec URL, ABNF, numeric
  count, algorithm description) is suspected stale. Trigger keywords: verify docs,
  doc audit, spec citation check, ABNF check, README accuracy, JSDoc accuracy.
---

# verify-docs

Verify that documentation claims are accurate against the official standards and the actual implementation.

Spec domains by package:

- `@markuplint/types` — WHATWG (HTML microsyntaxes, autofill, link types, MIME sniffing), W3C (Permissions Policy, CSS Values and Units), IETF RFCs (BCP 47, etc.), SVG attribute grammars
- `@markuplint/ml-spec` — WAI-ARIA, HTML-AAM, SVG-AAM, AccName, HTML Living Standard

## Method

1. Extract every externally checkable claim: spec URLs, ABNF grammar blocks, RFC numbers, numeric claims (e.g., "46 names", "13 void elements"), regex patterns claimed to match a spec definition, CSS value definition syntax references, ARIA algorithm descriptions (role computation, presentational conflict resolution), implicit-role mappings, accessibility-tree inclusion rules, content-model category claims, and "implements X" statements.
2. Group claims by spec domain and verify each domain in a parallel subagent: fetch the authoritative spec via WebSearch, compare claim vs spec vs source code, and assign a verdict — PASS (accurate), FAIL (inaccurate), WARN (technically correct but misleading or incomplete).
3. Report a consolidated verdict table. For each FAIL, produce a concrete correction: file, line, current text, corrected text, reason. For WARN, an advisory suggestion only.

## Judgment rules

- Source code is the source of truth for implementation behavior; the specification is the source of truth for what the standard defines. If the code intentionally deviates from the spec, the docs must state the deviation explicitly.
- If the CODE does not match the spec, that is a code issue, not a docs issue — report it separately; never "fix" the docs to describe a bug as intended.
- Numeric claims must be exact: count the arrays, enum values, union members, and Set entries in source.
- ABNF and regex patterns presented as spec quotes must be character-for-character accurate.
- Algorithm descriptions must match the actual step order, condition checks, and branching.
- Always fetch the live spec via WebSearch — never rely on cached knowledge.
