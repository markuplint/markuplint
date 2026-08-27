# Rule renames and splits

Master reference for rule-name changes with a **stable v4** lineage (`v4.18.3`). Option-format changes beyond a rename or split are on the per-rule pages under `rules/`. ARIA version and `wai-aria` option mapping: [ARIA](./aria.md).

v5 redoes the catalog: verb-prefix names, one rule per independent check, and spec-conformance metadata. **v4's 38 built-in rules become 106 in v5.** Of that: 12 were renamed, 10 were split, `wai-aria` became 21 independent rules, and the rest are new checks with no v4 predecessor.

Old names that **were renamed or split** keep working: Markuplint reports a deprecation warning and expands the config. Those aliases are removed in v6. Names that **did not change** have no alias — see [Known migration gap](#known-migration-gap).

## Categories

v4 used five categories (`validation`, `a11y`, `naming-convention`, `maintainability`, `style`). v5 uses nine, from each rule's `meta.ts` `category`. Categories are a browsing aid on the rules index; they do not appear in config files.

| Category | What it covers |
| --- | --- |
| `syntax` | Parse-level conformance |
| `structure` | Content model, ancestors, doctype, table model |
| `attributes` | Attribute name/value conformance |
| `references` | ID and fragment references |
| `forms` | Form-control checks |
| `a11y` | ARIA and accessibility |
| `style` | Opinionated formatting/naming |
| `maintainability` | Project hygiene |
| `compat` | browserslist × BCD, experimental/non-standard flags |

`naming-convention` (only `class-naming`) folds into `style`.

## 1:1 renames

These 12 names existed in stable v4 and map 1:1:

| Old name (v4) | New name |
| --- | --- |
| `attr-duplication` | `no-duplicate-attr` |
| `id-duplication` | `no-duplicate-id` |
| `required-attr` | `require-attr` |
| `required-element` | `require-element` |
| `ineffective-attr` | `no-ineffective-attr` |
| `end-tag` | `require-end-tag` |
| `disallowed-element` | `no-restricted-element` |
| `heading-levels` | `no-skipped-heading-level` |
| `neighbor-popovers` | `require-adjacent-popover` |
| `no-hard-code-id` | `no-hardcoded-id` |
| `no-use-event-handler-attr` | `no-event-handler-attr` |
| `use-list` | `no-pseudo-list` |

`required-attr` → `require-attr` keeps `{ name, value }` matching. See [Scope changes](#scope-changes).

## Splits

These 10 names existed in stable v4. Each split is independently configurable.

| Old name (v4) | Split into | What each checks |
| --- | --- | --- |
| `invalid-attr` | `no-unknown-attr` | Name not defined by the spec |
|  | `no-disallowed-attr` | Name defined but disallowed here (`noUse`, unmet condition, `is` on an autonomous custom element) |
|  | `no-invalid-attr-value` | Value type/grammar |
|  | `no-restricted-attr` | User `disallowAttrs` only — omitted from the alias unless `disallowAttrs` was set |
| `doctype` | `require-doctype` | Missing DOCTYPE |
|  | `no-obsolete-doctype` | Legacy public/system identifier (`about:legacy-compat` still allowed). Omitted if `denyObsoleteType` was `false` |
| `character-reference` | `no-malformed-character-reference` | Malformed character references |
|  | `no-unescaped-char` | Unescaped `<` / ambiguous `&` |
| `deprecated-attr` | `no-obsolete-attr` | HTML LS obsolete attributes (`error`) |
|  | `no-deprecated-attr` | MDN/BCD deprecated attributes (`warning`) |
| `deprecated-element` | `no-obsolete-element` | Obsolete elements (`error`) |
|  | `no-deprecated-element` | Deprecated elements (`warning`) |
| `landmark-roles` | `no-nested-top-level-landmark` | Nested `banner` / `main` / `contentinfo` (`ignoreRoles` carried over) |
|  | `require-landmark-label` | Duplicate landmark without an accessible name. Omitted if `labelEachArea` was `false` |
| `no-refer-to-non-existent-id` | `no-refer-to-non-existent-id` | `DOMID` / ARIA ID-reference (name unchanged — [gap](#known-migration-gap)) |
|  | `no-broken-fragment-link` | `a[href]` / `area[href]` fragment (`fragmentRefersNameAttr` moved here) |
| `permitted-contents` | `permitted-contents` | Child content model (name unchanged — [gap](#known-migration-gap)) |
|  | `no-disallowed-ancestor` | `forbiddenAncestors` |
|  | `require-ancestor` | `descendantOf` |
|  | `no-duplicate-sibling-attr` | Sibling-unique attributes (e.g. `track[default]`) |
| `required-h1` | `require-h1` | Missing `<h1>` |
|  | `no-duplicate-h1` | Duplicate `<h1>`. Omitted if `expected-once` was `false` |
| `table-row-column-alignment` | `no-table-cell-overlap` | Cell overlap (`error`) |
|  | `no-table-span-overflow` | Span past row-group/table (`error`) |
|  | `no-empty-table-track` | Row/column with no anchored cell (`error`) |
|  | `consistent-table-row-length` | Ragged column count (`warning`) |

`aria-*` and `role` are exempt from the three spec-checking `invalid-attr` successors; ARIA rules own them.

### Option-routed splits

Most splits copy the old setting to every successor. These do not:

- `doctype`: drop `no-obsolete-doctype` when `denyObsoleteType` was `false`.
- `landmark-roles`: drop `require-landmark-label` when `labelEachArea` was `false`.
- `required-h1`: drop `no-duplicate-h1` when `expected-once` was `false`.
- `invalid-attr`: add `no-restricted-attr` only when `disallowAttrs` was set. Option routing: [`invalid-attr`](./rules/invalid-attr.md).

The alias does this automatically. Hand-written configs should match that routing.

## New in v5 (no v4 equivalent)

These checks have no v4 rule to migrate from. Presets may enable some of them (see [Preset changes](#preset-changes)).

`attr-order`, `form-attr-references-form`, `head-element-order`, `input-list-references-datalist`, `itemprop-requires-itemscope`, `label-for-references-labelable`, `label-no-multiple-controls`, `link-types`, `map-id-name-match`, `meta-charset-position`, `meter-value-bounds`, `no-always-matching-source`, `no-content-after-body`, `no-duplicate-autofocus`, `no-duplicate-visible-main`, `no-experimental-features`, `no-extra-selected-options`, `no-input-file-value`, `no-mismatched-aspect-ratio`, `no-mixed-srcset-descriptors`, `no-nonstandard-features`, `no-redundant-accessible-name`, `no-stray-head-or-body-tag`, `no-unclosed-element-at-eof`, `no-unpaired-srcset-sizes`, `no-unsupported-browser-features`, `progress-value-bounds`, `require-dialog-autofocus`, `sizes-auto-requires-lazy-loading`, `usemap-references-map`, `valid-importmap`, `valid-speculation-rules`.

`label-no-multiple-controls` is new as a **rule name**, but the check lived inside v4 `label-has-control` — [Known migration gap](#known-migration-gap).

Two ARIA rules (`require-parent-role`, `tab-requires-tabpanel`) are also new relative to the v4 `wai-aria` implementation; they still receive the `wai-aria` alias. See [ARIA](./aria.md).

## Deletions

Only `wai-aria` is removed as a rule name. The alias expands it to 21 successors until v6. There is no other v4 built-in rule deletion.

## Scope changes

- **`require-attr`**: full v4 `required-attr` scope, including `{ name, value }` patterns.
- **`label-has-control`**: only reports a `<label>` with no associated control. Reporting a second descendant control is `label-no-multiple-controls`.

## Known migration gap {#known-migration-gap}

> [!CAUTION]
> These old names are **not** deprecated (they still exist), so there is **no** alias warning. A raw config that enabled only the old name silently drops the split-off check.

| v4 name you still use | Split-off rules you must add yourself |
| --- | --- |
| `permitted-contents` | `no-disallowed-ancestor`, `require-ancestor`, `no-duplicate-sibling-attr` |
| `no-refer-to-non-existent-id` | `no-broken-fragment-link` |
| `label-has-control` | `label-no-multiple-controls` |

Preset users: `markuplint:html-standard` already enables the `permitted-contents` siblings and `label-no-multiple-controls`. `markuplint:a11y` enables `no-broken-fragment-link` and `label-has-control`. `markuplint:recommended` extends both.

Gaps that remain even with presets:

- Extending **`markuplint:html-standard` alone** does not enable `no-broken-fragment-link` (it is only in `a11y`), while it does enable `no-refer-to-non-existent-id`.
- Extending **`markuplint:a11y` alone** does not enable `label-no-multiple-controls` (it is only in `html-standard`), while v4 `a11y` ran that check inside `label-has-control`.

## Severity changes

Compared to the v4 default (`createRule` defaults to `error` unless `defaultSeverity` is set):

| Rule | v4 | v5 |
| --- | --- | --- |
| `no-table-cell-overlap` / `no-table-span-overflow` / `no-empty-table-track` | `warning` (as `table-row-column-alignment`) | `error` |
| `consistent-table-row-length` | `warning` (same compound rule) | `warning` |
| `no-duplicate-dt` | `error` | `warning` |
| `no-obsolete-attr` / `no-obsolete-element` | `error` (as `deprecated-attr` / `deprecated-element`) | `error` |
| `no-deprecated-attr` / `no-deprecated-element` | `error` (same compound rules) | `warning` |
| `no-broken-fragment-link` | `error` (as part of `no-refer-to-non-existent-id`) | `warning` |
| `require-h1` / `no-duplicate-h1` | `error` (as `required-h1`) | `warning` |
| `require-adjacent-popover` | `error` (as `neighbor-popovers`) | `warning` |

`no-consecutive-br` stays `warning` (false positives on legitimate line breaks).

> [!WARNING]
> The three table-model `error`s can fail CI that treats errors as fatal, on markup that only warned in v4.

## Preset changes

Verified against `v4.18.3` preset JSON and current `preset.*.jsonc`.

- **`markuplint:code-styles`** was `{}` in v4. It now enables `case-sensitive-attr-name` and `case-sensitive-tag-name`.
- **`markuplint:security`** was `{}` in v4. It now enables `no-event-handler-attr`.
- **`markuplint:compat`** did not exist in v4. v5's `markuplint:recommended` extends it, enabling `no-unsupported-browser-features` and `no-nonstandard-features` (`no-experimental-features` stays opt-in).
- **`markuplint:performance`** gains `head-element-order` and `no-mismatched-aspect-ratio`. Its `nodeRules` (charset, `defer`, img dimensions, iframe `loading`) are unchanged in substance.
- **`markuplint:html-standard`** drops `no-duplicate-dt` and `no-ineffective-attr` (both were on in v4). It **adds** `no-unknown-attr` / `no-disallowed-attr` / `no-invalid-attr-value` — v4's `html-standard` did **not** include `invalid-attr`. It also adds many new MUST checks (parse structure, srcset, forms, `itemprop-requires-itemscope`, and the `permitted-contents` siblings).
- **`markuplint:a11y`** still includes `wai-aria` coverage, now as named groups. That enables checks the v4 umbrella left **off** by default, plus two checks the v4 umbrella never ran. See [ARIA](./aria.md).
- **`no-refer-to-non-existent-id`** and **`no-duplicate-id`** remain in both `a11y` and `html-standard`.
- **`markuplint:recommended`** still extends code-styles, html-standard, a11y, performance, security, and rdfa, and now also **compat**.

Rules intentionally in **no** preset: `attr-order`, `attr-value-quotes`, `class-naming`, `no-boolean-attr-value`, `no-default-value`, `no-empty-palpable-content`, `no-duplicate-dt`, `no-ineffective-attr`, `no-experimental-features`.
