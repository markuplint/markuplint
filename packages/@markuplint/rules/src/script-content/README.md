---
id: script-content
description: Validate the body of `<script>` elements when the `type` attribute selects a content format that has a spec.
---

# `script-content`

Validate the body of `<script>` elements against the spec that governs the value of its `type` attribute.

Currently supported content formats:

| `type` value       | Spec                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `importmap`        | [HTML Living Standard § Parse an import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string) |
| `speculationrules` | [HTML Living Standard § 7.6 Speculation rules](https://html.spec.whatwg.org/multipage/speculative-loading.html)                        |

`type` attribute matching is ASCII case-insensitive, matching how user agents look up the script's effective MIME type.

## `type="importmap"`

The rule reports the following issues for inline import maps:

- The element body is empty or whitespace-only
- The body cannot be parsed as JSON
- The top-level value is not a JSON object
- The top-level value contains a key other than `imports`, `scopes`, or `integrity`
- `imports` or `scopes` is not a JSON object
- A specifier map (`imports`, or a value inside `scopes`) contains an empty key
- A specifier map address (the value side) is not a string
- A specifier map address is not a URL-like specifier (does not start with `/`, `./`, `../`, and is not an absolute URL)
- A specifier key ends with `/` but its address does not
- `integrity` is not a JSON object
- An `integrity` key is not a URL-like specifier
- An `integrity` value is not a string

❌ Examples of **incorrect** code for this rule

```html
<script type="importmap"></script>
<script type="importmap">
  {
    "forbidden": {}
  }
</script>
<script type="importmap">
  {
    "imports": {
      "dir/": "/path/to/dir"
    }
  }
</script>
```

✅ Examples of **correct** code for this rule

```html
<script type="importmap">
  {
    "imports": {
      "app": "/path/to/app.js",
      "dir/": "/path/to/dir/"
    },
    "scopes": {
      "/scope/": {
        "x": "./y.js"
      }
    }
  }
</script>
```

## `type="speculationrules"`

[Speculation Rules](https://html.spec.whatwg.org/multipage/speculative-loading.html) are defined in the HTML Living Standard § 7.6 (the feature originated as the WICG `nav-speculation` draft, which now redirects to the HTML Standard). The rule reports the following issues for inline speculation rules:

- The element body is empty, whitespace-only, or cannot be parsed as JSON
- The top-level value is not a JSON object, or has no `prefetch` or `prerender` property
- A top-level key other than `tag`, `prefetch`, or `prerender` is present
- A `prefetch` / `prerender` value is not a JSON array, or a rule in it is not a JSON object
- A rule has a key other than `source`, `urls`, `where`, `relative_to`, `eagerness`, `referrer_policy`, `tag`, `requires`, `expects_no_vary_search`, or `target_hint`
- `source` is not a string, or is a value other than `list` or `document`
- A list rule (explicit or inferred from `urls`) is missing `urls`, or has a `where`
- A document rule (explicit or inferred from `where`) is missing `where`, or has `urls`
- A rule has no `source` and its source cannot be inferred (it has neither `urls` nor `where`, or has both)
- `urls` is not a JSON array, is empty, or contains a non-string or empty-string item
- `eagerness` is not a string, or is a value other than `immediate`, `eager`, `moderate`, or `conservative`
- `where` is not a JSON object, or does not contain exactly one predicate (`and`, `or`, `not`, `href_matches`, or `selector_matches`)
- An `and` / `or` predicate is not a JSON array, or is empty
- An `href_matches` / `selector_matches` pattern is not a string or an array of strings, is empty, or contains an empty-string item

❌ Examples of **incorrect** code for this rule

```html
<script type="speculationrules">
  {
    "prefetch": [{ "source": "list" }]
  }
</script>
<script type="speculationrules">
  {
    "prefetch": [{ "source": "document", "where": {} }]
  }
</script>
```

✅ Examples of **correct** code for this rule

```html
<script type="speculationrules">
  {
    "prefetch": [
      {
        "source": "document",
        "where": {
          "and": [{ "href_matches": "/*" }, { "not": { "selector_matches": ".no-prefetch" } }]
        },
        "eagerness": "moderate"
      }
    ],
    "prerender": [{ "source": "list", "urls": ["/next"] }]
  }
</script>
```
