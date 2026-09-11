---
description: ARIA in HTMLの仕様において要素に許可されていないロールが指定された場合に警告します。
---

# `permitted-roles`

ARIA in HTMLの仕様において要素に許可されていないロールが指定された場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<select role="textbox"></select>
```

[ARIA in HTML](https://w3c.github.io/html-aria/) がある要素の状態について「No role permitted（明示 role 禁止）」を宣言している場合、暗黙ロールと一致する値であっても拒否します。例えば `<img alt="">` の暗黙ロールは `presentation` ですが、明示的な `role` 属性は一切許可されません。

```html
<img src="spacer.png" alt="" role="presentation" /> <img src="spacer.png" alt="" role="none" />
```

✅ 正しいコード例

```html
<a href="path/to" role="button">text</a> <img src="spacer.png" alt="" />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
