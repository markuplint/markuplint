---
description: WAI-ARIA仕様に存在しないロールが指定された場合に警告します。
---

# `no-unknown-role`

WAI-ARIA仕様に存在しないロールが指定された場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="hoge"></div>
```

✅ 正しいコード例

```html
<div role="button"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
