---
id: no-input-file-value
description: '`<input type="file">` の value 属性が空文字列でないときに警告します。value 属性をその値によらず報告する no-disallowed-attr に置き換わりました。'
---

# `no-input-file-value`

`<input type="file">` の `value` 属性が空文字列でないときに警告します。

:::caution
このルールは [`no-disallowed-attr`](/docs/rules/no-disallowed-attr) に置き換わりました。HTML Living Standard は `<input type="file">` に `value` 属性を指定することを、空文字列であっても認めていません。`no-disallowed-attr` はそのすべてを報告しますが、このルールが報告するのは空文字列でない場合だけです。このルールは、設定に名前を書いている場合のために残してあり、v6 で削除します。
:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period, ja-technical-writing/no-unmatched-pair -->

> 要素のvalue属性は省略しなければならない。

[HTML Living Standard 4.10.5.1.17 File Upload状態 (type=file)](<https://momdo.github.io/html/input.html#file-upload-state-(type=file)>)より引用

❌ このルールに適合しない**誤った**コードの例

```html
<input type="file" value="document.pdf" />
```

✅ このルールに適合する**正しい**コードの例

```html
<input type="file" />
```
