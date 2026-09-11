---
id: no-unknown-attr
description: Warn if an attribute is not defined by the specification (or the custom rule) for the element.
---

# `no-unknown-attr`

Warn if an attribute is not defined by the specification (or the custom rule) for the element.

This rule according to [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

When a non-existent attribute name is similar to a valid attribute for the element, the error message includes a "Did you mean ...?" suggestion to help fix typos.

This rule checks name eligibility only. A defined attribute that isn't allowed in the current context (`noUse`, an unmet `condition`, or `is` on an autonomous custom element) is [`no-disallowed-attr`](/docs/rules/no-disallowed-attr)'s concern; an invalid value on an otherwise-known attribute is [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value)'s.

❌ Examples of **incorrect** code for this rule

```html
<div unexist-attr></div>
```

✅ Examples of **correct** code for this rule

```html
<div></div>
```

---

## Details

### Setting `allowAttrs` option {#setting-allow-attrs-option}

The array can contain elements of both **string** and **object** types.

For strings, you can specify allowed attribute names, with attribute values being unrestricted. In the case of Objects, they should have both `name` and `value` properties: the value type is used by [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) to validate the attribute's value — set the same `allowAttrs` on both rules so the two stay in sync.

```json
{
  "no-unknown-attr": {
    "options": {
      "allowAttrs": [
        "x-attr",
        {
          "name": "x-attr2",
          "value": "Int"
        },
        {
          "name": "x-attr3",
          "value": {
            "enum": ["apple", "orange"]
          }
        },
        {
          "name": "x-attr4",
          "value": {
            "pattern": "/^[a-z]+$/"
          }
        }
      ]
    }
  }
}
```

You can use the types defined in [The types API](/docs/api/types) for the `value` property. Additionally, you can specify an `enum` property to limit the allowed values or use the `pattern` property to define a pattern for the values using regular expressions.

:::caution
In case of duplicate attribute names within the array, the one specified later will take precedence.
:::

### Setting `ignoreAttrNamePrefix` option

```json
{
  "no-unknown-attr": {
    "options": {
      "ignoreAttrNamePrefix": [
        // If Angular
        "app",
        "*ng"
      ]
    }
  }
}
```

In some parser, detect an attribute as a directive so ignored. (Ex: Ignore directive that starts `v-` string in the [vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-parser).) Set the same `ignoreAttrNamePrefix` on [`no-disallowed-attr`](/docs/rules/no-disallowed-attr) too.

## Configuration Example

_[The Open Graph protocol](https://ogp.me/)_ and _[RDFa](https://rdfa.info/)_ are specifications that are different from the _HTML Standard_. So you should specify it manually as follow if you need it:

### The Open Graph protocol {#the-open-graph-protocol}

```json class=config
{
  "nodeRules": [
    {
      "selector": "meta[property]",
      "rules": {
        "no-unknown-attr": {
          "options": {
            "allowAttrs": ["property", "content"]
          }
        }
      }
    }
  ]
}
```

### RDFa (RDFa lite)

```json class=config
{
  "rules": {
    "no-unknown-attr": {
      "options": {
        "allowAttrs": [
          {
            "name": "vocab",
            "value": "URL"
          },
          "typeof",
          "property",
          "resource",
          "prefix"
        ]
      }
    }
  }
}
```

We recommend you use _[Microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata)_ instead of _RDFa_ if you need structured data.
