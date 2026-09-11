---
description: 属性にデフォルト値を指定したときに警告します。
---

# `no-default-value`

属性にデフォルト値を指定したときに警告します。

:::info

いずれのプリセットにも含まれません。属性のデフォルト値を明示的に書くことは冗長ですが害はないため、これを指摘するのは純粋にプロジェクトのスタイル選好です。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<canvas width="300" height="150"></canvas>
```

✅ 正しいコード例

```html
<canvas></canvas>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
