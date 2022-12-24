---
description: label要素にコントロールがない場合に警告します。
---

# `label-has-control`

`label`要素に**コントロールがない**場合に警告します。このルールは、本来の目的を持たない関連付けられていないラベルを見つけるために使用します。

また、`label`要素に関連付けられるのは**最初の**コントロールのみであるため、そのの後にコントロールがある場合は警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<label>foo</label><input type="text" />

<h1><label>New</label> Release Note</h1>
```

✅ 正しいコード例

```html
<label for="bar">foo</label><input type="text" id="bar" />

<label>foo<input type="text" /></label>

<h1><span>New</span> Release Note</h1>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
