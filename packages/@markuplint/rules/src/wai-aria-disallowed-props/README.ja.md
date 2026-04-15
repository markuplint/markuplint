---
description: 要素のロールで許可されていないARIAプロパティ/ステート、または命名禁止（naming prohibition）の対象となるARIAプロパティが指定された場合に警告します。
---

# `wai-aria-disallowed-props`

要素のロールで許可されていないARIAプロパティ/ステートが指定された場合に警告します。
また、[ARIA in HTML](https://w3c.github.io/html-aria/#dfn-naming-prohibited)で定義される「命名禁止（naming prohibition）」制約も強制します。`<cite>`、`<abbr>`、`<figcaption>` のような暗黙ロールを持たない要素では、命名をサポートするロールを明示的に設定しない限り、`aria-label`、`aria-labelledby`、`aria-braillelabel` を使用できません。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="heading" aria-pressed="true"></div>
<cite aria-label="x">y</cite>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
<cite role="button" aria-label="x">y</cite>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
