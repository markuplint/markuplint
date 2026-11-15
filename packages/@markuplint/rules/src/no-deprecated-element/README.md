---
id: no-deprecated-element
description: Warns when there is an element defined as deprecated.
---

# `no-deprecated-element`

Warns when there is an element defined as **deprecated**.

This rule refers to [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

An element the HTML Living Standard marks as a non-conforming, obsolete feature is [`no-obsolete-element`](/docs/rules/no-obsolete-element)'s concern.

:::note
The rule covers elements of HTML, SVG and MathML. In the current spec data, the only elements that are deprecated without also being obsolete are the MathML elements `<maction>` and `<mfenced>`, so they are what this rule reports today. No HTML or SVG element is reported: the rule exists so that a future spec-data update that adds one is caught automatically, without needing a new rule.
:::

❌ Examples of **incorrect** code for this rule

```html
<math>
  <mfenced></mfenced>
</math>
```

✅ Examples of **correct** code for this rule

```html
<math>
  <mfrac>
    <mn>1</mn>
    <mn>2</mn>
  </mfrac>
</math>
```
