---
description: Verify documentation claims against web standards and source code
---

# verify-docs

Verify that documentation claims in `@markuplint/types` (README, JSDoc) are accurate against the official standards — WHATWG (HTML microsyntaxes, autofill, link types, MIME sniffing), W3C (Permissions Policy, CSS Values and Units), IETF RFCs (BCP 47, etc.), and SVG attribute grammars — and the actual implementation.

## Method

1. Extract every externally checkable claim: spec URLs, ABNF grammar blocks, RFC numbers, numeric claims (e.g., "46 names"), regex patterns claimed to match a spec definition, CSS value definition syntax references, and "implements X" statements.
2. Group claims by spec domain (WHATWG / W3C / RFC / CSS / SVG) and verify each domain in a parallel subagent: fetch the authoritative spec via WebSearch, compare claim vs spec vs source code, and assign a verdict — PASS (accurate), FAIL (inaccurate), WARN (technically correct but misleading or incomplete).
3. Report a consolidated verdict table. For each FAIL, produce a concrete correction: file, line, current text, corrected text, reason. For WARN, an advisory suggestion only.

## Judgment rules

- Source code is the source of truth for implementation behavior; the specification is the source of truth for what the standard defines. If the code intentionally deviates from the spec, the docs must state the deviation explicitly.
- If the CODE does not match the spec, that is a code issue, not a docs issue — report it separately; never "fix" the docs to describe a bug as intended.
- Numeric claims must be exact: count the arrays, enum values, and lists in source.
- ABNF and regex patterns presented as spec quotes must be character-for-character accurate.
- Always fetch the live spec via WebSearch — never rely on cached knowledge.
