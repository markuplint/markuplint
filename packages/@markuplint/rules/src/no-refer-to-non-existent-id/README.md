---
id: no-refer-to-non-existent-id
description: Check whether the ID or the list of ID specified to for, form, aria-*, and more are referencing an ID that exists in the same tree.
---

# `no-refer-to-non-existent-id`

Check whether the **ID** or the **list of ID** specified to `for`, `form`, `aria-*`, and more are referencing an ID that exists in the same tree. The document is one tree, the content of a `template` element is a tree of its own, and so is a declarative shadow root, so a reference does not reach an ID in another tree. The reference is compared with the ID after the character references in the markup are resolved. A `template` element that a declarative shadow root is attached to is in no tree and refers to nothing, and so is one that may have a shadow root (its parent is not in the file or is a component, or `shadowrootmode` is a dynamic value), as markuplint does not report what it cannot tell. In React and Vue, the children of a `template` element without a directive are in the tree of the document. A tree is not reported either when it has an element that may carry the ID but whose markup does not tell it: an element whose `id` is a value that code gives (`<h2 id={x}>`), one with a spread attribute that may carry or override it (`<h2 {...props}>`; not one before the `id`, which the `id` overrides), an attribute that replaces the children with markup (`v-html`, `x-html`, `dangerouslySetInnerHTML`), a component that no pretender resolves (not a built-in component of Vue, which holds what is written in it), a pretender whose `contents` has an unknown entry (`{ dynamic: true }`), and content that is not known (`{children}`, a block of a template language that has no behavior such as an include, the `slot` of Vue, Svelte and Astro). A pretender whose `contents` is declared stays checked. An ID that another file holds is not tracked: apart from those blocks and components, the file is taken to be the whole document.

A hyperlink **fragment** (`<a href="#…">` / `<area href="#…">`) is [`no-broken-fragment-link`](/docs/rules/no-broken-fragment-link)'s concern, not this rule's — split out because HTML LS does not treat a broken fragment link as a conformance violation, unlike the `DOMID`-typed attributes and ARIA ID references this rule covers.

❌ Examples of **incorrect** code for this rule

```html
<label for="foo">Text Field</label><input id="bar" type="text" />
```

✅ Examples of **correct** code for this rule

```html
<label for="foo">Text Field</label><input id="foo" type="text" />
```
