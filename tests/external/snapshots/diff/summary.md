# nu-validator Benchmark Summary

- generated: 2026-08-26T07:28:12.263Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:210bbc353b23ba1b1ae65247c156a006afb4ba84703ba1bbf7c41d2080559445`
- markuplint: `5.0.0-rc.4`
- node: `26.6.0`

## Totals

- files: **5442**
- match-error: **3506** (both tools flagged)
- match-clean: **763** (neither flagged)
- nu-only: **2** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **29** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **78.4%**
- excluded-ids: 9 entries, 1 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 65.5% | 180 | 331 | 267 | 2 | 0 |
| assertions | 40 | 97.5% | 39 | 0 | 1 | 0 | 0 |
| attribute-errors | 3086 | 96.4% | 2765 | 211 | 84 | 0 | 26 |
| content-model | 98 | 95.9% | 50 | 44 | 4 | 0 | 0 |
| data-types | 56 | 96.4% | 49 | 5 | 1 | 0 | 1 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 57 | 84.2% | 29 | 19 | 9 | 0 | 0 |
| no-duplicate-id | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| require-attr | 5 | 100.0% | 5 | 0 | 0 | 0 | 0 |
| uncategorized | 1307 | 40.6% | 377 | 153 | 775 | 0 | 2 |

## Informational: ml-only

**1142** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| no-unknown-attr | 666 |
| no-invalid-attr-value | 476 |
| permitted-contents | 444 |
| no-deprecated-attr | 354 |
| require-accessible-name | 188 |
| role-supports-aria-prop | 112 |
| @markuplint/ml-core | 75 |
| require-owned-elements | 47 |
| link-types | 34 |
| require-attr | 22 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

