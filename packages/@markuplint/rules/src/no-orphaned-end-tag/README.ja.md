---
description: 対応する開始タグなしに終了タグが現れた場合に警告します。これはHTML標準における内部的なパースエラーに該当します。
---

# `no-orphaned-end-tag`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

対応する開始タグなしに終了タグが現れた場合に警告します。これはHTML標準における内部的なパースエラーに該当します。

一部特殊な振る舞いをするタグ（例: `</br>`）が存在しますが、このルールでは例外なく一律に警告します。

開始タグの省略がHTML標準で認められている要素の終了タグ（例: 省略した `<body>` に対する `</body>`）は、パーサーが挿入した要素を閉じるため、警告しません。

<!-- prettier-ignore-end -->

❌ 間違ったコード例

```html
<div>
  段落</br>と改行</p>
</div>
```

✅ 正しいコード例

```html
<div>
  <p>段落<br />と改行</p>
</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
