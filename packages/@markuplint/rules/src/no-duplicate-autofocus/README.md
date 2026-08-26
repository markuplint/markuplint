---
id: no-duplicate-autofocus
description: Disallow multiple elements with the autofocus attribute sharing the same autofocus scoping root.
---

# `no-duplicate-autofocus`

Disallow multiple elements with the `autofocus` attribute specified within the same [autofocus scoping root](https://html.spec.whatwg.org/multipage/interaction.html#nearest-ancestor-autofocus-scoping-root-element). Per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute), there must not be two elements with the `autofocus` attribute specified that share the same nearest ancestor autofocus scoping root element.

The scoping root for an element is the element itself if it is a `dialog` element or has a `popover` attribute; otherwise it is the nearest such ancestor, or the document as a whole if there is none. Two `dialog` or `popover` elements can therefore each carry their own `autofocus` target without conflict.

❌ Examples of **incorrect** code for this rule

```html
<input autofocus /> <button autofocus>Submit</button>
```

```html
<dialog>
  <input autofocus />
  <button autofocus>Submit</button>
</dialog>
```

✅ Examples of **correct** code for this rule

```html
<input autofocus /> <button>Submit</button>
```

```html
<dialog><input autofocus /></dialog>
<dialog><button autofocus>Submit</button></dialog>
```
