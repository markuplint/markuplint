---
id: invalid-attr
description: Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).
category: style
severity: error
---

# `invalid-attr`

Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).

This rule refers the [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src/attributes).

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

### Setting `attrs` option

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

### The Open Graph protocol

```json
{
  "nodeRules": [
    {
      "selector": "meta[property]",
      "rules": {
        "invalid-attr": {
          "options": {
            "attrs": {
              "property": {
                "type": "Any"
              },
              "content": {
                "type": "Any"
              }
            }
          }
        }
      }
    }
  ]
}
```

### RDFa (RDFa lite)

```json
{
  "rules": {
    "invalid-attr": {
      "options": {
        "attrs": {
          "vocab": {
            "type": "URL"
          },
          "typeof": {
            "type": "Any"
          },
          "property": {
            "type": "Any"
          },
          "resource": {
            "type": "Any"
          },
          "prefix": {
            "type": "Any"
          }
        }
      }
    }
  }
}
```

We recommend you use _[Microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata)_ instead of _RDFa_ if you need structured data.
