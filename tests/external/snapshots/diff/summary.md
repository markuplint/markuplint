# nu-validator Benchmark Summary

- generated: 2026-07-02T13:28:37.050Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:9365682da0f66efc5504ce2a3aba91290aaf08c00799a41d096236fab740bb44`
- markuplint: `5.0.0-rc.4`
- node: `24.14.1`

## Totals

- files: **5442**
- match-error: **3469** (both tools flagged)
- match-clean: **883** (neither flagged)
- nu-only: **42** (only nu-validator flagged; markuplint coverage candidates — open a markuplint issue after a spec read)
- nu-over: **31** (nu-validator errors fully covered by spec-backed excluded-ids — confirmed over-detection)
- overall match rate: **80.0%**
- excluded-ids: 6 entries, 1 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-only | nu-only | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 77.1% | 181 | 420 | 178 | 1 | 0 |
| assertions | 40 | 100.0% | 39 | 1 | 0 | 0 | 0 |
| content-model | 98 | 96.9% | 50 | 45 | 3 | 0 | 0 |
| data-types | 56 | 94.6% | 48 | 5 | 1 | 2 | 0 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 | 0 |
| global-attr | 57 | 82.5% | 27 | 20 | 8 | 2 | 0 |
| id-duplication | 1 | 100.0% | 1 | 0 | 0 | 0 | 0 |
| invalid-attr | 3086 | 96.0% | 2734 | 229 | 61 | 33 | 29 |
| required-attr | 5 | 100.0% | 5 | 0 | 0 | 0 | 0 |
| uncategorized | 1307 | 41.0% | 373 | 163 | 765 | 4 | 2 |

## Informational: ml-only

**1017** fixtures are flagged only by markuplint. This project does not pursue upstream nu-validator reports, so those fixtures feed a narrower audit: confirm with the spec, and if markuplint is the wrong one, fix the rule. The full list lives in `snapshots/diff/markuplint-only.json`.

### Top ml-only rules

| Rule | Count |
| --- | ---: |
| invalid-attr | 707 |
| permitted-contents | 444 |
| deprecated-attr | 354 |
| wai-aria-disallowed-props | 121 |
| @markuplint/ml-core | 75 |
| wai-aria-required-owned-elements | 47 |
| link-types | 34 |
| required-attr | 22 |
| wai-aria-permitted-roles | 20 |
| wai-aria-value | 11 |

> `nu-only` entries are candidates for markuplint coverage work **after** verifying the relevant spec paragraph. `nu-over` entries are already confirmed nu-validator over-detection via `excluded-ids.json`. `ml-only` is informational; audit the spec before acting on any individual row.

