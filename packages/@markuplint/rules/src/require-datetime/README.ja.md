---
description: time要素に無効なコンテンツが含まれている場合、datetime属性が必要であることを警告します。
---

# `require-datetime`

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

`time`要素に無効なコンテンツが含まれている場合、`datetime`属性が必要であることを警告します。

> time要素は、datetime属性でコンテンツの機械可読形式に沿って、そのコンテンツを表す。コンテンツの種類は、以下に説明するような、日付、時刻、タイムゾーンのオフセット、および期間の様々な種類に限定される。
>
> datetime属性は存在してもよい。存在する場合、その値は、機械可読形式での要素コンテンツの表現でなければならない。

[HTML Living Standard 4.5.14 time要素](https://momdo.github.io/html/text-level-semantics.html#the-time-element:~:text=time%E8%A6%81%E7%B4%A0%E3%81%AF,%E3%81%A7%E3%81%AA%E3%81%91%E3%82%8C%E3%81%B0%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82)より引用

<!-- prettier-ignore-start -->

❌ 間違ったコード例

```html
<time>1/5/2023</time>
<time>Today</time>
<time>令和5年1月5日</time>
```

✅ 正しいコード例

```html
<time>2023-01-05</time>
<time datetime="2023-01-05">1/5/2023</time>
<time datetime="2023-01-05">Today</time>
<time datetime="2023-01-05">令和5年1月5日</time>
```

<!-- prettier-ignore-end -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
