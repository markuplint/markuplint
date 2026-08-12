# nu-validator Benchmark Summary

- generated: 2026-08-12T06:31:53.804Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:210bbc353b23ba1b1ae65247c156a006afb4ba84703ba1bbf7c41d2080559445`
- markuplint: `5.0.0-rc.4`
- node: `24.14.1`

## Totals

- files: **5442**
- match-error: **3520** (both tools flagged)
- match-clean: **759** (neither flagged)
- nu-only: **7** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **35** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **78.6%**
- excluded-ids: 15 entries, 1 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 65.0% | 177 | 330 | 273 | 0 | 0 |
| assertions | 40 | 97.5% | 39 | 0 | 1 | 0 | 0 |
| content-model | 98 | 95.9% | 50 | 44 | 4 | 0 | 0 |
| data-types | 56 | 96.4% | 49 | 5 | 1 | 0 | 1 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 57 | 78.9% | 27 | 18 | 10 | 2 | 0 |
| id-duplication | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| invalid-attr | 3086 | 97.1% | 2786 | 209 | 58 | 1 | 32 |
| required-attr | 5 | 100.0% | 5 | 0 | 0 | 0 | 0 |
| uncategorized | 1307 | 40.4% | 375 | 153 | 773 | 4 | 2 |

## Informational: ml-only

**1121** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| invalid-attr | 680 |
| permitted-contents | 444 |
| deprecated-attr | 354 |
| require-accessible-name | 186 |
| wai-aria-disallowed-props | 121 |
| @markuplint/ml-core | 75 |
| wai-aria-required-owned-elements | 47 |
| link-types | 34 |
| required-attr | 22 |
| wai-aria-permitted-roles | 20 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

