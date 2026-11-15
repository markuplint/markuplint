---
id: no-deprecated-element
description: 非推奨と定義されている要素がある場合に警告します。
---

# `no-deprecated-element`

**非推奨**と定義されている要素がある場合に警告します。

このルールは[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)が示す[HTML Living Standard](https://html.spec.whatwg.org/)ベースの情報を参照します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

HTML Living Standardが非準拠かつ廃止された機能としてマークしている要素は[`no-obsolete-element`](/docs/rules/no-obsolete-element)の担当です。

:::note
このルールは、HTML・SVG・MathMLの要素を対象にします。現在の仕様データで、廃止(obsolete)されずに非推奨(deprecated)のみとなっている要素は、MathMLの `<maction>` と `<mfenced>` だけなので、現時点ではこの2つを報告します。HTMLとSVGの要素は報告しません。将来の仕様データ更新でそのような要素が追加された場合に、新しいルールを追加せずとも自動的に検知できるよう用意されています。
:::

❌ 間違ったコード例

```html
<math>
  <mfenced></mfenced>
</math>
```

✅ 正しいコード例

```html
<math>
  <mfrac>
    <mn>1</mn>
    <mn>2</mn>
  </mfrac>
</math>
```
