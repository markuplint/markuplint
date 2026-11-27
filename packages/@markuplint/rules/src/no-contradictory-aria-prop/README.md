---
id: no-contradictory-aria-prop
description: Warns when an ARIA property's value contradicts an equivalent native HTML attribute.
---

# `no-contradictory-aria-prop`

Warns when an ARIA property's value contradicts the current or implicit value of an equivalent native HTML attribute, per [ARIA in HTML §4.2](https://www.w3.org/TR/html-aria/#docconformance-attr): native HTML attributes must take precedence over their ARIA equivalents.

When the element has a Boolean native attribute (`required`, `disabled`, `readonly`, `checked`), only `aria-*="false"` contradicts it; when it has any other equivalent native attribute, a differing value does.

When the element lacks the native attribute, an author may use `aria-required`, `aria-disabled` and `aria-readonly` in place of `required`, `disabled` and `readonly`, so `<input type="text" aria-required="true">` is not reported. `aria-checked` is the exception: on an element that allows `checked`, `aria-checked="true"` without `checked` is reported as contradicting the implicit `checked`, because the checkedness of the element can be in opposition to it:

> Authors MAY use the aria-required attribute on any element that is allowed the required attribute in HTML, or any element with a WAI-ARIA role which allows the aria-required attribute.

Cite: [ARIA in HTML §4.2 Requirements for use of ARIA attributes in place of equivalent HTML attributes](https://www.w3.org/TR/html-aria/#docconformance-attr)

> Authors MUST NOT use the aria-checked attribute on any element where the checkedness, or the indeterminate checked value of the element can be in opposition to the current value of the aria-checked attribute.

Cite: [ARIA in HTML §4.2 Requirements for use of ARIA attributes in place of equivalent HTML attributes](https://www.w3.org/TR/html-aria/#docconformance-attr)

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

Split out of the former `wai-aria-implicit-props` rule, alongside [`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop). This half is `must`-level (`error`); the redundant half stays `should`-level (`warning`).

❌ Examples of **incorrect** code for this rule

```html
<input type="checkbox" checked aria-checked="false" />
```

```html
<input type="checkbox" aria-checked="true" />
```

✅ Examples of **correct** code for this rule

```html
<input type="checkbox" checked />
```

```html
<input type="text" aria-required="true" />
```
