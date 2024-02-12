---
description: ポップオーバートリガーと対応するターゲットが隣接していない場合に警告します
---

# `neighbor-popovers`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

ポップオーバートリガーと対応するターゲットが隣接していない場合に警告します。

> 可能な限りいつでも、ポップオーバー要素がDOM内のトリガー要素の直後に配置されるようにする。そうすることで、ポップオーバーが、スクリーンリーダーなどの支援技術のユーザーに対して、プログラム上の論理的な読み上げ順序で公開されるようになる。

[HTML Living Standard 6.12.1 The popover target attributes](https://momdo.github.io/html/popover.html#the-popover-target-attributes:~:text=%E5%8F%AF%E8%83%BD%E3%81%AA%E9%99%90%E3%82%8A%E3%81%84%E3%81%A4%E3%81%A7%E3%82%82%E3%80%81%E3%83%9D%E3%83%83%E3%83%97%E3%82%AA%E3%83%BC%E3%83%90%E3%83%BC%E8%A6%81%E7%B4%A0%E3%81%8CDOM%E5%86%85%E3%81%AE%E3%83%88%E3%83%AA%E3%82%AC%E3%83%BC%E8%A6%81%E7%B4%A0%E3%81%AE%E7%9B%B4%E5%BE%8C%E3%81%AB%E9%85%8D%E7%BD%AE%E3%81%95%E3%82%8C%E3%82%8B%E3%82%88%E3%81%86%E3%81%AB%E3%81%99%E3%82%8B%E3%80%82%E3%81%9D%E3%81%86%E3%81%99%E3%82%8B%E3%81%93%E3%81%A8%E3%81%A7%E3%80%81%E3%83%9D%E3%83%83%E3%83%97%E3%82%AA%E3%83%BC%E3%83%90%E3%83%BC%E3%81%8C%E3%80%81%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%83%AA%E3%83%BC%E3%83%80%E3%83%BC%E3%81%AA%E3%81%A9%E3%81%AE%E6%94%AF%E6%8F%B4%E6%8A%80%E8%A1%93%E3%81%AE%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%81%AB%E5%AF%BE%E3%81%97%E3%81%A6%E3%80%81%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%A0%E4%B8%8A%E3%81%AE%E8%AB%96%E7%90%86%E7%9A%84%E3%81%AA%E8%AA%AD%E3%81%BF%E4%B8%8A%E3%81%92%E9%A0%86%E5%BA%8F%E3%81%A7%E5%85%AC%E9%96%8B%E3%81%95%E3%82%8C%E3%82%8B%E3%82%88%E3%81%86%E3%81%AB%E3%81%AA%E3%82%8B%E3%80%82)より引用

❌ 間違ったコード例

```html
<button popovertarget="foo">トリガー</button>
<p>知覚要素がトリガーとそのターゲットの間に存在しています。</p>
<div id="foo" popover>ポップオーバー</div>
```

```html
<div>
  <button popovertarget="foo">トリガー</button>
  <input type="text" /><!-- フォーカス可能要素は知覚要素と見做します。 -->
</div>

<div>
  <div>
    <div id="foo" popover>ポップオーバー</div>
  </div>
</div>
```

✅ 正しいコード例

```html
<button popovertarget="foo">トリガー</button>
<div id="foo" popover>ポップオーバー</div>
```

```html
<div>
  <button popovertarget="foo">トリガー</button>
</div>

<div>
  <div>
    <div id="foo" popover>ポップオーバー</div>
  </div>
</div>
```

```html
<div>
  <button popovertarget="foo">トリガー</button>
</div>

<div>
  <div>
    <img src="image.png" alt="" /><!-- 画像にアクセシブルな名前がない場合は非知覚要素と見做します。 -->
    <div id="foo" popover>ポップオーバー</div>
  </div>
</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
