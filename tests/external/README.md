# nu-html-checker Compatibility Benchmark

Runs [markuplint](https://markuplint.dev/) against the [nu-html-checker](https://github.com/validator/validator) (validator.w3.org) test suite to measure HTML validation coverage.

## Setup

The nu-validator test suite is included as a git submodule. It is **not** fetched by default.

```bash
# Fetch the submodule (first time)
git submodule update --init tests/external/validator

# Update to the latest nu-validator tests
git submodule update --remote tests/external/validator
```

## Run

### Generate a Markdown report

```bash
node --experimental-strip-types tests/external/nu-validator-report.ts
```

Produces `tests/external/nu-validator-report.md` (git-ignored).

### Run as vitest (CI-style pass/fail)

```bash
npx vitest run --config vitest.nu-validator.config.ts
```

## Test Categories

| # | Category | Source directory | markuplint rules | Description |
|---|----------|----------------|-----------------|-------------|
| 1 | Content Model | `html/elements/model-*` | All | Child element placement per HTML content model |
| 2 | Deprecated Elements | `html/obsolete/` | `deprecated-element` | Obsolete elements (e.g., `<center>`, `<font>`) |
| 3 | Required Attributes | `html/assertions/*missing*` | `required-attr` | Missing required attributes (e.g., `img[alt]`) |
| 4 | Invalid Attributes | `html/elements/` (non-model) | All | Attribute existence and value validation |
| 5 | Global Attributes | `html/attributes/` | All | Global attribute validation (e.g., `lang`, `class`) |
| 6 | ID Duplication | `html/assertions/*duplicate-id*` | `id-duplication` | Duplicate `id` attribute values |
| 7 | ARIA | `html-aria/` | All | WAI-ARIA roles, states, and properties |
| 8 | Assertions | `html/assertions/` (other) | All | Cross-element constraints not covered above |
| 9 | Data Types | `html/datatypes/` | All | Attribute value type validation (color, date, URL, etc.) |

## nu-validator Test File Convention

Test expectations are encoded in the filename:

| Pattern | Meaning | Benchmark behavior |
|---------|---------|-------------------|
| `*-novalid.html` | nu-validator expects an **error** | markuplint must report >= 1 violation |
| `*-isvalid.html` | nu-validator expects **no error** | markuplint must report 0 violations |
| `*-haswarn.html` | nu-validator expects a **warning** | **Skipped** (markuplint has no warn/info distinction) |
| `*-hasinfo.html` | nu-validator expects an **info** message | **Skipped** (markuplint has no warn/info distinction) |
| Other | Treated as **valid** | markuplint must report 0 violations |

Expected error messages are recorded in `validator/tests/messages.json`.

## Reading the Report

The generated report contains:

- **Summary** — Pass/fail rates per category
- **Missed Errors** — Files where nu-validator expects an error but markuplint found none, categorized by reason:
  - *Bad value*: Attribute value type checks (URLs, colors, dates) — the largest gap
  - *Forbidden code point*: Unicode control characters
  - *Must-not constraint*: Complex cross-element rules
- **Parse Errors** — Valid files that markuplint's parser could not handle (separated from false positives)
- **False Positives** — Files nu-validator considers valid but markuplint flags, grouped by rule
- **Content Model Failures** — Detailed breakdown of content model test results

## File Structure

```
tests/external/
├── validator/                  ← git submodule (validator/validator)
├── nu-validator-utils.ts       ← Shared config and helpers
├── nu-validator-report.ts      ← Report generator script
├── nu-validator.spec.ts        ← Vitest test suite
├── nu-validator-report.md      ← Generated report (git-ignored)
└── README.md                   ← This file
```

## Maintenance

- **Adding a new markuplint rule to the benchmark**: Update `allRulesConfig` in `nu-validator-utils.ts` and add a test category in both `nu-validator-report.ts` and `nu-validator.spec.ts`.
- **nu-validator message format changes**: Update the pattern classification in `formatReport()` inside `nu-validator-report.ts`.
