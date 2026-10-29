---
id: no-aria-on-presentational-children
description: Warns when ARIA attributes are set on descendants of roles with presentational children.
---

# `no-aria-on-presentational-children`

Warns when ARIA attributes are set on descendants of roles with presentational children.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

The descendants are left out of the accessibility tree, but their text is not:

> However, the text content of any excluded descendants is included.

Cite: [WAI-ARIA §7.1 Excluding Elements from the Accessibility Tree](https://w3c.github.io/aria/#tree_exclusion)

That text is used where a name or a description is computed from the content: the accessible name of an ancestor whose role takes its name from its content (such as `button`, `checkbox`, `option`, `radio`, `switch` or `tab`), and the text of an ancestor that `aria-labelledby` or `aria-describedby` refers to, whatever its role. The rule does not report an attribute that changes what a descendant contributes to such a text:

- `aria-hidden="true"`, unless the `hidden` attribute already hides the descendant
- a non-empty `aria-label` on a descendant that is not hidden and is not an embedded control (such as a text field), whose `aria-label` the computation ignores
- an `aria-labelledby` that refers to an element, except while the text is itself collected for an `aria-labelledby`
- `role="none"` or `role="presentation"` that drops the text alternative of a descendant, such as the `alt` of an `<img>` or the `<title>` of an `<svg>`

It reports them when the computation does not reach the descendant: the ancestor is hidden or is named by `aria-label` or another source before its content, or an element in between is hidden or named that way.

❌ Examples of **incorrect** code for this rule

The button is named by its `aria-label`, so its content, and the `aria-hidden` on the icon, take no part in the name.

```html
<div role="img"><span aria-label="text"></span></div>
<button type="button" aria-label="Save"><svg aria-hidden="true"></svg></button>
```

✅ Examples of **correct** code for this rule

```html
<div role="img"><span>text</span></div>
<button type="button"><svg aria-hidden="true" focusable="false"></svg>Save</button>
```
