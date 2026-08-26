---
id: no-hardcoded-id
description: Warn it hard-coded the value of the id attribute when the element is a fragment.
---

# `no-hardcoded-id`

Warn it hard-coded the value of the id attribute when the element is a fragment.

❌ Examples of **incorrect** code for this rule

```jsx
<div id="foo"></div>
```

✅ Examples of **correct** code for this rule

```jsx
const id = uid();
<div id={id}></div>;
```

```jsx
const Component = ({ id }) => <div id={id}></div>;
```
