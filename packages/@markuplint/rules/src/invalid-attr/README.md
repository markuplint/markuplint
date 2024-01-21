---
id: invalid-attr
description: Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).
---

# `invalid-attr`

Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).

This rule according to [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

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

This rule doesn't evaluate the element that has the **spread attribute** in some condition. For example, it disallows to set the `target` attribute to the `a` element that doesn't have the `href` attribute, but markuplint can't evaluate because doesn't know whether the spread attribute includes the `href` property.

```jsx
const Component = (props) => {
  return <a target="_blank" {...props}>;
}
```

:::

---

## Details

### Setting `allowAttrs` option {#setting-allow-attrs-option}

It accepts an **array** or an **object**.

#### Array format {#allow-attrs-array-format}

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

You can also specify [The types API](/docs/api/types) using an Object type with a `type` property. This is just an alias with a different syntax but conveys the same meaning.

```json
[
  {
    "name": "x-attr",
    "value": "<'color-profile'>"
  },
  // The above and below are equivalent
  {
    "name": "x-attr",
    "value": {
      "type": "<'color-profile'>"
    }
  }
]
```

:::caution
In case of duplicate attribute names within the array, the one specified later will take precedence.
:::

#### Object format

The Object format follows the same structure as [the deprecated `attrs` property](#setting-attrs-option). It accepts objects with property names corresponding to **attribute names** and with object includes `type`, `enum`, and `pattern` properties. These properties have the same meaning as described earlier in [the Array format](#allow-attrs-array-format).

:::note
Note that objects with the `disallow` property are not accepted. Instead, please use the newly introduced [`disallowAttrs`](#setting-disallow-attrs-option) option, which will be discussed in the following section.
:::

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": {
        "x-attr": {
          "type": "Any"
        },
        "x-attr2": {
          "type": "Int"
        },
        "x-attr3": {
          "enum": ["apple", "orange"]
        },
        "x-attr4": {
          "pattern": "/^[a-z]+$/"
        }
      }
    }
  }
}
```

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

### Setting `attrs` option {#setting-attrs-option}

This option is deprecated since `v3.7.0`.

<details>
<summary>Details of this option</summary>

#### `enum`

Only values ​​that match the enumerated strings are allowed.

Type: `string[]`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "enum": ["value1", "value2", "value3"]
        }
      }
    }
  }
}
```

#### `pattern`

Only allow values ​​that match the pattern. It works as a **regular expression** by enclosing it in `/`.

Type: `string`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "pattern": "/[a-z]+/"
        }
      }
    }
  }
}
```

#### `type`

Only values that match the specified [type](https://markuplint.dev/docs/api/types) are allowed.

Type: `string`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "type": "Boolean"
        }
      }
    }
  }
}
```

#### `disallowed`

Disallow the attribute.

Type: `boolean`

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-attr": {
          "disallowed": true
        }
      }
    }
  }
}
```

</details>

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
