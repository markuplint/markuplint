---
description: childrenPresentationalを持つロールの子孫要素にARIA属性が指定された場合に警告します。
---

# `no-aria-on-presentational-children`

childrenPresentationalを持つロールの子孫要素にARIA属性が指定された場合に警告します。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「属性名の大文字・小文字」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

子孫要素はアクセシビリティツリーから除外されますが、そのテキストは除外されません。

> However, the text content of any excluded descendants is included.

[WAI-ARIA §7.1 Excluding Elements from the Accessibility Tree](https://w3c.github.io/aria/#tree_exclusion)より引用

このテキストは、内容から名前や説明を計算するときに使われます。内容から名前を得るロール(`button`、`checkbox`、`option`、`radio`、`switch`、`tab` など)を持つ先祖のアクセシブルネームと、ロールに関係なく `aria-labelledby` や `aria-describedby` が参照する先祖のテキストです。子孫要素がこれらのテキストに与える内容を変える属性は警告しません。

- `aria-hidden="true"`。ただし、`hidden` 属性ですでに非表示の子孫要素は除きます
- 非表示でなく、埋め込みコントロール(テキストフィールドなど)でもない子孫要素の空でない `aria-label`。埋め込みコントロールの `aria-label` は計算で無視されます
- 要素を参照する `aria-labelledby`。ただし、そのテキスト自体が `aria-labelledby` のために集められている間は除きます
- `<img>` の `alt` や `<svg>` の `<title>` のような子孫要素の代替テキストを無効にする `role="none"` または `role="presentation"`

計算が子孫要素に届かない場合は警告します。先祖が非表示である、または `aria-label` など内容より優先される方法で名前を得ている場合や、間にある要素が非表示である、またはそのような方法で名前を得ている場合です。

❌ 間違ったコード例

このボタンは `aria-label` から名前を得るので、その内容とアイコンの `aria-hidden` は名前に関わりません。

```html
<div role="img"><span aria-label="text"></span></div>
<button type="button" aria-label="Save"><svg aria-hidden="true"></svg></button>
```

✅ 正しいコード例

```html
<div role="img"><span>text</span></div>
<button type="button"><svg aria-hidden="true" focusable="false"></svg>Save</button>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
