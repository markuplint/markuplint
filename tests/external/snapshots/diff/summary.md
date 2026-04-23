# nu-validator Benchmark Summary

- generated: 2026-04-22T23:43:45.466Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:59b0e97e2664755f1597ba9b6a0ecbdc4c67bd1518d1318acd29d9a08900389b`
- markuplint: `5.0.0-rc.4`
- node: `24.14.1`

## Totals

- files: **5442**
- match-error: **2058** (both tools flagged)
- match-clean: **926** (neither flagged)
- ml-only: **978** (only markuplint flagged; no spec ruling)
- nu-only: **1455** (only nu-validator flagged; markuplint coverage candidates — file a markuplint issue after a spec read)
- nu-over: **25** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **54.8%**
- excluded-ids: 0 entries, 1 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 79.1% | 159 | 458 | 144 | 19 | 0 |
| assertions | 40 | 57.5% | 22 | 1 | 0 | 17 | 0 |
| content-model | 98 | 98.0% | 48 | 48 | 0 | 2 | 0 |
| data-types | 56 | 66.1% | 32 | 5 | 1 | 18 | 0 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 57 | 73.7% | 23 | 19 | 8 | 7 | 0 |
| id-duplication | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| invalid-attr | 3086 | 57.7% | 1547 | 233 | 58 | 1225 | 23 |
| required-attr | 5 | 80.0% | 4 | 0 | 0 | 1 | 0 |
| uncategorized | 1307 | 28.5% | 211 | 162 | 766 | 166 | 2 |

## Top ml-only rules (candidates for markuplint-vs-spec audit)

| Rule | Count |
| --- | ---: |
| invalid-attr | 706 |
| permitted-contents | 444 |
| deprecated-attr | 354 |
| wai-aria-disallowed-props | 120 |
| @markuplint/ml-core | 75 |
| link-types | 34 |
| required-attr | 22 |
| wai-aria-permitted-roles | 20 |
| wai-aria-value | 11 |
| wai-aria-required-props | 8 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is neutral — either tool could be wrong; audit the spec before acting.

