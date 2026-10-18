---
id: no-malformed-character-reference
description: 文字参照が不正な形式(未知の名前、セミコロンの欠落、NULL・サロゲート・制御文字・非文字・Unicode範囲外の数値参照)である場合に警告します。
---

# `no-malformed-character-reference`

`&...;`の形をした文字参照が不正な場合に警告します: 認識されない名前、終端のセミコロンの欠落、あるいはNULL・サロゲート・制御文字・非文字・Unicode範囲外のコードポイントを指す数値参照です。

> 他のセクションで説明するような特定の例において、テキストは文字参照と混合してもよい。これは、他の方法で合法的にテキストに含めることができない文字をエスケープするために使用できる。

引用: [HTML Living Standard 13.1.4 文字参照](https://momdo.github.io/html/syntax.html#syntax-charref)

このルールは、組み込みの`parseError`チャンネルが表示できるのと同じparse5トークナイザーのエラーを読み取り、他のすべてのルールと同じenable/severity/reason設定でカバーされるよう、このルールの名前のもとで報告します。

そもそも`&...;`の形で書かれていないリテラルの`<`やあいまいなアンパサンドは[`no-unescaped-char`](/docs/rules/no-unescaped-char)の担当であり、このルールの対象ではありません。

❌ 間違ったコード例

```html
<p>&xyz;</p>
<p>&amp text</p>
<p>&#;</p>
<p>&#x110000;</p>
```

✅ 正しいコード例

```html
<p>&amp; text</p>
<p>&#65;</p>
```
