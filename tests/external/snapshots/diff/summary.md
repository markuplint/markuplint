# nu-validator Benchmark Summary

- generated: 2026-04-22T23:43:45.466Z
- submodule: `142931395412c00434ffb40a14d65992efd17aa8`
- nu-validator: `ghcr.io/validator/validator@sha256:59b0e97e2664755f1597ba9b6a0ecbdc4c67bd1518d1318acd29d9a08900389b`
- markuplint: `5.0.0-rc.4`
- node: `24.14.1`

## Totals

- files: **5442**
- match-error: **2056**
- match-clean: **972**
- ml-over (markuplint over-detection): **980**
- nu-over (nu-validator over-detection): **1434**
- overall match rate: **55.6%**
- excluded-ids: 0 entries, 2 pattern(s)

## Per-Category

| Category | Files | Match rate | match-error | match-clean | ml-over | nu-over |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| aria | 780 | 79.1% | 159 | 458 | 144 | 19 |
| assertions | 40 | 75.0% | 22 | 8 | 0 | 10 |
| content-model | 98 | 98.0% | 48 | 48 | 0 | 2 |
| data-types | 56 | 66.1% | 32 | 5 | 1 | 18 |
| deprecated | 12 | 91.7% | 11 | 0 | 1 | 0 |
| global-attr | 57 | 73.7% | 23 | 19 | 8 | 7 |
| id-duplication | 1 | 100.0% | 1 | 0 | 0 | 0 |
| invalid-attr | 3086 | 58.8% | 1545 | 270 | 60 | 1211 |
| required-attr | 5 | 80.0% | 4 | 0 | 0 | 1 |
| uncategorized | 1307 | 28.7% | 211 | 164 | 766 | 166 |

## Top markuplint over-detection rules

| Rule | Count |
| --- | ---: |
| invalid-attr | 708 |
| permitted-contents | 444 |
| deprecated-attr | 354 |
| wai-aria-disallowed-props | 120 |
| @markuplint/ml-core | 75 |
| link-types | 34 |
| required-attr | 22 |
| wai-aria-permitted-roles | 20 |
| wai-aria-value | 11 |
| wai-aria-required-props | 8 |

> nu-over entries are candidates for excluded-ids.json when markuplint is correctly not flagging them.

