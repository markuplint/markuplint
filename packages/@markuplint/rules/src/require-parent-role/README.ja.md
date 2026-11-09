---
description: 明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。
---

# `require-parent-role`

明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。

親は、アクセシビリティツリーに沿って探します。`template`要素の内容は書かれた場所では描画されず、マークアップからはどこに挿入されるか分かりません。そのため、内容の先頭にある要素には判断する親がなく、警告しません。宣言的シャドウルート(`<template shadowrootmode>`)の内容の先頭の要素はホストの中に描画されるため、親はホストです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="option">item</div>
```

✅ 正しいコード例

```html
<div role="listbox"><div role="option">item</div></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
