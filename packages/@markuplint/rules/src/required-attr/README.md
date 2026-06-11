---
id: required-attr
description: Warns if specified attributes or required attribute on specs are not appeared on an element.
---

# `required-attr`

Warns if specified attributes or required attribute on specs are not appeared on an element.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

Some attributes are required only under certain conditions (for example, `<link rel="preload">` must carry an `as` attribute, but `<link rel="modulepreload">` may omit it). Those conditional rules live in the per-element spec files under [`@markuplint/html-spec/src/spec.<element>.jsonc`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src) — search for `"required":` to see which attributes carry a conditional selector and on which other attribute values they depend.

👎 Example of **incorrect** code for this rule

```html
<img />

<!-- "required-attr": "alt" -->
<img src="/path/to/image.png" />
```

👍 Example of **correct** code for this rule

```html
<img src="/path/to/image.png" />

<!-- "required-attr": "alt" -->
<img src="/path/to/image.png" alt="alternative text" />
```

:::note

This rule doesn't evaluate the element that has the **spread attribute**. In the below code, it doesn't evaluate whether the `img` element includes the `src` attribute. Because Markuplint can't know whether the spread attribute includes the `src` property.

```jsx
const Component = (props) => {
	return <img {...props}>;
}
```

:::

---

## Configuration Example

```json class=config
{
  "rules": {
    "required-attr": "alt"
  }
}
```

```json class=config
{
  "rules": {
    "required-attr": ["alt", "src"]
  }
}
```

```json class=config
{
  "rules": {
    "required-attr": [
      "alt",
      {
        "name": "src",
        "value": "/^\\/|^https:\\/\\//i"
      }
    ]
  }
}
```

Since we ordinary want to configure required attributes for each element type, `required-attr` rule should be configured in the `nodeRules` option.

Example configuration that `alt` attribute must be required on `<img>` element:

```json class=config
{
  "rules": {
    "required-attr": true
  },
  "nodeRules": [
    {
      "selector": "img",
      "rules": {
        "required-attr": "alt"
      }
    }
  ]
}
```

### `ignoreAttrs`

You can use the `ignoreAttrs` option to exclude specific attributes from required-attribute checks. This is useful when you want to keep the rule enabled but ignore certain attributes that are handled by a framework or are intentionally omitted.

```json class=config
{
  "nodeRules": [
    {
      "selector": "img",
      "rules": {
        "required-attr": {
          "options": {
            "ignoreAttrs": ["src", "srcset"]
          }
        }
      }
    }
  ]
}
```
