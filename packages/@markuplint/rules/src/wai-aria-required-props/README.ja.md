---
description: ロールに必須のARIAプロパティが指定されていない場合に警告します。
---

# `wai-aria-required-props`

ロールに必須のARIAプロパティが指定されていない場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="slider"></div>
```

✅ 正しいコード例

```html
<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

:::note 条件付き必須: `separator`

`separator`ロールにおいて、`aria-valuenow`は要素がフォーカス可能な場合（`tabindex`を持つ、`<button>`や`<a href>`などのインタラクティブコンテンツである等）にのみ必須となります。フォーカス不能な`<div role="separator">`は[WAI-ARIA](https://www.w3.org/TR/wai-aria/#separator)に従い静的な構造的セパレーターとして扱われ、`aria-valuenow`は不要です。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

```html
<!-- ✅ 静的な構造的セパレーター -->
<div role="separator"></div>

<!-- ❌ フォーカス可能だが aria-valuenow が欠落 -->
<div role="separator" tabindex="0"></div>

<!-- ✅ フォーカス可能で aria-valuenow あり -->
<div role="separator" tabindex="0" aria-valuenow="50"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

:::
