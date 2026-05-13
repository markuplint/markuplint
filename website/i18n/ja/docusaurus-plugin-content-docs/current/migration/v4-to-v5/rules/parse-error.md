---
sidebar_position: 5
title: parse-error
---

# `parse-error` (組み込み violation チャネル) — 非致命的なパーサーエラー

組み込みの `parse-error` violation チャネルが、HTML LS の **非致命的** なパースエラー (parse5 の `onParseError` イベント) も拾うようになりました。**デフォルトはオフ**で、parse5 の code 単位でオプトインします。

## サマリ

| 変更内容                                                                                                      | 影響を受けるユーザー                                                         |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `parse-error` チャネルが非致命的なパーサーエラーも surface できるようになった (致命的 `ParserError` に加えて) | `severity.parseError` でオプトインしたユーザーのみ。既存設定にとっては no-op |
| `severity.parseError` が `Partial<Record<MLASTParseErrorCode, …>>` 形式を受け付ける                           | 単一 severity より細かい制御 (code 単位の severity) をしたいユーザー         |

**破壊的変更ではありません** — 新しい非致命的 code は明示的にオプトインしない限り何も emit しません。

## 何が変わったか

v4 では `parse-error` チャネルは **致命的** `ParserError` (パースが破綻したとき) でのみ発火しました。非致命的な HTML LS トークナイザ / ツリー構築のパースエラー (parse5 の [`onParseError`](https://parse5.js.org/interfaces/parse5.ParserOptions.html#onParseError) で配信され、[HTML LS §13.2.5](https://html.spec.whatwg.org/multipage/parsing.html#tokenization) に従ってパーサーが暗黙的にリカバリするもの) は捨てられていました。

v5 ではこれらのイベントが `MLASTDocument.parseErrors` を経由して、`severity.parseError` でオプトインされた場合に限り `ruleId: 'parse-error'` の violation として現れます。1 イベント = 1 violation です。

## 例

HTML LS のパースエラー 2 件 (`nested-comment` と `duplicate-attribute`) を含むソース:

```html
<!-- outer <!-- inner -->
tail -->
<div a a></div>
```

**デフォルト設定 — オプトインなし:**

```jsonc
// markuplint.config.jsonc
{
  "rules": {
    /* … 任意のルール … */
  },
}
```

→ `parse-error` violation は 0 件。

**一律オプトイン (全 code 有効化):**

```jsonc
{
  "severity": {
    "parseError": "error",
  },
}
```

→ `parse-error` が 2 件 (`nested-comment` 1 件 + `duplicate-attribute` 1 件)。

**code 単位オプトイン (Record 形式):**

```jsonc
{
  "severity": {
    "parseError": {
      "duplicate-attribute": "error",
      "nested-comment": "warning",
    },
  },
}
```

→ `parse-error` が 2 件: `nested-comment` は `warning`、`duplicate-attribute` は `error`。リストにない code はオフのまま。

## 有効化を検討する代表的な parse5 code

| Code                                                    | 意味                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `duplicate-attribute`                                   | 同じ要素に属性名が 2 回出現 (例: `<img src=a src=b>`)                                |
| `nested-comment`                                        | 閉じていないコメントの中に `<!--` が出現                                             |
| `eof-in-doctype`                                        | `<!doctype …>` 宣言の途中でファイル終端                                              |
| `unexpected-null-character`                             | ソースに `U+0000` のヌル文字が直接含まれる                                           |
| `non-void-html-element-start-tag-with-trailing-solidus` | 非 void 要素を XHTML 風に自己閉じ (例: `<div />`)                                    |
| `incorrectly-opened-comment`                            | `<!` の直後が `--` 以外 (テンプレートエンジンの `<?php …>` で頻発)                   |
| `unexpected-character-in-unquoted-attribute-value`      | クォートなし属性値に仕様で禁止された文字 (`<`、`=`、バッククォート等) が出現         |
| `missing-doctype`                                       | `<html>` で始まる完全なドキュメントに `<!doctype html>` が無い                       |
| `non-conforming-doctype`                                | DOCTYPE 宣言が `<!doctype html>` と完全一致しない (例: HTML 4.01 のレガシー DOCTYPE) |

全 60 code は `@markuplint/ml-ast` の `MLASTParseErrorCode` union 型として export されており、[parse5 の `ERR` enum](https://parse5.js.org/enums/parse5.ErrorCodes.html) をミラーします。各 code 名は HTML LS の安定識別子です。

## `severity.parseError` の 3 つの形式

### 1. 単一 severity (レガシー形式)

すべての parser エラー code に同じ severity を一律適用します。

```jsonc
{ "severity": { "parseError": "error" } }
```

```jsonc
{ "severity": { "parseError": "warning" } }
```

```jsonc
{ "severity": { "parseError": "off" } } // デフォルトもこれと等価
```

### 2. code 単位の Record 形式 (推奨: 狙い撃ち opt-in)

各キーは `MLASTParseErrorCode`、値は `'error' | 'warning' | 'info' | 'off' | boolean`。リストにない code は `'off'` 扱いになります。

```jsonc
{
  "severity": {
    "parseError": {
      "duplicate-attribute": "error",
      "missing-doctype": "warning",
      "nested-comment": "error",
    },
  },
}
```

### 3. 未指定 (デフォルト)

非致命的 code はすべて `'off'` 相当。致命的 `ParserError` (パーサーがスローしてドキュメントが処理不能) は引き続き `error` severity で emit されます。

## ドキュメント vs フラグメントパース (`parserOptions.documentMode`)

HTML パーサーは入力の先頭を見て document/fragment を自動判定します:

- `<!doctype html>` または `<html>` で始まる → document としてパース
- それ以外 → fragment としてパース

`missing-doctype`、`misplaced-doctype`、`non-conforming-doctype` などの parse5 エラーは **document レベル** でしか発火しません。次の 2 つの現実的なケースでは自動判定をオーバーライドしたくなります:

| ユースケース                                                                    | 設定                                          |
| ------------------------------------------------------------------------------- | --------------------------------------------- |
| `<head>`、`<meta>` 等で始まる SSR / テンプレート partial (完全なページではない) | `'fragment'` (`missing-doctype` 等を silence) |
| `<!doctype html>` を意図的に省略している完全な HTML page で、欠如を警告したい   | `'document'` (`missing-doctype` を surface)   |

```jsonc
{
  "parserOptions": {
    "documentMode": "fragment", // または "document"、"auto" (デフォルト)
  },
  "severity": {
    "parseError": {
      "missing-doctype": "warning",
    },
  },
}
```

**テンプレートエンジン系 parser**: Markdown のインライン HTML ブロックや Pug の raw HTML 行は常に partial です。`@markuplint/markdown-parser` と `@markuplint/pug-parser` はこれらの内部呼び出しで `'fragment'` を強制するので、ユーザー側で doctype エラーが Markdown / Pug のソースに漏れる心配はありません。

## 適用範囲

非致命的チャネルは `MLASTDocument.parseErrors` を populate するパーサーでのみ発火します。現状は `@markuplint/html-parser` (および `.html` テンプレート向けにこれをラップする `SvelteKitTemplateParser` / `HtmlInPugParser`) のみです。

フレームワークパーサー — `@markuplint/jsx-parser`、`vue-parser`、`svelte-parser` (`.svelte` ファイル)、`astro-parser`、`pug-parser` (`.pug` ファイル) — は parse5 を呼ばないため、`severity.parseError` をどう設定しても非致命的 `parse-error` violation は発生しません。

## ルールレベルのチェックとの関係 (自動 dedupe)

既存ルールの一部は parse5 code とスコープが重なります。例:

| ml ルール             | 重なる parse5 code                      |
| --------------------- | --------------------------------------- |
| `attr-duplication`    | `duplicate-attribute`                   |
| `doctype`             | `missing-doctype`                       |
| `no-orphaned-end-tag` | `end-tag-without-matching-open-element` |

parse5 code を mirror している ml ルールが ruleset で **有効** な場合、`@markuplint/ml-core` は parse-error チャネル側で該当 code を自動的に抑制します。同じ parse5 event に対して 2 つの violation が出ることはありません。ml ルール側の violation が優先されます。

```jsonc
{
  "rules": { "attr-duplication": true },
  "severity": { "parseError": "error" },
}
```

`<div a a></div>` に対して:

- ✅ `attr-duplication` violation (ルールから)
- ❌ `parse-error` violation の `duplicate-attribute` (dedupe で抑制)

ルールを無効にすれば parse5 チャネルが拾います:

```jsonc
{
  "rules": { "attr-duplication": false },
  "severity": { "parseError": "error" },
}
```

- ✅ `parse-error` violation の `duplicate-attribute`

この dedupe は **フック式** です。各ルールが自分の `meta.mirrorsParseErrorCodes` 配列を宣言し、ml-core は有効ルール群から集約するだけです。ml-core 内にハードコードな対応表はありません。parse5 event とスコープが重なる新ルールの作者は、`meta` に対応 code を宣言するだけで dedupe に参加できます。

検出範囲が parse5 より **広い** ルール (例: `attr-duplication` は JSX / SVG / authored component でも動く — parse5 はそこには反応しない) は mirror しても問題ありません。parse5 はそもそも HTML でしか発火しないので、dedupe で抑制される対象は元々 ml ルールが拾うイベントだけになります。

検出範囲が parse5 と **異なる方向** のルール (例: `character-reference` は `<`、`>`、`&`、`"` のエスケープ漏れを検出 — parse5 の `unknown-named-character-reference` 等は逆方向の「書式エラー」検出) は `mirrorsParseErrorCodes` を **宣言しないでください**。両者は独立した補完関係です。

## 関連

- 組み込みチャネル API: `@markuplint/ml-ast` の [`MLASTDocument.parseErrors`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/ml-ast/src/types.ts) と `MLASTParseErrorCode`
- HTML LS パースエラー: [§13.2.5 Tokenization](https://html.spec.whatwg.org/multipage/parsing.html#tokenization)
- parse5 コールバック: [`onParseError`](https://parse5.js.org/interfaces/parse5.ParserOptions.html#onParseError)
- 実装議論: [#3844](https://github.com/markuplint/markuplint/issues/3844)
