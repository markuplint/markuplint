---
description: ARIAプロパティ/ステートの値が期待される型に適合しない場合に警告します。
---

# `no-invalid-aria-prop-value`

ARIAプロパティ/ステートの値が期待される型に適合しない場合に警告します。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「属性名の大文字・小文字」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

`role` 属性の値をコードが与える場合(`role={props.role}`)、`role` 属性より後ろにスプレッド属性(`{...props}`)がある場合、`role` 属性がなくスプレッド属性がある場合は、スプレッドがロールをもたらしうるため、要素のロールは描画されるまで分かりません。ロールによって許可される値が変わるプロパティ(例: `aria-checked` の `mixed`)は、そのような要素の値がどのロールにも許可されない場合にだけ警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="button" aria-pressed="hoge"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
