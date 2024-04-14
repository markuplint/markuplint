---
id: no-orphaned-end-tag
description: Warns when an end tag appears without a corresponding start tag, which constitutes an inner parse error in HTML Standard.
---

# `no-orphaned-end-tag`

Warns when an end tag appears without a corresponding start tag, which constitutes an inner parse error in HTML Standard.

Note that while some tags (e.g., `</br>`) exhibit special behaviors, this rule uniformly warns without exceptions.

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
