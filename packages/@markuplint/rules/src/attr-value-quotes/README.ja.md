---
description: 属性値が引用符で囲われていない場合に警告をします。
---

# `attr-value-quotes`

属性値が引用符で囲われていない場合に警告をします。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<div data-attr=value></div>
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```html
<!-- "attr-value-quotes": "single" -->
<div data-attr=value></div>
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

<!-- prettier-ignore-start -->
```html
<div data-attr="value"></div>
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```html
<!-- "attr-value-quotes": "single" -->
<div data-attr='value'></div>
```
<!-- prettier-ignore-end -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
