# nu-validator Benchmark Summary

- generated: 2026-08-29T12:49:31.732Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:230e3a1a5dd2a2bbc6fa3a30015c9d6a4634c43f59b9d92d1aa9be746c59886a`
- markuplint: `5.0.0-rc.5`
- node: `26.6.0`

## Totals

- files: **5442**
- match-error: **3533** (both tools flagged)
- match-clean: **764** (neither flagged)
- nu-only: **0** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **29** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **79.0%**
- excluded-ids: 9 entries, 1 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 65.3% | 177 | 332 | 271 | 0 | 0 |
| assertions | 40 | 97.5% | 39 | 0 | 1 | 0 | 0 |
| attribute-errors | 3086 | 97.3% | 2793 | 211 | 56 | 0 | 26 |
| content-model | 98 | 95.9% | 50 | 44 | 4 | 0 | 0 |
| data-types | 56 | 96.4% | 49 | 5 | 1 | 0 | 1 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 57 | 84.2% | 29 | 19 | 9 | 0 | 0 |
| no-duplicate-id | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| require-attr | 5 | 100.0% | 5 | 0 | 0 | 0 | 0 |
| uncategorized | 1307 | 40.7% | 379 | 153 | 773 | 0 | 2 |

## Informational: ml-only

**1116** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| no-unknown-attr | 666 |
| no-invalid-attr-value | 446 |
| permitted-contents | 444 |
| no-deprecated-attr | 354 |
| require-accessible-name | 186 |
| role-supports-aria-prop | 112 |
| @markuplint/ml-core | 75 |
| require-owned-elements | 47 |
| link-types | 34 |
| require-attr | 22 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

