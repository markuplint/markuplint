---
id: no-duplicate-autofocus
description: Disallow multiple elements with the autofocus attribute in a document.
---

# `no-duplicate-autofocus`

Disallow multiple elements with the `autofocus` attribute in a document. Per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute), there must not be two elements with the `autofocus` attribute specified in the same document.

❌ Examples of **incorrect** code for this rule

```html
<input autofocus /> <button autofocus>Submit</button>
```

✅ Examples of **correct** code for this rule

```html
<input autofocus /> <button>Submit</button>
```
