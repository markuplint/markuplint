---
id: no-deprecated-element
description: 非推奨と定義されている要素がある場合に警告します。
---

# `no-deprecated-element`

**非推奨**と定義されている要素がある場合に警告します。

このルールは[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)が示す[HTML Living Standard](https://html.spec.whatwg.org/)ベースの情報を参照します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

HTML Living Standardが非準拠かつ廃止された機能としてマークしている要素は[`no-obsolete-element`](/docs/rules/no-obsolete-element)の担当です。

:::note
現在の仕様データでは、廃止(obsolete)されずに非推奨(deprecated)のみとなっているHTMLまたはSVG要素は存在しないため、このルールは現時点では効果を持ちません。将来の仕様データ更新でそのような要素が追加された場合に、新しいルールを追加せずとも自動的に検知できるよう用意されています。
:::
