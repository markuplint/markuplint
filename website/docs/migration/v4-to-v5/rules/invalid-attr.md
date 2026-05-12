---
sidebar_position: 1
title: invalid-attr
---

# `invalid-attr` Rule Changes

This page covers breaking changes to the `invalid-attr` rule options and a set of **new values that the default rule now flags** — markup that was silently accepted in v4 may surface as errors after upgrading, even with no config changes.

## Summary

| Change                        | Who is affected                                                |
| ----------------------------- | -------------------------------------------------------------- |
| `{ type: X }` wrapper removed | Configs using `{ "value": { "type": "Int" } }`                 |
| `attrs` option deleted        | Configs using the deprecated `attrs` option                    |
| Object format deprecated      | Configs using object format for `allowAttrs` / `disallowAttrs` |
| Newly flagged values in v5    | Any project — new validations fire on existing markup          |

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
v5 tightens the default `invalid-attr` coverage in several areas that were previously accepted as `Any`. If you upgrade without touching your config, the markup below may raise violations it did not in v4.
:::

Each row cites the issue where the validation was introduced and the HTML / URL / Encoding Living Standard section that justifies it. If you hit a new violation you believe is incorrect, read the linked issue first — several of these land with spec-cited `excluded-ids.json` entries for cases where nu-validator was stricter than the spec.

| Area                              | Example that now fails                          | Issue                                                         | Spec                                                                                                                                                |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input[value]` by `type`          | `<input type="color" value="red">`              | [#3598](https://github.com/markuplint/markuplint/issues/3598) | [HTML LS — the `input` element](https://html.spec.whatwg.org/multipage/input.html#the-input-element)                                                |
| `link[as]` by `rel`               | `<link rel="preload" as="audio">`               | [#3189](https://github.com/markuplint/markuplint/issues/3189) | [HTML LS — the `link` element](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-as)                                                  |
| `img[role]` + `alt=""`            | `<img role="presentation" alt="">`              | [#3641](https://github.com/markuplint/markuplint/issues/3641) | [ARIA in HTML — `img`](https://w3c.github.io/html-aria/#el-img)                                                                                     |
| URL forbidden code points         | `<a href="http://example.com/">`                | [#3629](https://github.com/markuplint/markuplint/issues/3629) | [URL LS — URL code points](https://url.spec.whatwg.org/#url-code-points)                                                                            |
| `meta[content]` by `http-equiv`   | `<meta http-equiv="refresh" content="garbage">` | [#3734](https://github.com/markuplint/markuplint/issues/3734) | [HTML LS — meta `http-equiv`](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv)                                           |
| `media=` strict MQL5 grammar      | `<link media="screen and (color: 1em)">`        | [#3850](https://github.com/markuplint/markuplint/issues/3850) | [Media Queries Level 5 §4](https://www.w3.org/TR/mediaqueries-5/#mq-features)                                                                       |
| URL-typed attrs strict URL LS     | `<a href="http://user:pass@example.com">`       | [#3848](https://github.com/markuplint/markuplint/issues/3848) | [URL LS — URL parsing](https://url.spec.whatwg.org/#url-parsing)                                                                                    |
| Media `src` non-empty             | `<img src="">`                                  | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — valid non-empty URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces) |
| `<base href>` URL LS strict       | `<base href="http://user@example.com/">`        | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — set the frozen base URL](https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url)                                  |
| `<input type=url value>` absolute | `<input type="url" value="/relative">`          | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — URL state](<https://html.spec.whatwg.org/multipage/input.html#url-state-(type=url)>)                                                     |

### Patterns now flagged on URL-typed attributes (`href`, `src`, `action`, `cite`, `itemid`, `itemtype`, ...)

The `URL` type checker now surfaces URL Living Standard validation errors that `new URL()` silently auto-corrects. Any of the following — accepted under v4 — now raises an `invalid-attr` violation:

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
- **`<base href>`** now runs the full URL LS validator (in addition to the existing `data:` / `javascript:` scheme prohibition). Previously the type accepted any non-`data:`/`javascript:` value without further checks.
- **`<input type="url" value>`** now uses an absolute-URL variant that accepts empty values (per HTML LS §4.10.5.1.7 "if specified and not empty") but rejects relative URLs. Use a full `https://…` form or leave the attribute empty.

:::note Known stricter-than-nu case
Routing `<base href>` through the full URL Living Standard pipeline also enrols `<base href>` in Node's `URL.canParse` strictness. One side effect: hosts with an IPv4-shaped value whose final octet exceeds 255 (e.g., `<base href="http://192.168.0.257/">`) are now flagged as invalid by markuplint. URL LS technically allows the parser to fall back to treating the value as a regular hostname, and nu-validator accepts it, but `URL.canParse` does not implement that fallback. If this materially affects your project, [file an issue](https://github.com/markuplint/markuplint/issues/new/choose) — we are tracking it as a stricter-than-spec corner case rather than a hard requirement.
:::

### Patterns now flagged on `media=`

The `media` attribute on `link`, `style`, `source`, and `svg|style` is now validated by a dedicated `MediaQueryList` checker. Any of the following — silently accepted under v4's generic `<media-query-list>` route — now raises an `invalid-attr` violation:

- **Deprecated media types** (MQL5 §2.3): `<link media="aural">`, `<link media="tv">`, `<link media="projection">`, `<link media="handheld">`, `<link media="braille">`, `<link media="embossed">`, `<link media="speech">`, `<link media="tty">`. Replace with `screen` / `print` / `all`, or use a feature query.
- **Deprecated media features** (MQL4): `(device-width: ...)`, `(device-height: ...)`, `(device-aspect-ratio: ...)` and their `min-` / `max-` variants. Use `(width: ...)` / `(height: ...)` / `(aspect-ratio: ...)` instead.
- **Wrong-type feature values** (MQL5 §4): `(min-width: 400)` (length without unit), `(min-width: 400dpi)` (resolution unit on length feature), `(color: 1em)` (length unit on integer feature), `(resolution: 96)` (resolution without unit).
- **Negative integers on `<integer>` features** (MQL5 §4.4): `(color: -1)`, `(monochrome: -2)`, `(min-color-index: -1)`. The spec mandates non-negative.
- **Non-positive ratios on `<ratio>` features** (MQL5 §4.5): `(aspect-ratio: 0)`, `(aspect-ratio: 0/1)`, `(aspect-ratio: -1/1)`. The spec mandates strictly positive.

No config change is needed to opt in; conversely, these stricter checks cannot be rolled back individually. If a specific case breaks your workflow, [file an issue](https://github.com/markuplint/markuplint/issues/new/choose) with the failing markup and cite the governing spec paragraph — fixes for real spec misreads will be reverted or narrowed.
