# nu-validator Benchmark Summary

- generated: 2026-11-14T07:28:45.118Z
- submodule: `f84563f28898457af3cb76ec8c820cf17a2174c4`
- nu-validator: `ghcr.io/validator/validator@sha256:292cef9f3367a6d52447c617e65c94bca04cd3399abb37bd5d17c1c7d430525a`
- markuplint: `5.6.1`
- node: `26.13.1`

## Totals

- files: **5596**
- match-error: **3618** (both tools flagged)
- match-clean: **810** (neither flagged)
- nu-only: **0** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **46** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **79.1%**
- excluded-ids: 12 entries, 2 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 810 | 64.1% | 178 | 341 | 277 | 0 | 14 |
| assertions | 40 | 97.5% | 39 | 0 | 1 | 0 | 0 |
| attribute-errors | 3193 | 97.2% | 2871 | 234 | 60 | 0 | 28 |
| content-model | 98 | 95.9% | 50 | 44 | 4 | 0 | 0 |
| data-types | 56 | 94.6% | 48 | 5 | 1 | 0 | 2 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 58 | 84.5% | 29 | 20 | 9 | 0 | 0 |
| no-duplicate-id | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| require-attr | 5 | 100.0% | 5 | 0 | 0 | 0 | 0 |
| uncategorized | 1323 | 41.7% | 386 | 166 | 769 | 0 | 2 |

## Informational: ml-only

**1122** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| no-unknown-attr | 667 |
| no-invalid-attr-value | 447 |
| permitted-contents | 435 |
| no-deprecated-attr | 354 |
| require-accessible-name | 194 |
| role-supports-aria-prop | 111 |
| @markuplint/ml-core | 75 |
| require-owned-elements | 47 |
| link-types | 34 |
| require-attr | 22 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

