---
sidebar_position: 1
title: invalid-attr
---

# `invalid-attr` Rule Changes

This page covers the split of the `invalid-attr` rule, breaking changes to its options, and a set of **new values that the default rule now flags** — markup that was silently accepted in v4 may surface as errors after upgrading, even with no config changes.

## Summary

| Change                        | Who is affected                                                |
| ----------------------------- | -------------------------------------------------------------- |
| Rule split into four          | Every config using `invalid-attr`                              |
| `{ type: X }` wrapper removed | Configs using `{ "value": { "type": "Int" } }`                 |
| `attrs` option deleted        | Configs using the deprecated `attrs` option                    |
| Object format deprecated      | Configs using object format for `allowAttrs` / `disallowAttrs` |
| Newly flagged values in v5    | Any project — new validations fire on existing markup          |

## Rule split into four

`invalid-attr` bundled four independent checks. Each is now its own rule, so you can enable, disable, or re-severity them independently:

| New rule                | What it checks                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `no-unknown-attr`       | Attribute name not defined by the spec at all — typo candidates, case mismatches                                           |
| `no-disallowed-attr`    | Attribute defined but disallowed here: `noUse`, an unmet conditional-allow condition, `is` on an autonomous custom element |
| `no-invalid-attr-value` | Attribute value type/grammar violation                                                                                     |
| `no-restricted-attr`    | User-defined `disallowAttrs` denylisting — its only option                                                                 |

`aria-*` and `role` are exempt from all three spec-checking rules — `no-unknown-attr`, `no-disallowed-attr`, and `no-invalid-attr-value` all skip them. The ARIA rules own them instead, `no-aria-on-unsupported-element` in particular.

The old options are routed to the new rules rather than copied wholesale:

| Old option                         | Lands on                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `allowAttrs`                       | `no-unknown-attr`, `no-disallowed-attr`, and `no-invalid-attr-value` (all three) |
| `ignoreAttrNamePrefix`             | `no-unknown-attr` and `no-disallowed-attr`                                       |
| `allowToAddPropertiesForPretender` | `no-unknown-attr` only                                                           |
| `disallowAttrs`                    | `no-restricted-attr` only                                                        |

`no-restricted-attr` is added to the expansion only when your old config actually set `disallowAttrs`. A bare `invalid-attr: true` never enables a rule with nothing to restrict.

:::tip
`invalid-attr` keeps working. Markuplint reports a deprecation warning and performs this expansion automatically, until the old name is removed in v6. The full split list is in [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names).
:::

The rest of this page describes the option formats as you would write them under the old name. When rewriting by hand, apply each option to the new rule the table above names.

## `{ type: X }` wrapper removed

:::caution Breaking Change
The `{ type: X }` wrapper object for attribute values has been removed. Specify the type string directly.
:::

**Before (v4):**

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-count",
          "value": { "type": "Int" }
        }
      ]
    }
  }
}
```

**After (v5):**

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-count",
          "value": "Int"
        }
      ]
    }
  }
}
```

:::note
`{ enum: [...] }` and `{ pattern: "..." }` formats continue to work as before. Only the `{ type: X }` wrapper is removed.
:::

## `attrs` option deleted

:::caution Breaking Change
The `attrs` option has been removed. It was deprecated since v3.7.0. Use `allowAttrs` and `disallowAttrs` instead.
:::

**Before (v4):**

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-data": { "type": "Any" },
        "x-count": { "type": "Int" },
        "x-color": { "enum": ["red", "blue"] },
        "x-id": { "pattern": "/^[a-z]+$/" },
        "x-banned": { "disallowed": true }
      }
    }
  }
}
```

**After (v5):**

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        "x-data",
        { "name": "x-count", "value": "Int" },
        { "name": "x-color", "value": { "enum": ["red", "blue"] } },
        { "name": "x-id", "value": { "pattern": "/^[a-z]+$/" } }
      ],
      "disallowAttrs": ["x-banned"]
    }
  }
}
```

