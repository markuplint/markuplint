---
description: Verify @markuplint/ml-spec documentation claims (HTML/WAI-ARIA algorithms, spec resolution) against web standards and source code
---

# verify-docs

Verify that documentation claims in `@markuplint/ml-spec` (README, JSDoc) are accurate against the official standards — WAI-ARIA, HTML-AAM, SVG-AAM, AccName, HTML Living Standard — and the actual implementation.

## Method

1. Extract every externally checkable claim: spec URLs, ARIA algorithm descriptions (role computation, presentational conflict resolution), implicit-role mappings, accessibility-tree inclusion rules, content-model category claims, numeric claims (e.g., "13 void elements", "11 error codes"), and "implements X" statements.
2. Group claims by spec domain (WAI-ARIA / HTML-AAM / AccName / SVG-AAM / HTML Standard) and verify each domain in a parallel subagent: fetch the authoritative spec via WebSearch, compare claim vs spec vs source code, and assign a verdict — PASS (accurate), FAIL (inaccurate), WARN (technically correct but misleading or incomplete).
3. Report a consolidated verdict table. For each FAIL, produce a concrete correction: file, line, current text, corrected text, reason. For WARN, an advisory suggestion only.

## Judgment rules

- Source code is the source of truth for implementation behavior; the specification is the source of truth for what the standard defines. If the code intentionally deviates from the spec, the docs must state the deviation explicitly.
- If the CODE does not match the spec, that is a code issue, not a docs issue — report it separately; never "fix" the docs to describe a bug as intended.
- Numeric claims must be exact: count the arrays, enum values, union members, and Set entries in source.
- Algorithm descriptions must match the actual step order, condition checks, and branching.
- Always fetch the live spec via WebSearch — never rely on cached knowledge.
