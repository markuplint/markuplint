---
id: invalid-attr
description: Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).
---

# `invalid-attr`

Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).

This rule according to [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

When a non-existent attribute name is similar to a valid attribute for the element, the error message includes a "Did you mean ...?" suggestion to help fix typos.

❌ Examples of **incorrect** code for this rule

```html
<div unexist-attr>
  <button tabindex="non-integer">The Button</button>
  <a href="/" referrerpolicy="invalid-value">The Anchor</a>
</div>
```

✅ Examples of **correct** code for this rule

```html
<div>
  <button tabindex="0">The Button</button>
  <a href="/" referrerpolicy="no-referrer">The Anchor</a>
</div>
```

:::note

This rule doesn't evaluate the element that has the **spread attribute** in some condition. For example, it disallows to set the `target` attribute to the `a` element that doesn't have the `href` attribute, but Markuplint can't evaluate because doesn't know whether the spread attribute includes the `href` property.

```jsx
const Component = (props) => {
  return <a target="_blank" {...props}>;
}
```

:::

---

## Details

:::caution
Named nodeRules that wrap `invalid-attr` (e.g., `a11y/no-accesskey` in the a11y preset) operate as **narrow checks**: they only flag attributes listed in their `allowAttrs`/`disallowAttrs` options and do not fall back to HTML-spec validation. General spec-based validation is performed by the base `invalid-attr` rule. To get spec validation, extend `markuplint:html-standard` or set `"invalid-attr": true` in your config.

To extend what the base rule allows on specific elements, use an **unnamed** nodeRule so the options reach the base rule directly.
:::

### Setting `allowAttrs` option {#setting-allow-attrs-option}

:::caution
`allowAttrs` can override spec-level restrictions (such as `noUse`).
When writing presets or shared configurations, use `nodeRules` to
scope `allowAttrs` so it does not unintentionally allow attributes
that the HTML specification disallows on specific elements.
:::

The array can contain elements of both **string** and **object** types.

For strings, you can specify allowed attribute names, with attribute values being unrestricted. In the case of Objects, they should have both `name` and `value` properties, allowing you to specify more precise constraints for the attribute values.

```json
{
  "invalid-attr": {
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

### Setting `disallowAttrs` option {#setting-disallow-attrs-option}

The format for specifying disallowed attributes is the same as for [`allowAttrs`](#setting-allow-attrs-option), **but the meanings are reversed**.

```json
{
  "invalid-attr": {
    "options": {
      "disallowAttrs": [
        // Disallow `x-attr` attribute.
        "x-attr",

        // Disallow `x-attr2` attribute when the value is an integer.
        // If the value is not an integer, the attribute itself is allowed.
        {
          "name": "x-attr2",
          "value": "Int"
        },

        // Disallow `x-attr3` attribute when the value is "apple" or "orange".
        // If the value is not "apple" and "orange", the attribute itself is allowed.
        {
          "name": "x-attr3",
          "value": {
            "enum": ["apple", "orange"]
          }
        },

        // Disallow `x-attr4` attribute when the value matches the pattern.
        // If the value doesn't match the pattern, the attribute itself is allowed.
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

### Setting `ignoreAttrNamePrefix` option

```json
{
  "invalid-attr": {
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

In some parser, detect an attribute as a directive so ignored. (Ex: Ignore directive that starts `v-` string in the [vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-parser).)

## Configuration Example

_[The Open Graph protocol](https://ogp.me/)_ and _[RDFa](https://rdfa.info/)_ are specifications that are different from the _HTML Standard_. So you should specify it manually as follow if you need it:

### The Open Graph protocol {#the-open-graph-protocol}

```json class=config
{
  "nodeRules": [
    {
      "selector": "meta[property]",
      "rules": {
        "invalid-attr": {
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
    "invalid-attr": {
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
