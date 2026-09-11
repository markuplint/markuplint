---
id: no-mismatched-aspect-ratio
description: Warns when the width/height attributes of an img or source element do not match the actual image aspect ratio.
---

# `no-mismatched-aspect-ratio`

Warns when the `width` and `height` attributes of an `<img>` or `<source>` (inside `<picture>`) element do not match the actual aspect ratio of the referenced image file.

Incorrect `width`/`height` attributes can cause layout shifts (CLS) because the browser reserves space based on these values before the image loads. If they don't match the intrinsic aspect ratio, the layout will jump when the image finishes loading.

## How It Works

- `<img>` elements with `src`, `width`, and `height` attributes are checked.
- `<source>` elements inside `<picture>` with `srcset`, `width`, and `height` attributes are also checked. The first URL from the `srcset` attribute is used for dimension lookup.
- Remote URLs (`http://`, `https://`) and data URIs (`data:`) are skipped.
- If the image file cannot be found or read, no violation is reported (silent skip).
- Dynamic attribute values (e.g., Vue `:src`, JSX `src={...}`) and elements with spread attributes are skipped.
- Query strings (`?v=123`) and fragments (`#section`) in `src` are stripped when resolving the file path, but preserved in the cache key. This mirrors browser cache-busting behavior: the same file with different query strings is treated as a separate cache entry.
- The comparison allows a ±0.5 pixel tolerance: `width`/`height` attributes are integers, so an image whose intrinsic ratio doesn't divide evenly can never have an exact integer match. The tolerance is computed via cross-multiplication (`|attrWidth * actualHeight - attrHeight * actualWidth| / actualWidth`) to avoid floating-point errors while still expressing the mismatch in pixel-equivalent units.
- Image dimensions are cached in a temporary directory to avoid redundant file reads.

## Options

### `documentRoot`

**Type:** `string`
**Default:** `process.cwd()`

Root directory for resolving absolute image paths (paths starting with `/`). Relative paths are resolved from the document's file location if available, otherwise from `documentRoot`.

```json
{
  "no-mismatched-aspect-ratio": {
    "value": true,
    "options": {
      "documentRoot": "./public"
    }
  }
}
```

## Examples

❌ Examples of **incorrect** code for this rule

```html
<!-- Image is 100x50 but attributes say 100x100 -->
<img src="/photo.png" width="100" height="100" alt="photo" />
```

✅ Examples of **correct** code for this rule

```html
<!-- Image is 100x50, attributes match the 2:1 ratio -->
<img src="/photo.png" width="100" height="50" alt="photo" />

<!-- Scaled proportionally (still 2:1) -->
<img src="/photo.png" width="200" height="100" alt="photo" />
```
