---
description: ARIA属性を全くサポートしない要素へのARIA属性指定を禁止します。
---

# `no-aria-on-unsupported-element`

HTML仕様データがARIA属性を全くサポートしないとマークしている要素上の `role` 属性や `aria-*` 属性を、[ARIA in HTMLの文書適合性要件](https://w3c.github.io/html-aria/#docconformance)に基づき禁止します。

:::info

旧 `wai-aria` 傘ルール(#3989)から抽出されました。傘ルールは他のどのチェックよりも先に、無条件でこのチェックを実行していました。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## デフォルトの深刻度

`error`

## 使用例

このルールは、ARIA属性を全くサポートしない要素上の `role` または `aria-*` 属性に対して違反を報告します。markuplint にバンドルされたHTML・SVG・MathML仕様データには、現在ARIA属性をこのように禁止する要素は存在しないため、今日時点では間違ったコード例を示すことができません。将来の仕様更新でそのような要素が追加された場合に備えたルールです。

✅ 正しいコード例

```html
<div role="button" aria-pressed="false"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
