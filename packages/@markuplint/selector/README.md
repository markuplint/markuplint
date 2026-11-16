# @markuplint/selector

[![npm version](https://badge.fury.io/js/%40markuplint%2Fselector.svg)](https://www.npmjs.com/package/@markuplint/selector)

**Extended [W3C Selectors](https://www.w3.org/TR/selectors-4/) matcher**

Supported selectors and operators:

| Selector Type                                    | Code Example                                                                              | Support |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------- |
| Universal selector                               | `*`                                                                                       | ✅      |
| Type selector                                    | `div`                                                                                     | ✅      |
| ID selector                                      | `#id`                                                                                     | ✅      |
| Class selector                                   | `.class`                                                                                  | ✅      |
| Attribute selector                               | `[data-attr]`                                                                             | ✅      |
| Attribute selector, Exact match                  | `[data-attr=value]` `[data-attr=value i]`                                                 | ✅      |
| Attribute selector, Include whitespace separated | `[data-attr~=value]` `[data-attr~=value i]`                                               | ✅      |
| Attribute selector, Subcode match                | <code>[data-attr\|=value]</code> <code>[data-attr\|=value i]</code>                       | ✅      |
| Attribute selector, Partial match                | `[data-attr*=value]` `[data-attr*=value i]`                                               | ✅      |
| Attribute selector, Forward match                | `[data-attr^=value]` `[data-attr^=value i]`                                               | ✅      |
| Attribute selector, Backward match               | `[data-attr$=value]` `[data-attr$=value i]`                                               | ✅      |
| Negation pseudo-class                            | `:not(div)`                                                                               | ✅      |
| Matches-Any pseudo-class                         | `:is(div)`                                                                                | ✅      |
| Specificity-adjustment pseudo-class              | `:where(div)`                                                                             | ✅      |
| Relational pseudo-class                          | `:has(div)` `:has(> div)` `:has(+ div)` `:has(~ div)`                                     | ✅      |
| Directionality pseudo-class                      | `:dir(ltr)`                                                                               | ❌      |
| Language pseudo-class                            | `:lang(en)`                                                                               | ❌      |
| Hyperlink pseudo-class                           | `:any-link`                                                                               | ❌      |
| Link History pseudo-class                        | `:link` `:visited`                                                                        | ❌      |
| Local link pseudo-class                          | `:local-link`                                                                             | ❌      |
| Target pseudo-class                              | `:target`                                                                                 | ❌      |
| Target container pseudo-class                    | `:target-within`                                                                          | ❌      |
| Reference element pseudo-class                   | `:scope`                                                                                  | ✅      |
| Current-element pseudo-class                     | `:current` `:current(div)`                                                                | ❌      |
| Past pseudo-class                                | `:past`                                                                                   | ❌      |
| Future pseudo-class                              | `:future`                                                                                 | ❌      |
| Interactive pseudo-class                         | `:active` `:hover` `:focus` `:focus-within` `:focus-visible`                              | ❌      |
| Enable and disable pseudo-class                  | `:enable` `:disable`                                                                      | ❌      |
| Mutability pseudo-class                          | `:read-write` `:read-only`                                                                | ❌      |
| Placeholder-shown pseudo-class                   | `:placeholder-shown`                                                                      | ❌      |
| Default-option pseudo-class                      | `:default`                                                                                | ❌      |
| Selected-option pseudo-class                     | `:checked`                                                                                | ❌      |
| Indeterminate value pseudo-class                 | `:indeterminate`                                                                          | ❌      |
| Validity pseudo-class                            | `:valid` `:invalid`                                                                       | ❌      |
| Range pseudo-class                               | `:in-range` `:out-of-range`                                                               | ❌      |
| Optionality pseudo-class                         | `:required` `:optional`                                                                   | ❌      |
| Empty-Value pseudo-class                         | `:blank`                                                                                  | ❌      |
| User-interaction pseudo-class                    | `:user-invalid`                                                                           | ❌      |
| Root pseudo-class                                | `:root`                                                                                   | ✅      |
| Empty pseudo-class                               | `:empty`                                                                                  | ❌      |
| Nth-child pseudo-class                           | `:first-child`                                                                            | ✅      |
| Nth-child pseudo-class                           | `:nth-child(2)` `:nth-last-child(2)` `:last-child` `:only-child`                          | ❌      |
| Nth-child pseudo-class (`of El` Syntax)          | `:nth-child(2 of div)` `:nth-last-child(2 of div)`                                        | ❌      |
| Nth-of-type pseudo-class                         | `:nth-of-type(2)` `:nth-last-of-type(2)` `:first-of-type` `:last-of-type` `:only-of-type` | ❌      |
| Nth-col pseudo-class                             | `:nth-col(2)` `:nth-last-col(2)`                                                          | ❌      |
| Pseudo elements                                  | `::before` `::after`                                                                      | ❌      |
| Descendant combinator                            | `div span`                                                                                | ✅      |
| Child combinator                                 | `div > span` (`:has(> span)`)                                                             | ✅      |
| Next-sibling combinator                          | `div + span` (`:has(+ span)`)                                                             | ✅      |
| Subsequent-sibling combinator                    | `div ~ span` (`:has(~ span)`)                                                             | ✅      |
| Column combinator                                | <code>div \|\| span</code>                                                                | ❌      |
| Multiple selectors                               | `div, span`                                                                               | ✅      |

## Case sensitivity

Per HTML LS / Selectors Level 4 — Case sensitivity, names are matched
according to the element's namespace:

| Match target    | HTML namespace                                                                                            | SVG / MathML / custom elements                  |
| --------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Tag name        | ASCII case-insensitive (`DIV` matches `div`)                                                              | Case-sensitive                                  |
| Attribute name  | ASCII case-insensitive (`[CHARSET]` matches `<meta CHARSET>` and `<meta charset>`)                        | Case-sensitive (e.g. SVG `viewBox` ≠ `viewbox`) |
| Attribute value | Case-sensitive by default; use the `i` flag (e.g. `[lang="en" i]`) for case-insensitive value comparisons | Same                                            |
| Pseudo-class    | ASCII case-insensitive (`:NOT(div)` matches like `:not(div)`)                                             | Same                                            |

The `i` flag scopes to attribute **values** only — it does not affect
attribute name matching, which is governed by the namespace rules above.

## Extended Selector

The below is selectors that are extended by markuplint:

An argument that the pseudo-class does not accept (`:aria(foo)`, `:role(button|9.9)`, `:display-size(> a)`, or a `:model()` category the specification does not define) throws `InvalidSelectorError` when the selector is created, not when it meets an element. Created without `specs`, a selector checks the arguments that need none, and throws `InvalidSelectorError` when it is matched.

| Selector Type              | Code Example          |
| -------------------------- | --------------------- |
| ARIA pseudo-class          | `:aria(has name)`     |
| ARIA Role pseudo-class     | `:role(heading)`      |
| Content Model pseudo-class | `:model(interactive)` |
| Display Size pseudo-class  | `:display-size(> 1)`  |

### ARIA pseudo-class

```
:aria(syntax)
```

| Syntax        | Example              | Description                                    |
| ------------- | -------------------- | ---------------------------------------------- |
| `has name`    | `:aria(has name)`    | Matches the element has accessible name        |
| `has no name` | `:aria(has no name)` | Matches the element has **no** accessible name |

An element whose name may be in a branch of a conditional block (`{#if}` of Svelte, `<template x-if>` of Alpine.js, and the element that has `v-if`, `v-else-if`, `v-else` or `v-for` of Vue) has no name as written but may have one, so `has name` matches it and `has no name` does not.

### ARIA Role pseudo-class

```
:role(roleName)
:role(roleName|version)
```

For example, `:role(button)` matches `<button>` and `<div role="button">`.

You can specify the version of WAI-ARIA by separating the pipe like `:role(form|1.1)`.

### Content Model pseudo-class

```
:model(interactive)
:model(palpable)
```

For example, `:model(interactive)` matches `<a>`(with `href` attr), `<button>`, and so on.

A category that lists custom elements in the HTML Standard, such as `flow`, `phrasing` and `palpable`, also matches custom elements (`<x-foo>`) and components (`<Foo />`). An element that a component pretends to be is judged by the name it pretends to be: it matches only when that name contains a hyphen.

An element that the HTML Standard allows only as the first child of its parent matches only there: `:model(flow)` matches `<style>` only as the first child. The first child is counted as the HTML Standard counts it, so non-whitespace text before the element counts (comments and inter-element whitespace do not): the `<style>` in `<div>text<style>` does not match. A template expression before the element (`{{ msg }}`) does not count, as what it outputs is known only at run time; text and elements inside a conditional block count, as the content of the block is taken as present. `:first-child` written in a selector keeps the Selectors definition, which counts elements only.

### Display Size pseudo-class

```
:display-size(operator number)
```

The operator is one of `=`, `>`, `>=`, `<` and `<=`, and the number is a non-negative integer. For example, `select:is([multiple], :display-size(> 1))` matches a `<select>` that has the `multiple` attribute or whose display size is greater than 1.

It matches only a `<select>` element of the HTML namespace, and compares its [display size](https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-size). The display size is the number that the `size` attribute is parsed as by the rules for parsing non-negative integers, or, when the attribute is absent or cannot be parsed, 4 if the element has the `multiple` attribute and 1 if it has not. Leading whitespace, a `+` sign, leading zeros and trailing characters are allowed, so `size="01"` is 1, `size="2abc"` is 2, and `size="0"` is 0. An attribute selector cannot tell these apart, as `[size]:not([size="1"])` takes `size="01"` for something other than 1.

The `size` is read as the text it is written in, so a template expression (`:size="n"`) is not a number: its display size is the one for an attribute that cannot be parsed.

## Regex Selector

```json
{
  "nodeName": "/^[a-z]+$/",
  "attrName": "/^[a-z]+$/",
  "attrValue": "/^[a-z]+$/"
}
```

## Install

[`markuplint`](https://www.npmjs.com/package/markuplint) package includes this package.

<details>
<summary>If you are installing purposely, how below:</summary>

```shell
$ npm install @markuplint/selector

$ yarn add @markuplint/selector
```

</details>
