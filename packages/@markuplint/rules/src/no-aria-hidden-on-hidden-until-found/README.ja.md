---
description: hidden属性がHidden Until Found状態である要素にaria-hidden="true"を指定することを禁止します。
---

# `no-aria-hidden-on-hidden-until-found`

hidden属性がHidden Until Found状態である要素にaria-hidden="true"を指定することを禁止します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div hidden="until-found" aria-hidden="true">Hidden content</div>
```

✅ 正しいコード例

```html
<div hidden="until-found">Hidden content</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
