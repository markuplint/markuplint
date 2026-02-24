---
id: head-element-order
description: Warns if elements within `<head>` are not in the expected order.
---

# `head-element-order`

Warns if elements within `<head>` are not in the expected order.

The order is defined by an array of CSS selectors. Elements are sorted by the position of their first matching selector. Elements that don't match any selector are placed at the end, preserving their relative source order.

You can also specify alphabetical sorting within a group by using an object entry with `"order": "alphabetical"` and an `"attr"` key.

❌ Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<head>
  <title>Title</title>
  <meta charset="UTF-8">
</head>
```
<!-- prettier-ignore-end -->

✅ Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<head>
  <meta charset="UTF-8">
  <title>Title</title>
</head>
```
<!-- prettier-ignore-end -->

## Configuration

### Default value

```json
[
  "meta[charset]",
  "meta[http-equiv]",
  "meta[name=\"viewport\"]",
  "title",
  { "selector": "meta", "order": "alphabetical", "attr": "name" },
  "link",
  "style",
  "script"
]
```

#### Why this order?

- **`meta[charset]`** must appear within the first 1024 bytes of the document per the HTML specification. Placing it first ensures this constraint is met.
- **`meta[http-equiv]`** may affect how the browser interprets the document (e.g., `X-UA-Compatible`), so it should appear early.
- **`meta[name="viewport"]`** controls the initial viewport layout on mobile devices. Placing it before `<title>` avoids a potential layout shift during page load.
- **`title`** is required for accessibility and SEO, and commonly placed after critical meta elements.
- **`meta`** (remaining) such as `description`, `author`, etc. are sorted alphabetically by the `name` attribute for consistency.
- **`link`**, **`style`**, **`script`** follow the metadata elements. This matches the widely used convention in style guides and frameworks.

### Custom value

```json
{
  "head-element-order": [
    "meta[charset]",
    "meta[http-equiv]",
    "meta[name=\"viewport\"]",
    "title",
    { "selector": "meta", "order": "alphabetical", "attr": "name" },
    "link[rel=\"preconnect\"]",
    "link[rel=\"stylesheet\"]",
    "link",
    "style",
    "script[src][async]",
    "script[src][defer]",
    "script[src]",
    "script"
  ]
}
```

This advanced example separates `link` and `script` elements by their loading behavior, following [capo.js](https://github.com/rviscomi/capo.js/) performance recommendations. Elements like `<link rel="preconnect">` are placed before stylesheets, and async scripts are separated from synchronous ones.

### Order entry

Each entry can be a string (CSS selector) or an object with the following properties:

| Property   | Type                                 | Default          | Description                                             |
| ---------- | ------------------------------------ | ---------------- | ------------------------------------------------------- |
| `selector` | `string`                             | (required)       | CSS selector to match elements                          |
| `order`    | `"source-order"` \| `"alphabetical"` | `"source-order"` | Sort order within the group                             |
| `attr`     | `string`                             | -                | Attribute name to use as sort key for alphabetical sort |
