---
id: no-disallowed-attr
description: 属性が仕様で定義されているものの、この文脈では許可されていない場合に警告します。
---

# `no-disallowed-attr`

属性が仕様で定義されているものの、この文脈では許可されていない場合に警告します: その要素での使用が明示的に禁止されている(`noUse`)、条件付き属性の条件が現在成立していない、あるいは autonomous custom element に `is` 属性が指定されている場合です。

このルールは[HTML Living Standard](https://html.spec.whatwg.org/)に基づいています。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

属性名がそもそも存在するかどうかは[`no-unknown-attr`](/docs/rules/no-unknown-attr)の担当、許可されている属性の値が不正な場合は[`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value)の担当です。

❌ 間違ったコード例

```html
<a target="_blank">The Anchor</a>
```

✅ 正しいコード例

```html
<a href="/" target="_blank">The Anchor</a>
```

:::note

このルールは、特定の条件下で**スプレッド属性**を持つ要素を評価しません。例えば、`href`属性を持たない`a`要素に`target`属性を設定することを禁止しますが、スプレッド属性に`href`プロパティが含まれるかどうかが分からない場合、Markuplintは評価できません。

```jsx
const Component = (props) => {
  return <a target="_blank" {...props}>;
}
```

:::

---

## 詳細

### `allowAttrs`オプションの設定 {#setting-allow-attrs-option}

[`no-unknown-attr`](/docs/rules/no-unknown-attr#setting-allow-attrs-option)が受け取る同名のオプションと同じ形式です。詳細はそちらを参照してください。両方のルールに同じ`allowAttrs`を設定してください。

### `ignoreAttrNamePrefix`オプションの設定

[`no-unknown-attr`](/docs/rules/no-unknown-attr#ignoreattrnameprefixオプションの設定)が受け取る同名のオプションと同じ形式です。
