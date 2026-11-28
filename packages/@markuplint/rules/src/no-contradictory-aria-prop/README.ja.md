---
id: no-contradictory-aria-prop
description: ARIA プロパティの値が等価なネイティブ HTML 属性と矛盾している場合に警告します。
---

# `no-contradictory-aria-prop`

[ARIA in HTML §4.2](https://www.w3.org/TR/html-aria/#docconformance-attr) に基づき、ネイティブ HTML 属性はその ARIA 等価物より優先されなければなりません。ARIA プロパティの値が、等価なネイティブ HTML 属性の現在の値または暗黙の値と矛盾している場合に警告します。

要素が真偽値のネイティブ属性(`required`・`disabled`・`readonly`・`checked`)を持つ場合、それと矛盾するのは `aria-*="false"` だけです。`aria-colspan` と `aria-rowspan` は、値が異なる場合に `colspan` と `rowspan` と矛盾します。値はネイティブ属性の値の型で比較します。数値は数値として、キーワードは ASCII の大文字・小文字を区別せずに、それ以外の値は書かれたとおりに比較します。

`aria-placeholder`・`aria-valuemax`・`aria-valuemin` は、`placeholder`・`max`・`min` と同じ要素に指定した場合、同じ値であっても値に関係なく報告します。

> Authors MUST NOT use the aria-placeholder attribute on any element which also has a placeholder attribute.

[ARIA in HTML §4.2 Requirements for use of ARIA attributes in place of equivalent HTML attributes](https://www.w3.org/TR/html-aria/#docconformance-attr)より引用

編集可能な要素(自身の `contenteditable`、または `contenteditable` を持つ最も近い祖先による)に `aria-readonly="true"` を指定した場合も報告します。

> Authors MUST NOT set aria-readonly="true" on an element that has isContentEditable="true".

[ARIA in HTML §4.2 Requirements for use of ARIA attributes in place of equivalent HTML attributes](https://www.w3.org/TR/html-aria/#docconformance-attr)より引用

要素にネイティブ属性がない場合、`aria-required`・`aria-disabled`・`aria-readonly` は `required`・`disabled`・`readonly` の代わりに使えるので、`<input type="text" aria-required="true">` は報告されません。`aria-checked` は例外です。`checked` を持てる要素で `checked` なしに `aria-checked="true"` を指定すると、暗黙の `checked` と矛盾するものとして報告されます。要素のチェック状態が `aria-checked` と食い違う場合があるためです。

> Authors MAY use the aria-required attribute on any element that is allowed the required attribute in HTML, or any element with a WAI-ARIA role which allows the aria-required attribute.

[ARIA in HTML §4.2 Requirements for use of ARIA attributes in place of equivalent HTML attributes](https://www.w3.org/TR/html-aria/#docconformance-attr)より引用

> Authors MUST NOT use the aria-checked attribute on any element where the checkedness, or the indeterminate checked value of the element can be in opposition to the current value of the aria-checked attribute.

[ARIA in HTML §4.2 Requirements for use of ARIA attributes in place of equivalent HTML attributes](https://www.w3.org/TR/html-aria/#docconformance-attr)より引用

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「属性名の大文字・小文字」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

旧`wai-aria-implicit-props`ルールから、[`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop)とともに分割されました。この矛盾側は`must`レベル(`error`)ですが、冗長側は`should`レベル(`warning`)のままです。

❌ 間違ったコード例

```html
<input type="checkbox" checked aria-checked="false" />
```

```html
<input type="checkbox" aria-checked="true" />
```

✅ 正しいコード例

```html
<input type="checkbox" checked />
```

```html
<input type="text" aria-required="true" />
```
