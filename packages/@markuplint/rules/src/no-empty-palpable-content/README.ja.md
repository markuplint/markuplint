---
description: 空のパルパブルコンテンツ要素があれば警告します。
---

# `no-empty-palpable-content`

空のパルパブルコンテンツ要素があれば警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

> パルパブルコンテンツは、子孫の空でないテキスト、またはユーザーが聞くことができるもの（audio要素）、もしくは見ることができるもの（video、img、canvas要素）、もしくは他の方法で相互作用することができるもの（たとえば、対話的なフォームコントロール）のいずれかを提供することにより、要素を空でないものにする。

[HTML Living Standard 3.2.5.2.8 パルパブルコンテンツ](https://momdo.github.io/html/dom.html#palpable-content:~:text=%E3%83%91%E3%83%AB%E3%83%91%E3%83%96%E3%83%AB%E3%82%B3%E3%83%B3%E3%83%86%E3%83%B3%E3%83%84%E3%81%AF%E3%80%81%E5%AD%90%E5%AD%AB%E3%81%AE%E7%A9%BA%E3%81%A7%E3%81%AA%E3%81%84%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%80%81%E3%81%BE%E3%81%9F%E3%81%AF%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%81%8C%E8%81%9E%E3%81%8F%E3%81%93%E3%81%A8%E3%81%8C%E3%81%A7%E3%81%8D%E3%82%8B%E3%82%82%E3%81%AE%EF%BC%88audio%E8%A6%81%E7%B4%A0%EF%BC%89%E3%80%81%E3%82%82%E3%81%97%E3%81%8F%E3%81%AF%E8%A6%8B%E3%82%8B%E3%81%93%E3%81%A8%E3%81%8C%E3%81%A7%E3%81%8D%E3%82%8B%E3%82%82%E3%81%AE%EF%BC%88video%E3%80%81img%E3%80%81canvas%E8%A6%81%E7%B4%A0%EF%BC%89%E3%80%81%E3%82%82%E3%81%97%E3%81%8F%E3%81%AF%E4%BB%96%E3%81%AE%E6%96%B9%E6%B3%95%E3%81%A7%E7%9B%B8%E4%BA%92%E4%BD%9C%E7%94%A8%E3%81%99%E3%82%8B%E3%81%93%E3%81%A8%E3%81%8C%E3%81%A7%E3%81%8D%E3%82%8B%E3%82%82%E3%81%AE%EF%BC%88%E3%81%9F%E3%81%A8%E3%81%88%E3%81%B0%E3%80%81%E5%AF%BE%E8%A9%B1%E7%9A%84%E3%81%AA%E3%83%95%E3%82%A9%E3%83%BC%E3%83%A0%E3%82%B3%E3%83%B3%E3%83%88%E3%83%AD%E3%83%BC%E3%83%AB%EF%BC%89%E3%81%AE%E3%81%84%E3%81%9A%E3%82%8C%E3%81%8B%E3%82%92%E6%8F%90%E4%BE%9B%E3%81%99%E3%82%8B%E3%81%93%E3%81%A8%E3%81%AB%E3%82%88%E3%82%8A%E3%80%81%E8%A6%81%E7%B4%A0%E3%82%92%E7%A9%BA%E3%81%A7%E3%81%AA%E3%81%84%E3%82%82%E3%81%AE%E3%81%AB%E3%81%99%E3%82%8B%E3%80%82)より引用

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<div></div>
<div> </div>
<div>

</div>
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

```html
<div>text contet</div>
<div><img src="path/to" alt="image content" /></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
