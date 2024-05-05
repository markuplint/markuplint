---
description: リンクやその他のナビゲーション要素において、特別なナビゲーションキーワード（`_blank`、`_self`、`_parent`、`_top`）が誤って無効な対象名に置き換えられるのを防ぎ、ナビゲーションが意図した通りに動作することを保証します。
---

# `no-ambiguous-navigable-target-names`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

リンクやその他のナビゲーション要素において、特別なナビゲーションキーワード（`_blank`、`_self`、`_parent`、`_top`）が誤って無効な対象名に置き換えられるのを防ぎ、ナビゲーションが意図した通りに動作することを保証します。

<!-- prettier-ignore-end -->

❌ 間違ったコード例

```html
<a href="path/to" target="blank">Link</a>

<iframe src="path/to" name="top"></iframe>
```

✅ 正しいコード例

```html
<a href="path/to" target="_blank">Link</a>
<a href="path/to" target="another-keyword">Link</a>

<iframe src="path/to" name="another-keyword"></iframe>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
