---
id: no-disallowed-attr
description: Warn if an attribute is defined by the specification but not allowed in this context.
---

# `no-disallowed-attr`

Warn if an attribute is defined by the specification but not allowed in this context: the attribute is explicitly marked as not for use on this element (`noUse`), a conditional attribute's condition doesn't currently hold, or the `is` attribute is specified on an autonomous custom element.

This rule according to [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

Whether the attribute name exists at all is [`no-unknown-attr`](/docs/rules/no-unknown-attr)'s concern; an invalid value on an otherwise-allowed attribute is [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value)'s.

❌ Examples of **incorrect** code for this rule

```html
<a target="_blank">The Anchor</a>
```

✅ Examples of **correct** code for this rule

```html
<a href="/" target="_blank">The Anchor</a>
```

:::note

This rule doesn't evaluate the element that has the **spread attribute** in some condition. For example, it disallows setting the `target` attribute on the `a` element when it doesn't have the `href` attribute, but Markuplint can't evaluate this when it doesn't know whether the spread attribute includes the `href` property.

```jsx
const Component = (props) => {
  return <a target="_blank" {...props}>;
}
```

:::

---

## Details

### Setting `allowAttrs` option {#setting-allow-attrs-option}

Shares its shape with [`no-unknown-attr`](/docs/rules/no-unknown-attr#setting-allow-attrs-option)'s option of the same name — see that rule for the full description. Set the same `allowAttrs` on both rules so the two stay in sync.

### Setting `ignoreAttrNamePrefix` option

Shares its shape with [`no-unknown-attr`](/docs/rules/no-unknown-attr#setting-ignoreattrnameprefix-option)'s option of the same name.
