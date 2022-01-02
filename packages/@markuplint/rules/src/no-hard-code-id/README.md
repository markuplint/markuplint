---
title: Disallow hard-code the id attribute
id: no-hard-code-id
category: maintenability
---

# Disallow hard-code the id attribute

Warn it hard-coded the value of the id attribute when the element is a fragment.

## Rule Details

👎 Examples of **incorrect** code for this rule

```jsx
<div id="foo"></div>
```

👍 Examples of **correct** code for this rule

```jsx
const id = uid();
<div id={id}></div>;
```

```jsx
const Component = ({ id }) => <div id={id}></div>;
```

### Interface

-   Type: `boolean`
-   Deafult Value: `true`

### Default severity

`warning`
