---
description: Verify documentation claims against web standards and source code
---

# verify-docs

Verify that documentation claims in `@markuplint/types` are accurate by cross-referencing them against official web standards (WHATWG, W3C, RFC, CSS, SVG) and the actual source code implementation.

## Input

`$ARGUMENTS` specifies the target: a package name (e.g., `@markuplint/types`) or a specific documentation file path. If omitted, defaults to all `docs/*.md` files in `packages/@markuplint/types/`.

## Phase 1: Discovery

Read all target documentation files and extract every claim that references an external specification. Look for:

- Specification URLs (e.g., `https://html.spec.whatwg.org/...`, `https://www.w3.org/TR/...`)
- ABNF grammar blocks
- RFC numbers (e.g., RFC 5646, BCP 47)
- Specific numeric claims (e.g., "46 names", "8 reserved names")
- Regex patterns claimed to match a spec definition
- CSS value definition syntax references
- Statements like "Implements the X spec" or "according to Y specification"

Collect each claim as a structured item:

```
{ file, line, claim, specDomain, specURL }
```

## Phase 2: Categorize

Group extracted claims by specification domain:

| Domain | Examples                                                                |
| ------ | ----------------------------------------------------------------------- |
| WHATWG | HTML Living Standard microsyntaxes, autofill, link types, MIME sniffing |
| W3C    | Permissions Policy, CSS Values and Units                                |
| RFC    | BCP 47, other IETF standards                                            |
| CSS    | css-tree fork API, CSS value definition syntax                          |
| SVG    | viewBox, preserveAspectRatio, transform unitless values                 |

## Phase 3: Parallel Verification

For each domain group, launch a parallel agent using the **Task tool** with `subagent_type: "general-purpose"`. Each agent:

1. **Searches the official specification** using WebSearch to find the authoritative definition
2. **Compares the documentation claim** against the spec definition
3. **Reads the corresponding source code** to confirm the implementation matches
4. **Assigns a verdict** to each claim:
   - **PASS** — Documentation accurately describes the spec and matches the implementation
   - **FAIL** — Documentation is inaccurate (wrong number, incorrect grammar, misleading description)
   - **WARN** — Documentation is technically correct but potentially misleading or incomplete

Each agent returns its results as a structured list:

```
| # | File:Line | Claim | Spec Source | Verdict | Notes |
```

## Phase 4: Report

Collect results from all parallel agents and produce a consolidated PASS/FAIL table:

```markdown
## Verification Report

| #   | Domain | File:Line         | Claim Summary           | Verdict | Notes                                    |
| --- | ------ | ----------------- | ----------------------- | ------- | ---------------------------------------- |
| 1   | WHATWG | validators.md:214 | 46 autofill field names | FAIL    | Code has 44                              |
| 2   | W3C    | validators.md:315 | ABNF grammar            | WARN    | allow-list optionality differs from spec |
| ... | ...    | ...               | ...                     | ...     | ...                                      |

**Summary:** X PASS / Y FAIL / Z WARN out of N total claims
```

## Phase 5: Correction Plan

For every FAIL item, produce a concrete correction instruction:

```markdown
### Correction 1: [Brief description]

- **File:** `path/to/file.md`
- **Line:** 214
- **Current:** `(46 names)`
- **Corrected:** `(44 names)`
- **Reason:** Source code `check-autocomplete.ts` contains 44 entries in `autofillFieldNames` array
```

For WARN items, produce an advisory note with a suggested improvement (not mandatory).

## Rules

1. **Source code is the source of truth for implementation behavior.** If the docs say "implements X" but the code does something slightly different, the docs should be corrected to accurately describe what the code does.
2. **Specification is the source of truth for what the standard defines.** If the code intentionally deviates from the spec, the docs should note the deviation explicitly.
3. **Code bugs are a separate category.** If the code itself doesn't match the spec, flag it as a code issue (not a documentation issue) and note it separately.
4. **Numeric claims must be exact.** Count arrays, enum values, and lists in the source code to verify numbers stated in documentation.
5. **ABNF and regex patterns must be character-for-character accurate** when presented as quotes from a specification.
6. **Use WebSearch for spec verification.** Always fetch the latest version of the referenced specification — do not rely on cached knowledge.
