---
id: valid-importmap
description: Validate the body of `<script type="importmap">` elements against the import map spec.
---

# `valid-importmap`

Validate the body of `<script type="importmap">` elements against [HTML Living Standard § Parse an import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string). `type` attribute matching is ASCII case-insensitive, matching how user agents look up the script's effective MIME type.

Split out of the former `script-content` rule, alongside [`valid-speculation-rules`](/docs/rules/valid-speculation-rules) for `type="speculationrules"`.

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
