---
description: id属性の値が同じツリー内で重複していたら警告します。
---

# `no-duplicate-id`

**id属性**の値が同じツリー内で重複していたら警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

> HTML要素で指定される場合、**id**属性値は、要素のツリーですべてのIDに共通して一意でなければならず、かつ少なくとも1つの文字を含まなければならない。値は一切のASCII空白文字を含んではならない。

[HTML Living Standard 3.2.6 グローバル属性](https://momdo.github.io/html/dom.html#global-attributes:~:text=HTML%E8%A6%81%E7%B4%A0%E3%81%A7%E6%8C%87%E5%AE%9A%E3%81%95%E3%82%8C%E3%82%8B%E5%A0%B4%E5%90%88%E3%80%81id%E5%B1%9E%E6%80%A7%E5%80%A4%E3%81%AF%E3%80%81%E8%A6%81%E7%B4%A0%E3%81%AE%E3%83%84%E3%83%AA%E3%83%BC%E3%81%A7%E3%81%99%E3%81%B9%E3%81%A6%E3%81%AEID%E3%81%AB%E5%85%B1%E9%80%9A%E3%81%97%E3%81%A6%E4%B8%80%E6%84%8F%E3%81%A7%E3%81%AA%E3%81%91%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%89%E3%81%9A%E3%80%81%E3%81%8B%E3%81%A4%E5%B0%91%E3%81%AA%E3%81%8F%E3%81%A8%E3%82%821%E3%81%A4%E3%81%AE%E6%96%87%E5%AD%97%E3%82%92%E5%90%AB%E3%81%BE%E3%81%AA%E3%81%91%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82%E5%80%A4%E3%81%AF%E4%B8%80%E5%88%87%E3%81%AEASCII%E7%A9%BA%E7%99%BD%E6%96%87%E5%AD%97%E3%82%92%E5%90%AB%E3%82%93%E3%81%A7%E3%81%AF%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82)より引用

ドキュメントは1つのツリーです。`template`要素の内容は独立したツリーであり、宣言的シャドウルート(`shadowrootmode`属性を持つ`template`要素が親要素に付与されたもの)も同様なので、それぞれの中で同じidを再び使えます。宣言的シャドウルートが付与される`template`要素はどのツリーにも属さず、その要素自身のidは数えません。付与されるかもしれない`template`要素(親がファイルの中にない、または親がコンポーネント、あるいは`shadowrootmode`が動的な値)も同様で、わからないものは数えないためです。idは、マークアップ中の文字参照を解決したうえで比較します。`a&#x62;`は`ab`です。

ReactとVueでは、ディレクティブのない`template`要素の子要素は、これらのフレームワークが要素に追加するため、ドキュメントのツリーにあります。そのため、同じツリーとして扱います。

❌ 間違ったコード例

```html
<html>
  <body>
    <div id="a">
      <p id="a">lorem</p>
    </div>

    <div id="a"></div>
    <img id="a" src="path/to" />
  </body>
</html>
```

✅ 正しいコード例

```html
<html>
  <body>
    <div id="a">
      <p id="b">lorem</p>
    </div>

    <div id="c"></div>
    <img id="d" src="path/to" />
  </body>
</html>
```

```html
<div id="a"></div>
<template>
  <div id="a"></div>
</template>

<div id="b"></div>
<div>
  <template shadowrootmode="open">
    <div id="b"></div>
  </template>
</div>
```

`error`

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
