---
id: no-mismatched-aspect-ratio
description: imgまたはsource要素のwidth/height属性が実際の画像のアスペクト比と一致しない場合に警告します。
---

# `no-mismatched-aspect-ratio`

`<img>` 要素および `<picture>` 内の `<source>` 要素の `width` / `height` 属性が、参照する画像ファイルの実際のアスペクト比と一致しない場合に警告します。

`width`/`height` 属性が正しくないと、ブラウザが画像の読み込み前にこれらの値に基づいてスペースを確保するため、レイアウトシフト（CLS）が発生します。画像の読み込みが完了した際に、実際のアスペクト比と異なるとレイアウトがずれます。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## 動作

- `src`、`width`、`height` 属性を持つ `<img>` 要素をチェックします。
- `<picture>` 内の `<source>` 要素で `srcset`、`width`、`height` 属性を持つものもチェック対象です。`srcset` 属性の最初の URL を使って画像サイズを取得します。
- リモートURL（`http://`、`https://`）やデータURI（`data:`）はスキップされます。
- 画像ファイルが見つからない、または読み取れない場合は違反を報告しません（サイレントスキップ）。
- 動的な属性値（Vue の `:src="x"`、JSX の `src={x}` など）やスプレッド属性を持つ要素はスキップされます。コードとして書かれたリテラル（`src={"a.png"}`）は、フレームワークが描画する値として評価されます。フレームワークが出力しないリテラル（`null`、`false`）や、描画結果が分からないリテラルは、動的な値と同じくスキップされます。
- `src` のクエリ文字列（`?v=123`）やフラグメント（`#section`）はファイルパス解決時に除去されますが、キャッシュキーには保持されます。これはブラウザのキャッシュバスティングと同じ挙動で、同一ファイルでもクエリが異なれば別のキャッシュエントリとして扱われます。
- 比較には ±0.5 ピクセルの許容誤差があります。`width`/`height` 属性は整数のため、実際の比率が割り切れない画像は整数値と厳密に一致することがありません。許容誤差の計算には交差積(`|attrWidth * actualHeight - attrHeight * actualWidth| / actualWidth`)を使用し、浮動小数点の誤差を回避しつつピクセル相当の単位で不一致を表現しています。
- 画像の寸法はキャッシュされ、冗長なファイル読み取りを回避します。
- チェックする画像形式は PNG、GIF、BMP、WebP、JPEG、AVIF（および HEIF 系）、SVG のみです。形式は拡張子ではなくファイル先頭のバイト列で判定し、ファイルのヘッダーに書かれた寸法だけを読み取ります（SVG はルートの `<svg>` 要素の `width` / `height` / `viewBox`）。それ以外の形式のファイル、通常ファイルではないもの、極端に大きなヘッダー、壊れた画像は、報告せずにスキップします。これは以前のバージョンより意図的に狭くしたもので、画像デコード用のライブラリに依存せず、信頼できないファイルを安全に読むための代償です。他の形式（TIFF、ICO など）では、検出できなくなる不一致があります。

## オプション

### `documentRoot`

**型:** `string`
**デフォルト:** `process.cwd()`

絶対パス（`/` で始まるパス）の画像パスを解決するためのルートディレクトリ。相対パスはドキュメントのファイル位置から解決されます（利用可能な場合）。それ以外の場合は `documentRoot` から解決されます。

```json
{
  "no-mismatched-aspect-ratio": {
    "value": true,
    "options": {
      "documentRoot": "./public"
    }
  }
}
```

## コード例

❌ 間違ったコード例

```html
<!-- 画像は100x50だが属性では100x100と指定 -->
<img src="/photo.png" width="100" height="100" alt="写真" />
```

✅ 正しいコード例

```html
<!-- 画像は100x50、属性が2:1の比率に一致 -->
<img src="/photo.png" width="100" height="50" alt="写真" />

<!-- 比例的にスケール（2:1のまま） -->
<img src="/photo.png" width="200" height="100" alt="写真" />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
