---
id: no-disallowed-ancestor
description: 要素が、コンテンツモデルで禁止されている祖先要素の子孫として出現している場合に警告します。
---

# `no-disallowed-ancestor`

[HTML Living Standard](https://html.spec.whatwg.org/)に基づき、要素が、コンテンツモデルが明示的に禁止している祖先要素(`forbiddenAncestors`)の子孫として出現している場合に警告します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

子要素が親要素自体のコンテンツモデルで許可されているかどうかは[`permitted-contents`](/docs/rules/permitted-contents)の担当であり、このルールの対象ではありません — 一部の要素は、直接の親であるかどうかにかかわらず、特定の祖先要素の下のどこにも出現できないという追加の制約を持っています。

❌ 間違ったコード例

```html
<address>
  <div>
    <address>Nested address</address>
  </div>
</address>
```

✅ 正しいコード例

```html
<address>Contact information</address>
```
