# nu-validator Benchmark Summary

- generated: 2026-05-17T03:23:23.494Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:b36e0da34a71a21e742a7336198a3404b6d737401098eaf9c945024bb51ae5be`
- markuplint: `5.0.0-rc.4`
- node: `24.14.1`

## Totals

- files: **5442**
- match-error: **3368** (both tools flagged)
- match-clean: **919** (neither flagged)
- nu-only: **104** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **70** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **78.8%**
- excluded-ids: 4 entries, 8 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 80.3% | 174 | 452 | 146 | 8 | 0 |
| assertions | 40 | 100.0% | 39 | 1 | 0 | 0 | 0 |
| content-model | 98 | 98.0% | 48 | 48 | 0 | 2 | 0 |
| data-types | 56 | 94.6% | 48 | 5 | 1 | 2 | 0 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 57 | 80.7% | 26 | 20 | 8 | 3 | 0 |
| id-duplication | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| invalid-attr | 3086 | 93.2% | 2645 | 230 | 60 | 83 | 68 |
| required-attr | 5 | 100.0% | 5 | 0 | 0 | 0 | 0 |
| uncategorized | 1307 | 40.9% | 371 | 163 | 765 | 6 | 2 |

## Informational: ml-only

**981** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| invalid-attr | 707 |
| permitted-contents | 444 |
| deprecated-attr | 354 |
| wai-aria-disallowed-props | 121 |
| @markuplint/ml-core | 75 |
| link-types | 34 |
| required-attr | 22 |
| wai-aria-permitted-roles | 20 |
| wai-aria-value | 11 |
| no-refer-to-non-existent-id | 8 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

