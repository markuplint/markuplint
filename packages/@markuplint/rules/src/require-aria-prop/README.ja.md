---
description: ロールに必須のARIAプロパティが指定されていない場合に警告します。
---

# `require-aria-prop`

ロールに必須のARIAプロパティが指定されていない場合に警告します。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「Attribute name case」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

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

`separator`ロールにおいて、`aria-valuenow`は要素がフォーカス可能な場合（`tabindex`を持つ、`<button>`や`<a href>`などのインタラクティブコンテンツである等）にのみ必須となります。フォーカス不能な`<div role="separator">`は[WAI-ARIA](https://w3c.github.io/aria/#separator)に従い静的な構造的セパレーターとして扱われ、`aria-valuenow`は不要です。

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
