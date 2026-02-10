---
description: Verify documentation claims against web standards and source code
---

# verify-docs

Verify that documentation claims in `@markuplint/ml-spec` are accurate by cross-referencing them against official web standards (WAI-ARIA, HTML-AAM, SVG-AAM, AccName, HTML Living Standard) and the actual source code implementation.

## Input

`$ARGUMENTS` specifies the target: a package name (e.g., `@markuplint/ml-spec`) or a specific documentation file path. If omitted, defaults to all `docs/*.md` files in `packages/@markuplint/ml-spec/`.

## Phase 1: Discovery

Read all target documentation files and extract every claim that references an external specification. Look for:

- Specification URLs (e.g., `https://www.w3.org/TR/wai-aria-1.2/...`, `https://html.spec.whatwg.org/...`)
- WAI-ARIA algorithm descriptions (role computation, presentational conflict resolution)
- HTML-AAM implicit role mappings
- SVG-AAM accessibility tree inclusion rules
- AccName computation references
- Content model category claims (element counts, category membership)
- Specific numeric claims (e.g., "13 void elements", "11 error codes")
- Function behavior claims ("returns X when Y")
- Statements like "Implements the X spec" or "according to Y specification"

Collect each claim as a structured item:

```
{ file, line, claim, specDomain, specURL }
```

## Phase 2: Categorize

Group extracted claims by specification domain:

| Domain        | Examples                                                                       |
| ------------- | ------------------------------------------------------------------------------ |
| WAI-ARIA      | Role computation, presentational roles conflict resolution, accessibility tree |
| HTML-AAM      | Implicit role mappings, permitted roles, ARIA property defaults                |
| AccName       | Accessible name computation algorithm, placeholder fallback                    |
| SVG-AAM       | SVG element inclusion rules, graphics ARIA roles                               |
| HTML Standard | Content models, void elements, interactive content, palpable content           |

## Phase 3: Parallel Verification

For each domain group, launch a parallel agent using the **Task tool** with `subagent_type: "general-purpose"`. Each agent:

1. **Searches the official specification** using WebSearch to find the authoritative definition
2. **Compares the documentation claim** against the spec definition
3. **Reads the corresponding source code** to confirm the implementation matches
4. **Assigns a verdict** to each claim:
   - **PASS** — Documentation accurately describes the spec and matches the implementation
   - **FAIL** — Documentation is inaccurate (wrong number, incorrect algorithm, misleading description)
   - **WARN** — Documentation is technically correct but potentially misleading or incomplete

Each agent returns its results as a structured list:

```
| # | File:Line | Claim | Spec Source | Verdict | Notes |
```

## Phase 4: Report

Collect results from all parallel agents and produce a consolidated PASS/FAIL table:

```markdown
## Verification Report

| #   | Domain        | File:Line              | Claim Summary                 | Verdict | Notes                                  |
| --- | ------------- | ---------------------- | ----------------------------- | ------- | -------------------------------------- |
| 1   | WAI-ARIA      | aria-algorithms.md:125 | 11 RoleComputationError codes | PASS    | Matches source types/index.ts          |
| 2   | HTML Standard | html-algorithms.md:45  | 13 void elements              | PASS    | Matches is-void-element.ts Set         |
| 3   | HTML-AAM      | aria-algorithms.md:200 | getImplicitRole returns false | WARN    | Returns ImplicitRole (false or string) |
| ... | ...           | ...                    | ...                           | ...     | ...                                    |

**Summary:** X PASS / Y FAIL / Z WARN out of N total claims
```

## Phase 5: Correction Plan

For every FAIL item, produce a concrete correction instruction:

```markdown
### Correction 1: [Brief description]

- **File:** `path/to/file.md`
- **Line:** 125
- **Current:** `(11 error codes)`
- **Corrected:** `(12 error codes)`
- **Reason:** Source code `types/index.ts` contains 12 entries in `RoleComputationError` union
```

For WARN items, produce an advisory note with a suggested improvement (not mandatory).

## Rules

1. **Source code is the source of truth for implementation behavior.** If the docs say "implements X" but the code does something slightly different, the docs should be corrected to accurately describe what the code does.
2. **Specification is the source of truth for what the standard defines.** If the code intentionally deviates from the spec, the docs should note the deviation explicitly.
3. **Code bugs are a separate category.** If the code itself doesn't match the spec, flag it as a code issue (not a documentation issue) and note it separately.
4. **Numeric claims must be exact.** Count arrays, enum values, union members, and Set entries in the source code to verify numbers stated in documentation.
5. **Algorithm descriptions must match the actual code flow.** Verify that documented step orders, condition checks, and branching logic correspond to the implementation.
6. **Use WebSearch for spec verification.** Always fetch the latest version of the referenced specification — do not rely on cached knowledge.

## Hardcoded Test Data

The following test files contain hardcoded spec data that must stay in sync
with `@markuplint/html-spec`:

| Test file                                             | Data                                                       | Trigger                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `src/algorithm/aria/get-permitted-roles-spec.spec.ts` | `permittedRoles` arrays for img, button, input, form, etc. | `permittedRoles` changes in `html-spec/src/spec.*.json` |

When `@markuplint/html-spec` ARIA mappings change, update these arrays.
The arrays are version-specific — update only the correct version's expectations
(e.g., `'1.2'` tests but not `'1.1'` tests for newly added roles).
