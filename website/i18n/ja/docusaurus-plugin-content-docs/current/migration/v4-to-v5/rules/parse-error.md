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

## ルールレベルのチェックとの関係 (mirror 宣言)

一部の ml ルールは検出スコープの一部として parse5 codes をカバーします。これらは `meta.mirrorsParseErrorCodes` で宣言:

| ml ルール             | カバーする parse5 codes                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `attr-duplication`    | `duplicate-attribute`                                                                                      |
| `doctype`             | `missing-doctype`                                                                                          |
| `no-orphaned-end-tag` | `end-tag-without-matching-open-element`                                                                    |
| `character-reference` | 文字参照系 8 codes (`unknown-named-character-reference`、`missing-semicolon-after-character-reference` 等) |

該当ルールが ruleset で **mention されている** (任意の値: `true`、`false`、severity、object — つまりユーザーがそのチェックについて意図を表明している) 場合、`@markuplint/ml-core` は mirror 宣言を尊重し、parse-error チャネル側で該当 codes を抑制します:

- **ルール有効** → ルール自身が violation を出す。parse-error は silent
- **ルール無効** (`false`) → ルールも parse-error も silent — ユーザーが opt-out した

```jsonc
{
  "rules": { "attr-duplication": true },
  "severity": { "parseError": "error" },
}
```

`<div a a></div>` に対して:

- ✅ `attr-duplication` violation (ルールから)
- ❌ `parse-error` violation の `duplicate-attribute` (mirror 宣言で抑制)

ルールを無効にすると **両チャネルとも silent** — ユーザーが明示的に opt-out したから:

```jsonc
{
  "rules": { "attr-duplication": false },
  "severity": { "parseError": "error" },
}
```

- ❌ どちらの violation も出ない (ユーザーが opt-out)

ml ルールを介さずに parse-error チャネルから直接 code を surface したい場合、ルールを **完全に省略** (`rules` に entry を書かない) して `severity.parseError` で opt-in:

```jsonc
{
  // `rules.attr-duplication` の entry なし → ml-core は抑制しない
  "severity": { "parseError": "error" },
}
```

- ✅ `parse-error` violation の `duplicate-attribute` (チャネルが直接担当)

この dedupe は **フック式** です。各ルールが自分の `meta.mirrorsParseErrorCodes` 配列を宣言し、ml-core は有効ルール群から集約するだけです。ml-core 内にハードコードな対応表はありません。parse5 event とスコープが重なる新ルールの作者は、`meta` に対応 code を宣言するだけで dedupe に参加できます。

検出範囲が parse5 より **広い** ルール (例: `attr-duplication` は JSX / SVG / authored component でも動く — parse5 はそこには反応しない) は mirror しても問題ありません。parse5 はそもそも HTML でしか発火しないので、dedupe で抑制される対象は元々 ml ルールが拾うイベントだけになります。

検出範囲が parse5 と **異なる方向** のルール (例: `character-reference` は `<`、`>`、`&`、`"` のエスケープ漏れを検出 — parse5 の `unknown-named-character-reference` 等は逆方向の「書式エラー」検出) は `mirrorsParseErrorCodes` を **宣言しないでください**。両者は独立した補完関係です。

### dedupe は ruleset レベルで判定

dedupe チェックは **トップレベルの `rules` 設定** だけを見て、ノード単位の設定は見ません。`nodeRules` で局所的に mirror ルールを無効化した場合:

```jsonc
{
  "rules": { "attr-duplication": true },
  "nodeRules": [{ "selector": "span", "rules": { "attr-duplication": false } }],
  "severity": { "parseError": "error" },
}
```

…parse-error チャネルは依然として `attr-duplication` を global に有効と見なし、`<span>` 上の `duplicate-attribute` も **再 surface しません**。`<div><span attr attr></span></div>` に対して `<span>` の violation は 0 件 — 「ここではこのチェックを opt-out した」という意図と整合した挙動です。「parse-error チャネルが補完してくれる」という挙動ではありません。

mirror ルールを局所無効化した要素で parse-error チャネルを発火させたい場合は、ルールを **global に無効化** して、parse5 code だけ enable してください:

```jsonc
{
  "rules": { "attr-duplication": false },
  "severity": { "parseError": { "duplicate-attribute": "error" } },
}
```

## 関連

- 組み込みチャネル API: `@markuplint/ml-ast` の [`MLASTDocument.parseErrors`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/ml-ast/src/types.ts) と `MLASTParseErrorCode`
- HTML LS パースエラー: [§13.2.5 Tokenization](https://html.spec.whatwg.org/multipage/parsing.html#tokenization)
- parse5 コールバック: [`onParseError`](https://parse5.js.org/interfaces/parse5.ParserOptions.html#onParseError)
- 実装議論: [#3844](https://github.com/markuplint/markuplint/issues/3844)
