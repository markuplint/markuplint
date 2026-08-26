---
id: no-duplicate-dt
description: No duplicate names in `<dl>`
---

# `no-duplicate-dt`

No duplicate names in `<dl>`.

:::info

Not included in any preset: `markuplint:html-standard` only admits rules for a HTML LS MUST; this is a SHOULD.

:::

❌ Examples of **incorrect** code for this rule

```html
<dl>
  <dt>Name 1</dt>
  <dd>Content 1</dd>
  <dt>Name 1</dt>
  <dd>Content 2</dd>
  <div>
    <dt>Name 1</dt>
    <dd>Content 3</dd>
  </div>
</dl>
```

✅ Examples of **correct** code for this rule

```html
<dl>
  <dt>Name 1</dt>
  <dd>Content 1</dd>
  <dt>Name 2</dt>
  <dd>Content 2</dd>
  <div>
    <dt>Name 3</dt>
    <dd>Content 3</dd>
  </div>
</dl>
```
