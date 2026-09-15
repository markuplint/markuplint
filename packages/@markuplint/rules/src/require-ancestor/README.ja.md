---
id: require-ancestor
description: 要素に必須の祖先要素が存在しない場合に警告します。
---

# `require-ancestor`

[HTML Living Standard](https://html.spec.whatwg.org/)に基づき、要素がコンテンツモデルで指定された必須の祖先要素(`descendantOf`)なしに出現している場合に警告します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

❌ 間違ったコード例

```html
<div>
  <area href="/path" alt="Link" />
</div>
```

✅ 正しいコード例

```html
<map name="example">
  <area href="/path" alt="Link" />
</map>
```