Key differences:

- Allowed attributes go into `allowAttrs` as an array
- Attributes with `"disallowed": true` go into `disallowAttrs`
- Attributes without a value constraint can be specified as a plain string (e.g., `"x-data"`)

## Object format deprecated

:::info Deprecation Warning
The object format for `allowAttrs` and `disallowAttrs` still works in v5, but it will be removed in a future version. Switch to the array format now.
:::

**Before (object format):**

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": {
        "x-attr": "Int"
      }
    }
  }
}
```

**After (array format):**

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-attr",
          "value": "Int"
        }
      ]
    }
  }
}
```

## Newly flagged values in v5

:::info Behavioral change (no config action required)
v5 tightens the default attribute-value coverage in several areas that were previously accepted as `Any`. If you upgrade without touching your config, the markup below may raise violations it did not in v4.

Because of the split, `ruleId` in your CI output changes too. Each item below names the v5 rule that reports it — mostly `no-invalid-attr-value`, with `no-disallowed-attr` for unmet conditional-allow conditions and `require-attr` for missing attributes.
:::

Each row cites the issue where the validation was introduced and the HTML / URL / Encoding Living Standard section that justifies it. If you hit a new violation you believe is incorrect, read the linked issue first — several of these land with spec-cited `excluded-ids.json` entries for cases where nu-validator was stricter than the spec.

