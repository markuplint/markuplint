# nu-validator Benchmark Summary

- generated: 2026-10-29T06:36:47.101Z
- submodule: `f84563f28898457af3cb76ec8c820cf17a2174c4`
- nu-validator: `ghcr.io/validator/validator@sha256:8f21030474e68e06905cfa801b37376e99c0e37867c653c5b6cd7e2dcaf3f503`
- markuplint: `5.4.0`
- node: `26.6.0`

## Totals

- files: **5596**
- match-error: **3622** (both tools flagged)
- match-clean: **804** (neither flagged)
- nu-only: **14** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **29** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **79.1%**
- excluded-ids: 9 entries, 1 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 810 | 64.3% | 179 | 342 | 275 | 14 | 0 |
| assertions | 40 | 97.5% | 39 | 0 | 1 | 0 | 0 |
| attribute-errors | 3193 | 97.3% | 2873 | 233 | 61 | 0 | 26 |
| content-model | 98 | 95.9% | 50 | 44 | 4 | 0 | 0 |
| data-types | 56 | 96.4% | 49 | 5 | 1 | 0 | 1 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 58 | 84.5% | 29 | 20 | 9 | 0 | 0 |
| no-duplicate-id | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| require-attr | 5 | 100.0% | 5 | 0 | 0 | 0 | 0 |
| uncategorized | 1323 | 41.3% | 386 | 160 | 775 | 0 | 2 |

## Informational: ml-only

**1127** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| no-unknown-attr | 667 |
| no-invalid-attr-value | 447 |
| permitted-contents | 445 |
| no-deprecated-attr | 354 |
| require-accessible-name | 194 |
| role-supports-aria-prop | 112 |
| @markuplint/ml-core | 75 |
| require-owned-elements | 47 |
| link-types | 34 |
| require-attr | 22 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

