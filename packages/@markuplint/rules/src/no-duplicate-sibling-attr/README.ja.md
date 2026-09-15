---
id: no-duplicate-sibling-attr
description: 兄弟要素間で一意であるべき属性が、同じ親の下で同じ種類の複数の要素に指定されている場合に警告します。
---

# `no-duplicate-sibling-attr`

[HTML Living Standard](https://html.spec.whatwg.org/)に基づき、コンテンツモデルが兄弟要素間で一意であるべきと定めている属性(`uniqueAttrs`)が、同じ親の下で同じ種類の複数の要素に指定されている場合に警告します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

❌ 間違ったコード例

```html
<video>
  <track default src="a.vtt" />
  <track default src="b.vtt" />
</video>
```

✅ 正しいコード例

```html
<video>
  <track default src="a.vtt" />
  <track src="b.vtt" />
</video>
```
