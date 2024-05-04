---
description: 終了タグがない場合は警告します。
---

# `end-tag`

終了タグがない場合は警告します。タグが自己完結型であり終了タグを必要としない場合や、タグが空要素である場合は警告をしません。

:::note

現在、このルールは終了タグが省略可能かどうかを評価しません。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div>
  <span>There is not an end tag.
</div>
```

✅ 正しいコード例

```html
<div>
  <span>There is an end tag.</span>
</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
