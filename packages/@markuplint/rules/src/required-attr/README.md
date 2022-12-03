---
title: Required attributes
id: required-attr
category: validation
---

# Required attributes

Warns if specified attributes or required attribute on specs are not appeared on an element.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src/attributes).

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

This rule doesn't evaluate the element that has the **spread attribute**. In the below code, it doesn't evaluate whether the `img` element includes the `src` attribute. Because markuplint can't know whether the spread attribute includes the `src` property.

```jsx
const Component = (props) => {
	return <img {...props}>;
}
```

:::

---

## Configuration Example

```json
{
  "rules": {
    "required-attr": "alt"
  }
}
```

```json
{
  "rules": {
    "required-attr": ["alt", "src"]
  }
}
```

```json
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

```json
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
