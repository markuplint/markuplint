---
id: no-duplicate-attr
description: Warns that attributes were duplicated in one element. Names are compared as the DOM, or the framework, compares them.
---

# `no-duplicate-attr`

Warns that **attributes** were duplicated in one element. Names are compared as the DOM, or the framework, compares them.

Names are compared as the DOM compares them. The names of the attributes of an HTML element and of a custom element are compared without regard to ASCII case, and those of an SVG or MathML element that a framework sets through the DOM API (JSX for example), and the props of a component, are compared as written (`<Foo fooBar foobar />` is not a duplicate).

> There must never be two or more attributes on the same start tag whose names are an ASCII case-insensitive match for each other.

Cite: [HTML Living Standard 13.1.2.3 Attributes](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2:~:text=There%20must%20never%20be%20two%20or%20more%20attributes%20on%20the%20same%20start%20tag%20whose%20names%20are%20an%20ASCII%20case%2Dinsensitive%20match%20for%20each%20other.)

A directive of a framework is not an attribute of the DOM, so it is compared by the name that the framework counts as a repeat:

- Vue and Svelte compare the name as it is written, modifiers included. `@keydown.enter` and `@keydown.space`, `@keydown` and `@KEYDOWN`, and `@click` and `v-on:click` are not duplicates, while two `@keydown.enter` or two `:class` are. `:class` and `class` are not either, as Vue merges them.
- Vue also counts the bound attributes that it gives the same key as a repeat, because it keeps the first and drops the others without an error: `:id.prop` and `.id`, `:id.attr` and `v-bind:id.attr`, `:view-box.camel` and `:viewBox`, and `:id.foo` and `:id` (a modifier that Vue does not know is ignored).
- Svelte takes any number of the same `on:`, `use:` and `bind:this`.
- Alpine and htmx read the attributes that the HTML parser of the browser makes, so the case of a name is not distinguished, and a different spelling (`@click` and `x-on:click`, `hx-on:click` and `hx-on-click`) is another attribute.

❌ Examples of **incorrect** code for this rule

```html
<div data-attr="value" data-Attr="db"></div>
```

```vue
<template>
  <button @keydown.enter.stop="a" @keydown.enter.stop="b"></button>
</template>
```

✅ Examples of **correct** code for this rule

```html
<div data-attr="value" data-Attr2="db"></div>
```

```vue
<template>
  <button @keydown.enter="a" @keydown.space="b"></button>
</template>
```
