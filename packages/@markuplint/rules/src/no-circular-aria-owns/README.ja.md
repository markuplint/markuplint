---
description: 要素を自分自身の祖先にしてしまうaria-owns属性を禁止します。
---

# `no-circular-aria-owns`

要素を自分自身の祖先にしてしまうaria-owns属性を禁止します。

> Authors MUST NOT create circular references with aria-owns.

[WAI-ARIA aria-owns property](https://w3c.github.io/aria/#aria-owns)より引用

参照先が要素自身か、その祖先であるとき、参照は循環しています。祖先は、DOMとすべてのaria-owns属性(非表示の要素のaria-owns属性も含む)の両方をたどって求めます。循環を作る参照はすべて警告し、別の循環を取り除くと循環を作る参照も警告します。テンプレート構文のブロックがある文書や、描画されるまで値が分からないaria-owns属性は判定しません。WAI-ARIA 1.1と1.2にはこの要件の記述がありませんが、ARIAのバージョンにかかわらず警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div id="tree" role="tree">
  <div role="treeitem" aria-owns="tree">Fruits</div>
</div>

<div id="a" role="group" aria-owns="b"></div>
<div id="b" role="group" aria-owns="a"></div>
```

✅ 正しいコード例

```html
<div role="tree" aria-owns="fruits"></div>
<div id="fruits" role="treeitem">Fruits</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
