---
id: no-invalid-attr-value
description: Warn if an attribute's value doesn't match the type or pattern the specification (or the custom rule) requires.
---

# `no-invalid-attr-value`

Warn if an attribute's value doesn't match the type or pattern the specification (or the custom rule) requires.

This rule according to [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

Whether the attribute name is known and applicable at all is [`no-unknown-attr`](/docs/rules/no-unknown-attr)'s and [`no-disallowed-attr`](/docs/rules/no-disallowed-attr)'s concern; this rule only checks the value of an attribute both of those already accept.

❌ Examples of **incorrect** code for this rule

```html
<button tabindex="non-integer">The Button</button> <a href="/" referrerpolicy="invalid-value">The Anchor</a>
```

✅ Examples of **correct** code for this rule

```html
<button tabindex="0">The Button</button> <a href="/" referrerpolicy="no-referrer">The Anchor</a>
```

:::note

This rule doesn't evaluate the element that has the **spread attribute** in some condition, mirroring [`no-disallowed-attr`](/docs/rules/no-disallowed-attr)'s note on the same subject — dynamic (template-interpolated) values are never reported as invalid, since their content isn't known at lint time.

:::

---

## Details

### Setting `allowAttrs` option {#setting-allow-attrs-option}

Shares its shape with [`no-unknown-attr`](/docs/rules/no-unknown-attr#setting-allow-attrs-option)'s option of the same name. This rule uses the `value` type/pattern given there to validate the attribute's value; set the same `allowAttrs` on both rules so the two stay in sync.

## Configuration Example

### RDFa (RDFa lite)

`vocab`'s value is a URL, so it is checked by this rule once [`no-unknown-attr`](/docs/rules/no-unknown-attr#the-open-graph-protocol) allows the attribute:

```json class=config
{
  "rules": {
    "no-invalid-attr-value": {
      "options": {
        "allowAttrs": [
          {
            "name": "vocab",
            "value": "URL"
          }
        ]
      }
    }
  }
}
```
