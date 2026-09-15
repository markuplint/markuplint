---
id: valid-speculation-rules
description: Validate the body of `<script type="speculationrules">` elements against the Speculation Rules spec.
---

# `valid-speculation-rules`

Validate the body of `<script type="speculationrules">` elements against [HTML Living Standard § 7.6 Speculation rules](https://html.spec.whatwg.org/multipage/speculative-loading.html) (the feature originated as the WICG `nav-speculation` draft, which now redirects to the HTML Standard). `type` attribute matching is ASCII case-insensitive, matching how user agents look up the script's effective MIME type.

Split out of the former `script-content` rule, alongside [`valid-importmap`](/docs/rules/valid-importmap) for `type="importmap"`.

The rule reports the following issues for inline speculation rules:

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
