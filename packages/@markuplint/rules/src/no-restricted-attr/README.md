---
id: no-restricted-attr
description: Disallow specific attributes, or specific attribute/value combinations, that your project's rules forbid regardless of the HTML specification.
---

# `no-restricted-attr`

Disallow specific attributes, or specific attribute/value combinations, that your project's rules forbid — independent of the HTML specification. Unlike [`no-unknown-attr`](/docs/rules/no-unknown-attr), [`no-disallowed-attr`](/docs/rules/no-disallowed-attr), and [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value), this rule does no spec validation at all; it only enforces the `disallowAttrs` you configure.

This rule has no default behavior — configure `disallowAttrs` to use it.

❌ Examples of **incorrect** code for this rule

```html
<div x-attr></div>
```

✅ Examples of **correct** code for this rule

```html
<div></div>
```

---

## Details

### Setting `disallowAttrs` option {#setting-disallow-attrs-option}

The array can contain elements of both **string** and **object** types.

For strings, you can specify disallowed attribute names outright. In the case of Objects, they should have both `name` and `value` properties, allowing you to disallow the attribute only when its value matches.

```json
{
  "no-restricted-attr": {
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

You can use the types defined in [The types API](/docs/api/types) for the `value` property. Additionally, you can specify an `enum` property to limit the disallowed values or use the `pattern` property to define a pattern for the values using regular expressions.

:::caution
In case of duplicate attribute names within the array, the one specified later will take precedence.
:::

## Configuration Example

### Restricting `accesskey` project-wide {#restricting-accesskey}

```json class=config
{
  "rules": {
    "my-project/no-accesskey": {
      "rules": {
        "no-restricted-attr": {
          "options": {
            "disallowAttrs": ["accesskey"]
          }
        }
      }
    }
  }
}
```
