---
description: 同じ要素を複数の要素のaria-owns属性から参照することを禁止します。
---

# `no-duplicate-aria-owns`

同じ要素を複数の要素のaria-owns属性から参照することを禁止します。

> Authors MUST ensure that an element's ID is not specified in more than one other element's aria-owns attribute at any time. In other words, an element can have only one explicit owner.

[WAI-ARIA aria-owns property](https://w3c.github.io/aria/#aria-owns)より引用

文書順で最初にIDを挙げたaria-owns属性より後の、同じIDを挙げるaria-owns属性をすべて警告します。IDはaria-owns属性と同じツリーの中で探します。`template`要素の内容と宣言的シャドウルートは、それぞれ別のツリーです。どの要素も持たないIDは[`no-refer-to-non-existent-id`](/docs/rules/no-refer-to-non-existent-id)が、自分自身のIDを挙げる要素は[`no-circular-aria-owns`](/docs/rules/no-circular-aria-owns)が警告します。テンプレート構文のブロックがある文書や、描画されるまで値が分からないaria-owns属性は判定しません。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="listbox" aria-owns="option1"></div>
<div role="listbox" aria-owns="option1"></div>
<div id="option1" role="option">Apple</div>
```

✅ 正しいコード例

```html
<div role="listbox" aria-owns="option1"></div>
<div role="listbox" aria-owns="option2"></div>
<div id="option1" role="option">Apple</div>
<div id="option2" role="option">Orange</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
