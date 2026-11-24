---
id: no-orphaned-end-tag
description: Warns when an end tag appears without a corresponding start tag, which constitutes an inner parse error in HTML Standard.
---

# `no-orphaned-end-tag`

Warns when an end tag appears without a corresponding start tag, which constitutes an inner parse error in HTML Standard.

Note that while some tags (e.g., `</br>`) exhibit special behaviors, this rule uniformly warns without exceptions.

The end tag of an element whose start tag the HTML Standard lets the author omit (e.g., `</body>` after an omitted `<body>`) is not warned about, because it closes the element that the parser inserted.

<!-- prettier-ignore-end -->

❌ Examples of **incorrect** code for this rule

```html
<div>
  paragraph</br>with break</p>
</div>
```

✅ Examples of **correct** code for this rule

```html
<div>
  <p>paragraph<br />with break</p>
</div>
```
