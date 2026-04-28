# nu-validator Benchmark Summary

- generated: 2026-04-28T03:31:29.579Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:59b0e97e2664755f1597ba9b6a0ecbdc4c67bd1518d1318acd29d9a08900389b`
- markuplint: `5.0.0-rc.4`
- node: `24.14.1`

## Totals

- files: **5442**
- match-error: **2080** (both tools flagged)
- match-clean: **929** (neither flagged)
- nu-only: **1430** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **28** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **55.3%**
- excluded-ids: 3 entries, 1 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 80.0% | 162 | 462 | 140 | 16 | 0 |
| assertions | 40 | 65.0% | 25 | 1 | 0 | 14 | 0 |
| content-model | 98 | 98.0% | 48 | 48 | 0 | 2 | 0 |
| data-types | 56 | 71.4% | 35 | 5 | 1 | 15 | 0 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 57 | 75.4% | 24 | 19 | 8 | 6 | 0 |
| id-duplication | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| invalid-attr | 3086 | 57.9% | 1556 | 231 | 60 | 1213 | 26 |
| required-attr | 5 | 80.0% | 4 | 0 | 0 | 1 | 0 |
| uncategorized | 1307 | 28.8% | 214 | 163 | 765 | 163 | 2 |

## Informational: ml-only

**975** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| invalid-attr | 707 |
| permitted-contents | 444 |
| deprecated-attr | 354 |
| wai-aria-disallowed-props | 120 |
| @markuplint/ml-core | 75 |
| link-types | 34 |
| required-attr | 22 |
| wai-aria-permitted-roles | 20 |
| wai-aria-value | 11 |
| no-duplicate-autofocus | 4 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

