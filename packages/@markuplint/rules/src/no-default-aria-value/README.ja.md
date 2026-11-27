---
description: ARIAプロパティにスペックで定義されたデフォルト値が明示的に指定された場合に警告します。
---

# `no-default-aria-value`

ARIAプロパティにスペックで定義されたデフォルト値が明示的に指定された場合に警告します。

比較する値は、属性がないときに要素が持つ値です。ロールが暗黙の値を与える場合はその値([WAI-ARIA](https://w3c.github.io/aria/#implictValueForRole)の「Implicit Value for Role」。`alert` の `aria-live` は `assertive`)、与えない場合はプロパティのデフォルト値です。要素が持つネイティブ属性(`min`・`max`・`checked`)がある場合はそちらで決まり、その比較は [`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop) が行います。ロールが描画されるまでわからない要素では、いずれかのロールが暗黙の値を与えるプロパティは検証しません。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「属性名の大文字・小文字」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="button" aria-expanded="undefined"></div>
<div role="alert" aria-live="assertive"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-expanded="true"></div>
<div role="alert" aria-live="off"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
