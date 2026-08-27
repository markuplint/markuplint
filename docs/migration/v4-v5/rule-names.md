# Rule Renames and Splits: v4 to v5 Migration Guide

## Who This Guide Is For

- **Everyone** — this is the master reference for every rule-name change in v5 (PR #3989). See [ARIA Changes](./aria.md) for ARIA-specific detail, and the per-rule guides under `rules/` for rules with option-format changes beyond the rename/split itself.

## Summary

v5.0.0 redoes the rule catalog end to end: consistent ESLint-style verb-prefix naming, one rule per independent spec requirement, and machine-readable spec-conformance metadata. rc.4's 82 rules become 106 (25 splits, 1 new rule, 2 removed).

**Nothing breaks silently** — with one documented exception. Every renamed or split rule keeps working under its old name — markuplint reports a deprecation warning and expands the old config to the new rule(s) automatically. Old names are removed in v6. The exception: two rules keep their pre-v5 name and gain a split-off sibling with no alias/warning mechanism to announce it — see [Known Migration Gap](#known-migration-gap) if you use `permitted-contents` or `no-refer-to-non-existent-id` directly in a raw (non-preset) config.

## Categories

rc.4's 5-category scheme (`validation`, `a11y`, `naming-convention`, `maintainability`, `style`) is replaced by 9 categories, each `meta.ts`'s `category` field. `validation` (too coarse to browse — it held 53 of rc.4's 82 rules) is split by what the rule actually checks; `naming-convention` (1 rule, `class-naming`) folds into `style`.

| Category | What it covers |
|----------|-----------------|
| `syntax` | Parse-level conformance — malformed markup, character references, tag/element structure at the token level |
| `structure` | Document/content-model structure — permitted contents, ancestor/descendant constraints, doctype, table model |
| `attributes` | Attribute name/value conformance — unknown/disallowed attributes, value type checks, srcset, dimensions |
| `references` | Cross-reference integrity — ID references, `for`/`form`/`list`/`usemap` attribute targets |
| `forms` | Form-control-specific best practices |
| `a11y` | ARIA and other accessibility-specific checks |
| `style` | Opinionated formatting/naming preferences with no single correct answer |
| `maintainability` | Project-hygiene checks unrelated to spec conformance or accessibility |
| `compat` | Browser/engine compatibility — browserslist × BCD, experimental/non-standard feature flags |

## 1:1 Renames

| Old name (rc.4) | New name |
|------------------|----------|
| `attr-duplication` | `no-duplicate-attr` |
| `id-duplication` | `no-duplicate-id` |
| `required-attr` | `require-attr` (plain rename, full scope kept — see [Scope Narrowed](#scope-narrowed) below for why) |
| `required-element` | `require-element` |
| `ineffective-attr` | `no-ineffective-attr` |
| `end-tag` | `require-end-tag` |
| `disallowed-element` | `no-restricted-element` |
| `correct-aspect-ratio` | `no-mismatched-aspect-ratio` |
| `heading-levels` | `no-skipped-heading-level` |
| `input-file-empty-value` | `no-input-file-value` |
| `neighbor-popovers` | `require-adjacent-popover` |
| `no-hard-code-id` | `no-hardcoded-id` |
| `no-use-event-handler-attr` | `no-event-handler-attr` |
| `redundant-accessible-name` | `no-redundant-accessible-name` |
| `use-list` | `no-pseudo-list` |
| `wai-aria-abstract-role` | `no-abstract-role` |
| `wai-aria-deprecated-role` | `no-deprecated-role` |
| `wai-aria-deprecated-props` | `no-deprecated-aria-prop` |
| `wai-aria-default-value` | `no-default-aria-value` |
| `wai-aria-implicit-role` | `no-redundant-role` |
| `wai-aria-no-global-prop` | `aria-prop-requires-role` |
| `wai-aria-non-existent-role` | `no-unknown-role` |
| `wai-aria-permitted-roles` | `permitted-roles` |
| `wai-aria-interaction-in-hidden` | `no-focusable-in-aria-hidden` |
| `wai-aria-presentational-children` | `no-aria-on-presentational-children` |
| `wai-aria-required-owned-elements` | `require-owned-elements` |
| `wai-aria-required-parent-role` | `require-parent-role` |
| `wai-aria-required-props` | `require-aria-prop` |
| `wai-aria-tab-requires-tabpanel` | `tab-requires-tabpanel` |
| `wai-aria-value` | `no-invalid-aria-prop-value` |

## Splits

Each split's checks correspond to independent spec requirements, so they can be enabled/disabled/set to a different severity independently.

| Old name (rc.4) | Split into | What each checks |
|------------------|------------|-------------------|
| `invalid-attr` | `no-unknown-attr` | Attribute name not defined by the spec at all (typo candidates, case mismatches) |
| | `no-disallowed-attr` | Attribute defined but disallowed here (`noUse`, unmet conditional-allow condition, `is` on an autonomous custom element). `aria-*`/`role` are exempt from all three spec-checking rules — the ARIA rules own them, `no-aria-on-unsupported-element` in particular |
| | `no-invalid-attr-value` | Attribute value type/grammar violation |
| | `no-restricted-attr` | User-defined `disallowAttrs` denylisting (its only option — `allowAttrs` goes to the three spec-checking rules instead) |
| `doctype` | `require-doctype` | Missing DOCTYPE declaration entirely |
| | `no-obsolete-doctype` | Legacy DOCTYPE with a public/system identifier (`about:legacy-compat` is still permitted per spec) |
| `character-reference` | `no-malformed-character-reference` | parse5's malformed-character-reference parse errors |
| | `no-unescaped-char` | Unescaped literal `<` or ambiguous `&` (default); `strict` option adds `>`, `"`, and any bare `&` |
| `deprecated-attr` | `no-obsolete-attr` | HTML LS §16.2 obsolete attributes (conformance violation, `error`) |
| | `no-deprecated-attr` | Spec-valid but MDN/BCD-flagged deprecated attributes (`warning`) |
| `deprecated-element` | `no-obsolete-element` | Same, for elements (`error`) |
| | `no-deprecated-element` | Same, for elements (`warning`) |
| `landmark-roles` | `no-nested-top-level-landmark` | `banner`/`main`/`contentinfo` nested inside another landmark |
| | `require-landmark-label` | Missing accessible name when the same landmark role appears more than once |
| `no-refer-to-non-existent-id` | `no-refer-to-non-existent-id` | `DOMID`-typed attribute / ARIA ID-reference property pointing at a nonexistent ID (rule keeps its name — see [Known Migration Gap](#known-migration-gap)) |
| | `no-broken-fragment-link` | `a[href]`/`area[href]` fragment pointing at a nonexistent ID (`fragmentRefersNameAttr` option moved here) |
| `no-unsupported-features` | `no-unsupported-browser-features` | browserslist × BCD: feature unsupported by target browsers |
| | `no-experimental-features` | Experimental-flagged feature (was the `checkExperimental` option) |
| | `no-nonstandard-features` | Non-standard-flagged feature (was the `checkNonStandard` option) |
| `permitted-contents` | `permitted-contents` | Child-node content-model conformance (rule keeps its name — see [Known Migration Gap](#known-migration-gap)) |
| | `no-disallowed-ancestor` | Appears as a descendant of a forbidden ancestor (spec's `forbiddenAncestors`) |
| | `require-ancestor` | Missing a required ancestor (spec's `descendantOf`) |
| | `no-duplicate-sibling-attr` | Attribute that must be unique among siblings is duplicated (e.g. `track[default]`) |
| `required-h1` | `require-h1` | Missing `<h1>` |
| | `no-duplicate-h1` | Duplicate `<h1>` |
| `script-content` | `valid-importmap` | `type=importmap` JSON structure |
| | `valid-speculation-rules` | `type=speculationrules` JSON structure |
| `srcset-sizes-constraint` | `no-unpaired-srcset-sizes` | Width descriptor requires a matching `sizes` |
| | `no-mixed-srcset-descriptors` | Width and density descriptors mixed |
| | `sizes-auto-requires-lazy-loading` | `sizes=auto` without `loading=lazy` |
| | `no-always-matching-source` | A `source` with later candidates but no `media`/`type` |
| `table-row-column-alignment` | `no-table-cell-overlap` | Cell overlap from `rowspan`/`colspan` (table model error) |
| | `no-table-span-overflow` | Span overflows its row group or table boundary (table model error) |
| | `no-empty-table-track` | A row or column with no cells starting in it (table model error) |
| | `consistent-table-row-length` | Inconsistent column count across rows (spec permits this; the only `warning`-level entry of the four) |
| `wai-aria-disallowed-props` | `no-prohibited-naming` | `aria-label`/`aria-labelledby`/`aria-braillelabel` on a naming-prohibited element |
| | `element-supports-aria-prop` | `aria-*` disallowed/restricted for this specific element or state (ARIA in HTML) |
| | `role-supports-aria-prop` | State/property not supported by the computed role (WAI-ARIA role definition) |
| `wai-aria-implicit-props` | `no-redundant-aria-prop` | `aria-*` redundant with an equivalent HTML attribute |
| | `no-contradictory-aria-prop` | `aria-*` contradicting an equivalent HTML attribute |

See [ARIA Changes](./aria.md) for the `wai-aria` umbrella rule's removal (a 21-way "split," if you count it that way — 20 of its 21 checks already had an independent successor before v5.0.0 shipped; the 21st is the new `no-aria-on-unsupported-element`).

### Option-Routed Splits: Before / After

Most splits above are unconditional — every old check gets its own new rule regardless of options. Five are not: `doctype`, `landmark-roles`, `required-h1`, `no-unsupported-features`, and `invalid-attr` route to a subset of their new siblings depending on what the old options said. The alias table expands these automatically (with a deprecation warning) — this is only relevant if you're rewriting your config by hand instead of relying on that.

`doctype` with both checks on:

```json
{ "rules": { "doctype": "always" } }
```

becomes

```json
{
  "rules": {
    "require-doctype": true,
    "no-obsolete-doctype": true
  }
}
```

— `no-obsolete-doctype` is omitted entirely if the old config set `denyObsoleteType: false`.

`landmark-roles` with both checks on:

```json
{ "rules": { "landmark-roles": { "options": { "ignoreRoles": ["region"] } } } }
```

becomes

```json
{
  "rules": {
    "no-nested-top-level-landmark": { "options": { "ignoreRoles": ["region"] } },
    "require-landmark-label": true
  }
}
```

— `require-landmark-label` is omitted entirely if the old config set `labelEachArea: false`.

`required-h1` with both checks on:

```json
{ "rules": { "required-h1": { "options": { "in-document-fragment": true } } } }
```

becomes

```json
{
  "rules": {
    "require-h1": { "options": { "in-document-fragment": true } },
    "no-duplicate-h1": { "options": { "in-document-fragment": true } }
  }
}
```

— `no-duplicate-h1` is omitted entirely if the old config set `expected-once: false`.

`no-unsupported-features` with every check on:

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": { "checkExperimental": true, "checkNonStandard": true, "ignoreFeatures": ["css-grid"] }
    }
  }
}
```

becomes

```json
{
  "rules": {
    "no-unsupported-browser-features": { "options": { "ignoreFeatures": ["css-grid"] } },
    "no-experimental-features": { "options": { "ignoreFeatures": ["css-grid"] } },
    "no-nonstandard-features": { "options": { "ignoreFeatures": ["css-grid"] } }
  }
}
```

— `no-experimental-features`/`no-nonstandard-features` are each omitted entirely unless the old config explicitly set the matching `check*` option to `true` (v4's default for both was `false`, i.e. that check didn't run at all).

`invalid-attr` always expands to `no-unknown-attr`, `no-disallowed-attr`, and `no-invalid-attr-value`; `no-restricted-attr` joins them only when the old config actually set `disallowAttrs`, so a bare `invalid-attr: true` never enables a rule with nothing to restrict. The old options are routed rather than copied wholesale — see [`invalid-attr` Breaking Changes](./rules/invalid-attr.md) for which option lands on which new rule.

## Deletions

| Removed rule | Replaced by |
|--------------|-------------|
| `wai-aria` (umbrella) | Its 21 successor rules — 20 already independent, plus the new `no-aria-on-unsupported-element`; see [ARIA Changes](./aria.md#umbrella-rule-removed) |
| `input-button-non-empty-value` | `require-accessible-name` — see [ARIA Changes](./aria.md#removed-input-button-non-empty-value) |

## Scope Narrowed

- **`require-attr`** (renamed from `required-attr`): a plain rename, not a scope change. The design originally proposed narrowing it to existence-checking only and moving its `{ name, value }` pattern-matching to `no-restricted-attr`, but that was reconsidered once `no-restricted-attr` actually landed — "require this attribute's value to match a pattern" is a positive REQUIRE constraint, not a denylist, and only fits `no-restricted-attr`'s deny-only shape via an awkward negated pattern. `require-attr` keeps its full pre-rename scope, including `{ name, value }` matching.
- **`label-has-control`**: detects only a `<label>` with no associated control now. Detecting a *second* control inside the same `<label>` was already `label-no-multiple-controls`'s job; `label-has-control` reporting it too was a duplicate.

## Known Migration Gap

Two rules keep their name (not renamed, not deprecated) but gain a sibling from a split: `permitted-contents` (→ `no-disallowed-ancestor`/`require-ancestor`/`no-duplicate-sibling-attr`) and `no-refer-to-non-existent-id` (→ `no-broken-fragment-link`). Because the *old* name is unchanged, there's no alias table entry to expand it — if you enabled either rule directly in a raw config (not through a preset), you silently lose the split-off check with **no deprecation warning**. Preset users are mostly unaffected: the new sibling checks are already added as their own preset entries — with one gap. `no-broken-fragment-link` is in the `a11y` preset (alongside `no-refer-to-non-existent-id`) but missing from `html-standard`, even though `html-standard` carries `no-refer-to-non-existent-id` itself. `markuplint:recommended` extends both, so it's unaffected; extending `html-standard` alone is not.

```json
{
  "rules": {
    "permitted-contents": true
  }
}
```

needs

```json
{
  "rules": {
    "permitted-contents": true,
    "no-disallowed-ancestor": true,
    "require-ancestor": true,
    "no-duplicate-sibling-attr": true
  }
}
```

to keep the same coverage in v5.

## Severity Changes

| Rule | rc.4 | v5 | Why |
|------|------|-----|-----|
| `no-table-cell-overlap` / `no-table-span-overflow` / `no-empty-table-track` | `warning` | `error` | Table model errors are a MUST; the spec-permitted inconsistent row length is the one check split into `consistent-table-row-length` and kept at `warning` |
| `no-mismatched-aspect-ratio` | `warning` | `error` | HTML LS §4.8.17 dimension attributes are a MUST (a ±0.5px tolerance was added at the same time, since integer `width`/`height` can't always divide evenly) |
| `no-contradictory-aria-prop` | `warning` (as part of `wai-aria-implicit-props`) | `error` | Contradicting an equivalent HTML attribute is a MUST; the redundant half (`no-redundant-aria-prop`) stays `warning` |
| `require-owned-elements` | `warning` | `error` | WAI-ARIA Required Owned Elements is a MUST |
| `no-duplicate-dt` | `error` | `warning` | HTML LS phrases this as a SHOULD |
| `no-obsolete-attr` / `no-obsolete-element` | `error` (as part of `deprecated-attr`/`deprecated-element`) | `error` (unchanged) | Obsolete (spec-removed) is a MUST |
| `no-deprecated-attr` / `no-deprecated-element` | `error` (as part of `deprecated-attr`/`deprecated-element`) | `warning` | Factual, MDN/BCD-sourced data, not a spec MUST |
| `no-broken-fragment-link` | `error` (as part of `no-refer-to-non-existent-id`) | `warning` | Not a conformance violation per HTML LS |
| `require-h1` / `no-duplicate-h1` | `error` (as `required-h1`) | `warning` | WCAG Technique H42 is non-normative |
| `require-adjacent-popover` | `error` (as `neighbor-popovers`) | `warning` | HTML LS states this in a non-normative Note |

`no-consecutive-br` is a deliberate exception, explained here rather than in the rule's own files: it stays `warning` even though it's a proxy for an HTML LS MUST, because the detection can false-positive on legitimate uses (e.g. poem line breaks).

The four `warning`→`error` rows above cover six rules (the first row alone holds three), any of which can turn a previously-green CI pipeline red on unrelated code for teams using a strict, zero-warnings gate (e.g. `--max-warnings 0`) — check your current warning counts against these specific rules before upgrading.

## Preset Changes

- **`code-styles`** and **`security`** were empty in rc.4. `code-styles` now includes `case-sensitive-attr-name`/`case-sensitive-tag-name`; `security` now includes `no-event-handler-attr`.
- **`performance`** gains `head-element-order` and `no-mismatched-aspect-ratio` as plain rules (its existing `nodeRules`-scoped entries are unchanged).
- **`html-standard`** gains `itemprop-requires-itemscope` and drops `no-duplicate-dt` (a SHOULD) and `no-ineffective-attr` (non-normative) — the preset only admits rules whose spec conformance is `sources: ['html']` + `level: 'must'`. `input-button-non-empty-value` is also gone from it (the rule is removed).
- **`no-refer-to-non-existent-id`** and **`no-duplicate-id`** stay in both `a11y` and `html-standard`, deliberately — this is unchanged from rc.4.
- Nine rules are deliberately in **no preset at all** (opinionated formatting rules that need explicit configuration, or checks with a high false-positive rate): `attr-order`, `attr-value-quotes`, `class-naming`, `no-boolean-attr-value`, `no-default-value`, `no-empty-palpable-content`, `no-duplicate-dt`, `no-ineffective-attr`, `no-experimental-features`. Each rule's README documents why. `no-experimental-features` is the one that isn't opinion-driven: it succeeds v4's `checkExperimental` option, whose default was `false`, so enabling the rule stays an explicit opt-in. `compat` carries only its two siblings, `no-unsupported-browser-features` and `no-nonstandard-features`.
