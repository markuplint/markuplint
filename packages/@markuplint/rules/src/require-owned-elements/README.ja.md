---
description: ロールが必要とする子ロールを含んでいない場合に警告します。
---

# `require-owned-elements`

ロールが必要とする子ロールを含んでいない場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="list"><div>not a listitem</div></div>
```

✅ 正しいコード例

```html
<div role="list"><div role="listitem">item</div></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