| Area                                                                             | Example that now fails                                                                                     | Issue                                                         | Spec                                                                                                                                                |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input[value]` by `type`                                                         | `<input type="color" value="red">`                                                                         | [#3598](https://github.com/markuplint/markuplint/issues/3598) | [HTML LS — the `input` element](https://html.spec.whatwg.org/multipage/input.html#the-input-element)                                                |
| `link[as]` by `rel`                                                              | `<link rel="preload" as="audio">`                                                                          | [#3189](https://github.com/markuplint/markuplint/issues/3189) | [HTML LS — the `link` element](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-as)                                                  |
| `img[role]` + `alt=""`                                                           | `<img role="presentation" alt="">`                                                                         | [#3641](https://github.com/markuplint/markuplint/issues/3641) | [ARIA in HTML — `img`](https://w3c.github.io/html-aria/#el-img)                                                                                     |
| URL forbidden code points                                                        | `<a href="http://example.com/">`                                                                           | [#3629](https://github.com/markuplint/markuplint/issues/3629) | [URL LS — URL code points](https://url.spec.whatwg.org/#url-code-points)                                                                            |
| `meta[content]` by `http-equiv` (`refresh` / `content-type` / `x-ua-compatible`) | `<meta http-equiv="refresh" content="garbage">`<br />`<meta http-equiv="X-UA-Compatible" content="IE=10">` | [#3734](https://github.com/markuplint/markuplint/issues/3734) | [HTML LS — meta `http-equiv`](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv)                                           |
| `media=` strict MQL5 grammar                                                     | `<link media="screen and (color: 1em)">`                                                                   | [#3850](https://github.com/markuplint/markuplint/issues/3850) | [Media Queries Level 5 §4](https://www.w3.org/TR/mediaqueries-5/#mq-features)                                                                       |
| URL-typed attrs strict URL LS                                                    | `<a href="http://user:pass@example.com">`                                                                  | [#3848](https://github.com/markuplint/markuplint/issues/3848) | [URL LS — URL parsing](https://url.spec.whatwg.org/#url-parsing)                                                                                    |
| Media `src` non-empty                                                            | `<img src="">`                                                                                             | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — valid non-empty URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces) |
| `<base href>` URL LS strict                                                      | `<base href="http://user@example.com/">`                                                                   | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — set the frozen base URL](https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url)                                  |
| `<input type=url value>` absolute                                                | `<input type="url" value="/relative">`                                                                     | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — URL state](<https://html.spec.whatwg.org/multipage/input.html#url-state-(type=url)>)                                                     |
| Form-submission URLs non-empty                                                   | `<form action="">`                                                                                         | —                                                             | [HTML LS — valid non-empty URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces) |
| `<video poster>` non-empty                                                       | `<video poster="" src="movie.mp4">`                                                                        | —                                                             | [HTML LS — `video` `poster`](https://html.spec.whatwg.org/multipage/media.html#attr-video-poster)                                                   |
| `<base>` needs href or target                                                    | `<base>`                                                                                                   | —                                                             | [HTML LS — the `base` element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element)                                              |
| `<input type=image>` requires alt                                                | `<input type="image" src="b.png">`                                                                         | —                                                             | [HTML LS — input image button](<https://html.spec.whatwg.org/multipage/input.html#image-button-state-(type=image)>)                                 |
| Standalone `autocomplete=webauthn`                                               | `<input autocomplete="webauthn">`                                                                          | —                                                             | [HTML LS — `webauthn` token](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn)                 |
| `<select autocomplete>` cannot include `webauthn`                                | `<select autocomplete="section-a billing work tel-country-code webauthn">`                                 | —                                                             | [HTML LS — `webauthn` token](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn)                 |
| `<input type=hidden autocomplete>` rejects `on` / `off`                          | `<input type="hidden" autocomplete="on">`                                                                  | —                                                             | [HTML LS — autofill anchor mantle](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle)                  |
| `input[name="isindex"]` forbidden                                                | `<input type="text" name="isindex">`                                                                       | —                                                             | [HTML LS — the `name` attribute](https://html.spec.whatwg.org/multipage/forms.html#attr-fe-name)                                                    |
| `srcset` duplicate descriptors                                                   | `<img srcset="a 1x, b 1x">`                                                                                | —                                                             | [HTML LS — `srcset` attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)                                               |
| `link[disabled]` needs stylesheet                                                | `<link rel="icon" href="x" disabled>`                                                                      | —                                                             | [HTML LS — `link[disabled]`](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-disabled)                                              |
| `rel="alternate stylesheet"` title                                               | `<link rel="alternate stylesheet" href="x">`                                                               | —                                                             | [HTML LS — alternate stylesheet](https://html.spec.whatwg.org/multipage/links.html#rel-alternate-stylesheet)                                        |
| `lang` / `hreflang` IANA registry validation                                     | `<html lang="zzz">`                                                                                        | [#3829](https://github.com/markuplint/markuplint/issues/3829) | [RFC 5646 §2.2.9](https://www.rfc-editor.org/rfc/rfc5646.html#section-2.2.9)                                                                        |

### Patterns now flagged on URL-typed attributes (`href`, `src`, `action`, `cite`, `itemid`, `itemtype`, ...)

The `URL` type checker now surfaces URL Living Standard validation errors that `new URL()` silently auto-corrects. Any of the following — accepted under v4 — now raises a `no-invalid-attr-value` violation:

- **invalid-credentials** ([URL LS §1.1](https://url.spec.whatwg.org/#invalid-credentials)): `<a href="http://user:pass@example.com">`, `<a href="//user@example.com">`, even `<a href="http://@example.com">` (empty userinfo is still an `@` in the authority). Strip the userinfo from the URL.
- **special-scheme-missing-following-solidus** ([URL LS](https://url.spec.whatwg.org/#special-scheme-missing-following-solidus)): `<a href="http:foo">`, `<a href="https:/foo">`, `<a href="ftp:bar">`. Special-scheme URLs require `scheme://`.
- **file-scheme-missing-following-solidus** ([URL LS](https://url.spec.whatwg.org/#file-scheme-missing-following-solidus)): `<a href="file:foo">`, `<a href="file:/foo">`, `<a href="file:">`. Use the three-slash form `file:///path`.
- **invalid-reverse-solidus** ([URL LS](https://url.spec.whatwg.org/#invalid-reverse-solidus)): `<a href="http://example.com\foo">`, `<a href="/foo\bar">`. URL LS auto-converts `\` to `/` in special-scheme URLs but reports a validation error; non-special schemes (`data:`, `mailto:`) treat `\` as opaque-path content and remain accepted.
- **file-invalid-Windows-drive-letter** ([URL LS](https://url.spec.whatwg.org/#file-invalid-windows-drive-letter)): `<a href="file:///C|/foo">`. URL LS auto-corrects `C|` to `C:`. Use the colon form.
- **multiple `#`** ([URL LS — invalid-URL-unit](https://url.spec.whatwg.org/#invalid-url-unit) in fragment state): `<a href="http://example.com/#a#b">`. The second `#` is auto-percent-encoded but invalid per the URL writing grammar. Percent-encode the inner `#` (`%23`) or remove it.
- **brackets outside the IPv6 host** ([URL LS — invalid-URL-unit](https://url.spec.whatwg.org/#invalid-url-unit)): `<a href="[61:24:74]:98">` (relative URL with IPv6-looking brackets), `<a href="http://example.com/path[a]">`. `[`/`]` are URL code points only inside the host position of a special-scheme URL.
- **`data:` URL missing `,`** ([RFC 2397](https://datatracker.ietf.org/doc/html/rfc2397)): `<a href="data:">`, `<a href="data:/example.com/">`. Add the mandatory `,` separator before the data payload.

### Patterns now flagged on media `src`, `<base href>`, and `<input type=url value>`

Beyond the generic URL LS pipeline above, three specialised URL types tighten further:

- **`<audio src>`, `<embed src>`, `<iframe src>`, `<img src>`, `<input type=image src>`, `<script src>`, `<source src>`, `<track src>`, `<video src>`** now use a `NonEmptyURL` type that rejects values which are empty (or whitespace-only) after stripping ASCII whitespace. HTML LS §4.8 spells these as "valid non-empty URL potentially surrounded by spaces".
- **`<form action>`, `<button formaction>`, `<input formaction>`, `<object data>`, `<link href>`, `<video poster>`** now use the same `NonEmptyURL` type. Each is spec-defined as "valid non-empty URL potentially surrounded by spaces" but was previously typed as the empty-allowing `URL`. Empty strings (and whitespace-only values) now raise a `no-invalid-attr-value` violation.
- **`<base>` must have `href`, `target`, or both** (HTML LS §4.2.3). The bare `<base>` element used to pass silently; the `require-attr` rule now flags it. Adding either attribute satisfies the requirement.
- **`<input type="image">` must have an `alt` attribute** (HTML LS §4.10.5.1.18). The `require-attr` rule now fires when `type="image"` is present without `alt`.
- **`autocomplete="webauthn"` alone is non-conforming** (HTML LS §4.10.18.7). The `webauthn` token "must appear along with at least one other token". `<input autocomplete="webauthn">` now raises a violation; combinations like `autocomplete="name webauthn"` remain valid.
- **`<select autocomplete>` cannot include the `webauthn` token** (HTML LS §attr-fe-autocomplete-webauthn). The spec restricts `webauthn` to `<input>` and `<textarea>`: "webauthn is only valid for input and textarea elements." A `<select>` whose `autocomplete` ends in `webauthn` (e.g. `autocomplete="section-a billing work tel-country-code webauthn"`) now raises a `no-invalid-attr-value` violation targeting the `webauthn` token; the same autofill grammar without `webauthn` remains valid on `<select>`. `<textarea>` and non-hidden `<input>` are unaffected.
- **`<input type="hidden">` `autocomplete` cannot include `on` / `off`** (HTML LS §autofill-anchor-mantle). Hidden inputs wear the _autofill anchor mantle_ whose value "must have a value that is an ordered set of space-separated tokens consisting of just autofill detail tokens (i.e. the 'on' and 'off' keywords are not allowed)." Migrate to a concrete field name (`autocomplete="transaction-currency"` etc.) or drop the attribute. Non-hidden `<input>` continues to accept `on` / `off`.
- **`<input name="isindex">` is reserved** (HTML LS §4.10.18.2). The literal value `isindex` was kept reserved when the obsolete `<isindex>` element was removed; the `name` attribute on `<input>` now flags it. The check is case-sensitive (matches the spec literal).
- **`srcset` duplicate descriptors are non-conforming** (HTML LS §4.8.4.4.1). "An invalid image candidate string is one with [...] a duplicate descriptor." The `Srcset` type checker now rejects repeats in either the density slot (`1x, 1x`, `1x, 1.0x`, or an omitted descriptor — implicit 1x — combined with `1x`) or the width slot (`480w, 480w`). Numeric equality is used so different lexical forms of the same value still collide.
- **`<link disabled>` is only valid on `rel="stylesheet"`** (HTML LS §4.6.7.18). The `disabled` content attribute "must only be specified on link elements that have a rel attribute that contains the stylesheet keyword." A bare `<link rel="icon" disabled>` now raises a `no-disallowed-attr` violation — the attribute is spec-defined but its conditional-allow condition is unmet here.
- **`<link rel="alternate stylesheet">` requires a non-empty `title`** (HTML LS §4.6.7.4). When `rel` contains both `alternate` and `stylesheet`, the spec mandates a `title` attribute "with a non-empty value". The `require-attr` rule fires when `title` is missing, and `no-invalid-attr-value` fires for an explicit empty `title=""` (the conditional `NoEmptyAny` type override).
- **`<base href>`** now runs the full URL LS validator (in addition to the existing `data:` / `javascript:` scheme prohibition). Previously the type accepted any non-`data:`/`javascript:` value without further checks.
- **`<input type="url" value>`** now uses an absolute-URL variant that accepts empty values (per HTML LS §4.10.5.1.7 "if specified and not empty") but rejects relative URLs. Use a full `https://…` form or leave the attribute empty.

:::note Known stricter-than-nu case
Routing `<base href>` through the full URL Living Standard pipeline also enrols `<base href>` in Node's `URL.canParse` strictness. One side effect: hosts with an IPv4-shaped value whose final octet exceeds 255 (e.g., `<base href="http://192.168.0.257/">`) are now flagged as invalid by markuplint. URL LS technically allows the parser to fall back to treating the value as a regular hostname, and nu-validator accepts it, but `URL.canParse` does not implement that fallback. If this materially affects your project, [file an issue](https://github.com/markuplint/markuplint/issues/new/choose) — we are tracking it as a stricter-than-spec corner case rather than a hard requirement.
:::

### Language tags validated against the IANA registry (`lang`, `hreflang`, `srclang`, ...)

HTML LS requires the `lang` attribute to be ["a valid BCP 47 language tag"](https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes), and [RFC 5646 §2.2.9](https://www.rfc-editor.org/rfc/rfc5646.html#section-2.2.9) defines _valid_ as: "Either the tag is in the list of grandfathered tags or all of its primary language, extended language, script, region, and variant subtags appear in the IANA Language Subtag Registry as of the particular registry date." v4 only checked the syntactic shape (well-formedness); v5 additionally checks each subtag against the [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry), supplied by the [`language-subtag-registry`](https://www.npmjs.com/package/language-subtag-registry) npm package (updating that dependency refreshes the data).

Applies to every `BCP47`-typed attribute: `lang` / `xml:lang` (HTML and SVG), `hreflang`, `<track srclang>`, and SVG `systemLanguage`.

Now flagged:

- **Unregistered primary language subtag**: `lang="zzz"` — `zzz` is not assigned in ISO 639 / the IANA registry.
- **Unregistered extended language subtag**: `lang="bat-smg"` — `smg` (Samogitian) is a primary language subtag, not a registered extlang; write `lang="sgs"` instead.
- **Unregistered script / region / variant subtags**: `en-Qzzz`, `en-Zzzz-ZY`, and similar.
- **Duplicate variant subtags** (`de-DE-1901-1901`) and **duplicate singleton (extension) subtags** (`en-a-bbb-a-ccc`), per the remaining RFC 5646 §2.2.9 validity conditions.

Still valid:

- **Grandfathered tags** — both those with a modern replacement (`i-klingon`) and those without (`i-default`).
- **Deprecated subtags** (`lang="mo"`) — deprecation does not revoke registration; RFC 5646 validity draws no distinction. nu-validator reports these as warnings only, and markuplint follows suit by not flagging them.
- **Private-use tags and subtags** — `x-default`, `qaa`, `en-Qaaa`, `en-XA` (the registry's `qaa..qtz` / `qaaa..qabx` / `qm..qz` / `xa..xz` ranges).
- **Extension sequences** (`en-u-ca-gregory`) — extension subtags are governed by their own RFCs, which RFC 5646 §2.2.9 defines as a stricter conformance class than plain validity.

### Patterns now flagged on `media=`

The `media` attribute on `link`, `style`, `source`, and `svg|style` is now validated by a dedicated `MediaQueryList` checker. Any of the following — silently accepted under v4's generic `<media-query-list>` route — now raises a `no-invalid-attr-value` violation:

- **Deprecated media types** (MQL5 §2.3): `<link media="aural">`, `<link media="tv">`, `<link media="projection">`, `<link media="handheld">`, `<link media="braille">`, `<link media="embossed">`, `<link media="speech">`, `<link media="tty">`. Replace with `screen` / `print` / `all`, or use a feature query.
- **Deprecated media features** (MQL4): `(device-width: ...)`, `(device-height: ...)`, `(device-aspect-ratio: ...)` and their `min-` / `max-` variants. Use `(width: ...)` / `(height: ...)` / `(aspect-ratio: ...)` instead.
- **Wrong-type feature values** (MQL5 §4): `(min-width: 400)` (length without unit), `(min-width: 400dpi)` (resolution unit on length feature), `(color: 1em)` (length unit on integer feature), `(resolution: 96)` (resolution without unit).
- **Negative integers on `<integer>` features** (MQL5 §4.4): `(color: -1)`, `(monochrome: -2)`, `(min-color-index: -1)`. The spec mandates non-negative.
- **Non-positive ratios on `<ratio>` features** (MQL5 §4.5): `(aspect-ratio: 0)`, `(aspect-ratio: 0/1)`, `(aspect-ratio: -1/1)`. The spec mandates strictly positive.

### Malformed media conditions on `media=` and `sizes=` (`<general-enclosed>` rejection)

[Media Queries Level 5 §3](https://www.w3.org/TR/mediaqueries-5/#general-enclosed) explicitly forbids `<general-enclosed>` in author stylesheets — it exists only so future syntax additions parse in older user agents. v4 accepted a `<media-condition>` that fell through to `<general-enclosed>` because css-tree's grammar tolerates it; v5 rejects it as a `no-invalid-attr-value` violation.

Now flagged in `media=` on `link` / `style` / `source` / `svg|style`, and in `sizes=` on `img` / `source`:

- `(min-width:)` — empty value after the colon.
- `(123)` — number token where an `<ident>` is expected.
- Any other `(...)` shape that fails `<media-feature>` grammar and only matches the `<general-enclosed>` fallback.

Well-formed `(<ident>: <value>)` shapes with unknown feature names (e.g. `(-webkit-min-device-pixel-ratio: 2)`, `(future-feature: 42)`) still pass — css-tree parses them as `Feature`, not `GeneralEnclosed`, so forward-compatibility with future MQ additions is preserved.

Inside `sizes=`, CSS function calls in a `<source-size-value>` (`clamp(...)`, `min(...)`, `max(...)`, `calc(...)`, `env(...)`) are explicitly skipped — their parenthesised argument lists are not media conditions.

No config change is needed to opt in; conversely, these stricter checks cannot be rolled back individually. If a specific case breaks your workflow, [file an issue](https://github.com/markuplint/markuplint/issues/new/choose) with the failing markup and cite the governing spec paragraph — fixes for real spec misreads will be reverted or narrowed.
