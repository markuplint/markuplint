---
id: itemprop-requires-itemscope
description: Require every itemprop to belong to an item.
---

# `itemprop-requires-itemscope`

Warns about an `itemprop` attribute that does not contribute a property to any item.

> For elements with no item, an `itemprop` attribute is in error.

Cite: [HTML Living Standard §5.2.4 — Names: the itemprop attribute](https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute)

An element belongs to an item if **either** of the following holds:

- it has an ancestor element with an `itemscope` attribute, or
- its `id` is referenced by some `itemscope` element's `itemref` token list.

<!-- prettier-ignore-end -->

❌ Examples of **incorrect** code for this rule

```html
<span itemprop="name">Orphan property</span>
```

✅ Examples of **correct** code for this rule

```html
<!-- An ancestor has itemscope -->
<div itemscope>
  <span itemprop="name">Inside an item</span>
</div>

<!-- Reachable via itemref -->
<div itemscope itemref="ref-name"></div>
<span id="ref-name" itemprop="name">Reachable via itemref</span>
```
