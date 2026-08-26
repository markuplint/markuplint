---
description: ARIAプロパティにスペックで定義されたデフォルト値が明示的に指定された場合に警告します。
---

# `no-default-aria-value`

ARIAプロパティにスペックで定義されたデフォルト値が明示的に指定された場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="button" aria-expanded="undefined"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-expanded="true"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
