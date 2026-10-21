---
description: 明示的なロールを持たない要素にグローバルでないARIAプロパティが指定された場合に警告します。
---

# `aria-prop-requires-role`

明示的なロールを持たない要素にグローバルでないARIAプロパティが指定された場合に警告します。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「属性名の大文字・小文字」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div aria-pressed="true"></div>
```

✅ 正しいコード例

```html
<div aria-label="text"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
