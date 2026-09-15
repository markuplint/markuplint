---
description: 論理属性に値を指定すると警告します。
---

# `no-boolean-attr-value`

論理属性に値を指定すると警告します。

:::info

いずれのプリセットにも含まれません。HTMLは論理属性にどんな値を与えても許容します（存在するかどうかだけが意味を持つ）ため、これを禁止するのは純粋にプロジェクトのスタイル選好です。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<input type="text" required="required" />
```

✅ 正しいコード例

```html
<input type="text" required />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
