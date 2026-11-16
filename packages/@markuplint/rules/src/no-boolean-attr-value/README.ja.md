---
description: 論理属性に値を指定すると警告します。
---

# `no-boolean-attr-value`

論理属性に値を指定すると警告します。

:::info

いずれのプリセットにも含まれません。空文字と属性名と同じ値（`required="required"`）は論理属性の適合する値なので、値を書かないことは純粋にプロジェクトのスタイル選好です。そのどちらでもない値は適合せず、[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value)が報告します（[HTML Standard](https://momdo.github.io/html/common-microsyntaxes.html#boolean-attributes)）。

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
