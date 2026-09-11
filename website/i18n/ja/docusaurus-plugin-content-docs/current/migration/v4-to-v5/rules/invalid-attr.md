---
sidebar_position: 1
title: 'invalid-attr'
---

# `invalid-attr`

4 ルールに分割。v4 スキーマが許して v5 が許さない形式は破壊的です。

| 新ルール                | 検査                            |
| ----------------------- | ------------------------------- |
| `no-unknown-attr`       | 仕様にない名前                  |
| `no-disallowed-attr`    | ここには不許可な名前            |
| `no-invalid-attr-value` | 値の型・文法                    |
| `no-restricted-attr`    | ユーザーの `disallowAttrs` のみ |

`aria-*` と `role` は仕様検査 3 ルールでは対象外です。

| 旧オプション                       | 行き先                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `allowAttrs`                       | `no-unknown-attr`、`no-disallowed-attr`、`no-invalid-attr-value` |
| `ignoreAttrNamePrefix`             | `no-unknown-attr`、`no-disallowed-attr`                          |
| `allowToAddPropertiesForPretender` | `no-unknown-attr`                                                |
| `disallowAttrs`                    | `no-restricted-attr`（設定されていたときだけエイリアスに含める） |

`invalid-attr` は v6 まで非推奨警告で展開されます。[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)。

## `{ type: X }` ラッパー廃止

v4 の `ValueRule` は `{ type: AttributeType }` を許していました。v5 は型名（または pattern）を直接書きます。オブジェクト形式の `allowAttrs` / `disallowAttrs` は新ルールでは非推奨（配列推奨）。旧 `attrs` オプションは削除済みです。

## v5 で新たに検出される値

:::info 挙動変更（設定の対応は不要）
v5 では、これまで `Any` として素通りしていた領域について属性値のデフォルト検証範囲が拡張されました。設定を変更せずに v5 へアップグレードすると、以下のようなマークアップで v4 では発火しなかった違反が出る可能性があります。

分割に伴い CI 出力の `ruleId` も変わります。以下の各項目には報告元の v5 ルール名を記載しています。多くは `no-invalid-attr-value` で、条件付き許可の条件外は `no-disallowed-attr`、属性の欠落は `require-attr` です。
:::

各行は検証追加を導入した Issue と、その根拠となる HTML / URL / Encoding Living Standard のセクションを示します。新しい違反に納得できない場合は、まずリンク先の Issue を確認してください — いくつかは、nu-validator が仕様より厳しく解釈していたケースについて仕様引用つきで `excluded-ids.json` に記録しながら導入されています。

| 対象領域                                                                               | v5 で失敗する例                                                                                            | Issue                                                         | 仕様                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type` に応じた `input[value]`                                                         | `<input type="color" value="red">`                                                                         | [#3598](https://github.com/markuplint/markuplint/issues/3598) | [HTML LS — input 要素](https://html.spec.whatwg.org/multipage/input.html#the-input-element)                                                         |
| `rel` に応じた `link[as]`                                                              | `<link rel="preload" as="audio">`                                                                          | [#3189](https://github.com/markuplint/markuplint/issues/3189) | [HTML LS — link 要素](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-as)                                                           |
| `img[role]` + `alt=""`                                                                 | `<img role="presentation" alt="">`                                                                         | [#3641](https://github.com/markuplint/markuplint/issues/3641) | [ARIA in HTML — img](https://w3c.github.io/html-aria/#el-img)                                                                                       |
| URL 内の禁止コードポイント                                                             | `<a href="http://example.com/">`                                                                           | [#3629](https://github.com/markuplint/markuplint/issues/3629) | [URL LS — URL code points](https://url.spec.whatwg.org/#url-code-points)                                                                            |
| `http-equiv` に応じた `meta[content]` (`refresh` / `content-type` / `x-ua-compatible`) | `<meta http-equiv="refresh" content="garbage">`<br />`<meta http-equiv="X-UA-Compatible" content="IE=10">` | [#3734](https://github.com/markuplint/markuplint/issues/3734) | [HTML LS — meta `http-equiv`](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv)                                           |
| `media=` の MQL5 厳格文法                                                              | `<link media="screen and (color: 1em)">`                                                                   | [#3850](https://github.com/markuplint/markuplint/issues/3850) | [Media Queries Level 5 §4](https://www.w3.org/TR/mediaqueries-5/#mq-features)                                                                       |
| URL 系属性の URL LS 厳格検証                                                           | `<a href="http://user:pass@example.com">`                                                                  | [#3848](https://github.com/markuplint/markuplint/issues/3848) | [URL LS — URL parsing](https://url.spec.whatwg.org/#url-parsing)                                                                                    |
| メディア系 `src` の非空必須                                                            | `<img src="">`                                                                                             | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — valid non-empty URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces) |
| `<base href>` の URL LS 厳格化                                                         | `<base href="http://user@example.com/">`                                                                   | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — set the frozen base URL](https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url)                                  |
| `<input type=url value>` の絶対URL                                                     | `<input type="url" value="/relative">`                                                                     | [#3868](https://github.com/markuplint/markuplint/issues/3868) | [HTML LS — URL state](<https://html.spec.whatwg.org/multipage/input.html#url-state-(type=url)>)                                                     |
| フォーム送信系 URL の非空必須                                                          | `<form action="">`                                                                                         | —                                                             | [HTML LS — valid non-empty URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces) |
| `<video poster>` の非空必須                                                            | `<video poster="" src="movie.mp4">`                                                                        | —                                                             | [HTML LS — `video` `poster`](https://html.spec.whatwg.org/multipage/media.html#attr-video-poster)                                                   |
| `<base>` の href / target 必須                                                         | `<base>`                                                                                                   | —                                                             | [HTML LS — the `base` element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element)                                              |
| `<input type=image>` の alt 必須                                                       | `<input type="image" src="b.png">`                                                                         | —                                                             | [HTML LS — input image button](<https://html.spec.whatwg.org/multipage/input.html#image-button-state-(type=image)>)                                 |
| 単独の `autocomplete=webauthn` 禁止                                                    | `<input autocomplete="webauthn">`                                                                          | —                                                             | [HTML LS — `webauthn` token](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn)                 |
| `<select autocomplete>` に `webauthn` 不可                                             | `<select autocomplete="section-a billing work tel-country-code webauthn">`                                 | —                                                             | [HTML LS — `webauthn` token](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn)                 |
| `<input type=hidden autocomplete>` は `on` / `off` 不可                                | `<input type="hidden" autocomplete="on">`                                                                  | —                                                             | [HTML LS — autofill anchor mantle](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle)                  |
| `input[name="isindex"]` 禁止                                                           | `<input type="text" name="isindex">`                                                                       | —                                                             | [HTML LS — the `name` attribute](https://html.spec.whatwg.org/multipage/forms.html#attr-fe-name)                                                    |
| `srcset` の descriptor 重複禁止                                                        | `<img srcset="a 1x, b 1x">`                                                                                | —                                                             | [HTML LS — `srcset` attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)                                               |
| `link[disabled]` は stylesheet 限定                                                    | `<link rel="icon" href="x" disabled>`                                                                      | —                                                             | [HTML LS — `link[disabled]`](https://html.spec.whatwg.org/multipage/semantics.html#attr-link-disabled)                                              |
| `rel="alternate stylesheet"` 要 title                                                  | `<link rel="alternate stylesheet" href="x">`                                                               | —                                                             | [HTML LS — alternate stylesheet](https://html.spec.whatwg.org/multipage/links.html#rel-alternate-stylesheet)                                        |
| `lang` / `hreflang` の IANA レジストリ検証                                             | `<html lang="zzz">`                                                                                        | [#3829](https://github.com/markuplint/markuplint/issues/3829) | [RFC 5646 §2.2.9](https://www.rfc-editor.org/rfc/rfc5646.html#section-2.2.9)                                                                        |

### URL 系属性 (`href` / `src` / `action` / `cite` / `itemid` / `itemtype` 等) で新たに違反となるパターン

`URL` 型チェッカーが、`new URL()` が暗黙的に自動補正してしまう URL Living Standard の validation error を捕捉するようになりました。v4 で受理されていた以下のパターンが、v5 では `no-invalid-attr-value` 違反となります。

- **invalid-credentials** ([URL LS §1.1](https://url.spec.whatwg.org/#invalid-credentials)): `<a href="http://user:pass@example.com">`, `<a href="//user@example.com">`, さらに `<a href="http://@example.com">` (空の userinfo も authority に `@` を含む点で違反)。URL から userinfo を除いてください。
- **special-scheme-missing-following-solidus** ([URL LS](https://url.spec.whatwg.org/#special-scheme-missing-following-solidus)): `<a href="http:foo">`, `<a href="https:/foo">`, `<a href="ftp:bar">`。スペシャルスキーム URL は `scheme://` を要求します。
- **file-scheme-missing-following-solidus** ([URL LS](https://url.spec.whatwg.org/#file-scheme-missing-following-solidus)): `<a href="file:foo">`, `<a href="file:/foo">`, `<a href="file:">`。三本スラッシュ形式 `file:///path` を使用してください。
- **invalid-reverse-solidus** ([URL LS](https://url.spec.whatwg.org/#invalid-reverse-solidus)): `<a href="http://example.com\foo">`, `<a href="/foo\bar">`。URL LS はスペシャルスキーム URL の `\` を `/` に自動変換しますが validation error として報告します。非スペシャルスキーム (`data:`, `mailto:`) は opaque path の一部として扱うため引き続き受理されます。
- **file-invalid-Windows-drive-letter** ([URL LS](https://url.spec.whatwg.org/#file-invalid-windows-drive-letter)): `<a href="file:///C|/foo">`。URL LS が `C|` を `C:` に自動補正します。コロン形式を使用してください。
- **複数の `#`** ([URL LS — invalid-URL-unit](https://url.spec.whatwg.org/#invalid-url-unit) fragment state): `<a href="http://example.com/#a#b">`。2 つ目の `#` は自動 percent-encode されますが URL writing 文法では不正です。内側の `#` を `%23` に percent-encode するか除去してください。
- **IPv6 host 以外の `[`/`]`** ([URL LS — invalid-URL-unit](https://url.spec.whatwg.org/#invalid-url-unit)): `<a href="[61:24:74]:98">` (IPv6 風の相対 URL)、`<a href="http://example.com/path[a]">`。`[`/`]` は special scheme URL の host 位置でのみ許容される URL code point です。
- **`data:` URL に `,` が無い** ([RFC 2397](https://datatracker.ietf.org/doc/html/rfc2397)): `<a href="data:">`、`<a href="data:/example.com/">`。データ本体の直前に必須の `,` を入れてください。

### メディア `src`・`<base href>`・`<input type=url value>` で新たに違反となるパターン

上記の URL LS パイプラインに加え、3 つの専用型でさらに厳格化されています。

- **`<audio src>` / `<embed src>` / `<iframe src>` / `<img src>` / `<input type=image src>` / `<script src>` / `<source src>` / `<track src>` / `<video src>`** は `NonEmptyURL` 型を使うようになり、ASCII 空白を剥がした結果が空 (空白のみ含む場合も) の値を拒否します。HTML LS §4.8 はこれらを「valid non-empty URL potentially surrounded by spaces」と定義しています。
- **`<form action>` / `<button formaction>` / `<input formaction>` / `<object data>` / `<link href>` / `<video poster>`** も同じ `NonEmptyURL` 型を使うようになりました。いずれも仕様上「valid non-empty URL potentially surrounded by spaces」と定義されていますが、以前は空文字も許容する `URL` 型でした。空文字 (および空白のみの値) は `no-invalid-attr-value` 違反となります。
- **`<base>` は `href`、`target`、またはその両方を必要とします** (HTML LS §4.2.3)。属性のない `<base>` は v4 では黙認されていましたが、v5 では `require-attr` ルールが違反として報告します。いずれかを指定すれば要件を満たします。
- **`<input type="image">` は `alt` 属性を必須化** (HTML LS §4.10.5.1.18)。`type="image"` で `alt` が無い場合に `require-attr` ルールが発火します。
- **単独の `autocomplete="webauthn"` は非適合** (HTML LS §4.10.18.7)。`webauthn` トークンは「他のトークンと組み合わせて使われなければならない」とされており、`<input autocomplete="webauthn">` のような単独使用は v5 で違反となります。`autocomplete="name webauthn"` のような組み合わせは引き続き有効です。
- **`<select autocomplete>` に `webauthn` トークンは使えません** (HTML LS §attr-fe-autocomplete-webauthn)。仕様は `webauthn` を `<input>` と `<textarea>` に限定しています (「webauthn is only valid for input and textarea elements」)。末尾に `webauthn` を含む `<select>` (例: `autocomplete="section-a billing work tel-country-code webauthn"`) は `webauthn` トークンを指す `no-invalid-attr-value` 違反になります。`webauthn` を除いた同じ autofill 文法は `<select>` でも引き続き有効です。`<textarea>` と非 hidden の `<input>` には影響しません。
- **`<input type="hidden">` の `autocomplete` は `on` / `off` を含められません** (HTML LS §autofill-anchor-mantle)。hidden input は _autofill anchor mantle_ を着用し、その値は「autofill detail token だけを含む space-separated tokens に限定される (`on` / `off` は禁止)」と規定されています。具体的なフィールド名 (`autocomplete="transaction-currency"` 等) に置き換えるか属性を削除してください。非 hidden の `<input>` は引き続き `on` / `off` を受理します。
- **`<input name="isindex">` は予約値** (HTML LS §4.10.18.2)。廃止された `<isindex>` 要素の名残として、リテラル値 `isindex` は予約されています。v5 では `name` 属性が `isindex` (大文字小文字区別) のときに違反となります。
- **`srcset` の descriptor 重複は非適合** (HTML LS §4.8.4.4.1)。仕様は「重複した descriptor を持つ image candidate string は invalid」と定義しています。`Srcset` 型チェッカーは密度スロット (`1x, 1x`、`1x, 1.0x`、または省略 = 暗黙 1x と `1x` の組み合わせ) と幅スロット (`480w, 480w`) いずれの重複も拒否します。判定は数値比較なので、同じ値の異なる表記 (`1` vs `1.0` 等) も衝突します。
- **`<link disabled>` は `rel="stylesheet"` 限定** (HTML LS §4.6.7.18)。`disabled` 属性は「rel に stylesheet キーワードを含む link 要素にのみ指定可能」と仕様で限定されています。`<link rel="icon" disabled>` 等は `no-disallowed-attr` 違反となります。属性自体は仕様に定義されていますが、この文脈では条件付き許可の条件を満たさないためです。
- **`<link rel="alternate stylesheet">` は非空の `title` 必須** (HTML LS §4.6.7.4)。rel に `alternate` と `stylesheet` の両方を含む場合、仕様により「非空の」`title` 属性が必要です。title が無いケースは `require-attr` ルール、明示的な空 (`title=""`) は `no-invalid-attr-value` ルール (`NoEmptyAny` 条件付き型 override) が発火します。
- **`<base href>`** は既存の `data:`/`javascript:` スキーム禁止に加え、URL LS の完全な検証も実行するようになりました。以前は `data:`/`javascript:` 以外なら無検査で受理していました。
- **`<input type="url" value>`** は絶対 URL 限定の variant を使うようになりました。空の値は受理 (HTML LS §4.10.5.1.7 「指定されかつ非空なら」) ですが、相対 URL は拒否します。完全な `https://…` 形式を使うか、属性を空にしてください。

:::note 仕様より厳しい既知ケース
`<base href>` を完全な URL Living Standard パイプラインに通したことで、Node の `URL.canParse` の厳格さも `<base href>` に適用されるようになりました。副作用として、IPv4 形式で最終オクテットが 255 を超えるホスト値 (例: `<base href="http://192.168.0.257/">`) が markuplint で違反扱いになります。URL LS の host parser は IPv4 parse 失敗時に通常のホスト名としてフォールバックする規定があり nu-validator はこれを許容しますが、`URL.canParse` はこのフォールバックを実装していません。実利用に影響が出る場合は [Issue を起票](https://github.com/markuplint/markuplint/issues/new/choose) してください — 厳格な仕様要件ではなく「仕様より厳しいコーナーケース」として追跡しています。
:::

### 言語タグの IANA レジストリ検証 (`lang` / `hreflang` / `srclang` 等)

HTML LS は `lang` 属性の値を[「valid BCP 47 language tag」](https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes)と規定しており、[RFC 5646 §2.2.9](https://www.rfc-editor.org/rfc/rfc5646.html#section-2.2.9) は _valid_ を「Either the tag is in the list of grandfathered tags or all of its primary language, extended language, script, region, and variant subtags appear in the IANA Language Subtag Registry as of the particular registry date」と定義しています。v4 は構文形状 (well-formedness) のみを検査していましたが、v5 は各 subtag を [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry) と照合します。レジストリデータは npm パッケージ [`language-subtag-registry`](https://www.npmjs.com/package/language-subtag-registry) が提供しており、依存の更新でデータも更新されます。

`BCP47` 型を持つすべての属性 — `lang` / `xml:lang` (HTML と SVG)、`hreflang`、`<track srclang>`、SVG の `systemLanguage` — が対象です。

新たに違反となるもの:

- **未登録の primary language subtag**: `lang="zzz"` — `zzz` は ISO 639 / IANA レジストリに存在しません。
- **未登録の extended language subtag**: `lang="bat-smg"` — `smg` (サモギティア語) は primary language subtag であり、登録された extlang ではありません。`lang="sgs"` を使ってください。
- **未登録の script / region / variant subtag**: `en-Qzzz`、`en-Zzzz-ZY` など。
- **variant subtag の重複** (`de-DE-1901-1901`) と **singleton (extension) subtag の重複** (`en-a-bbb-a-ccc`) — RFC 5646 §2.2.9 の残りの validity 条件です。

引き続き有効なもの:

- **Grandfathered タグ** — 現代の置き換えがあるもの (`i-klingon`) も、無いもの (`i-default`) も両方。
- **非推奨 (deprecated) subtag** (`lang="mo"`) — 非推奨化は登録の取り消しではなく、RFC 5646 の validity は区別しません。nu-validator も warning のみで、markuplint も違反にしません。
- **プライベート利用のタグ・subtag** — `x-default`、`qaa`、`en-Qaaa`、`en-XA` (レジストリの `qaa..qtz` / `qaaa..qabx` / `qm..qz` / `xa..xz` レンジ)。
- **Extension シーケンス** (`en-u-ca-gregory`) — extension subtag は各拡張の RFC が管轄し、RFC 5646 §2.2.9 はこれを plain validity より厳しい別の適合クラスと定義しています。

### `media=` で新たに違反となるパターン

`link` / `style` / `source` / `svg|style` の `media` 属性は専用の `MediaQueryList` チェッカーで検証されるようになりました。v4 では汎用の `<media-query-list>` 経由で素通りしていた以下が、v5 では `no-invalid-attr-value` 違反となります。

- **非推奨メディアタイプ** (MQL5 §2.3): `<link media="aural">`, `<link media="tv">`, `<link media="projection">`, `<link media="handheld">`, `<link media="braille">`, `<link media="embossed">`, `<link media="speech">`, `<link media="tty">` 等。`screen` / `print` / `all` への置き換え、もしくは feature query を利用してください。
- **非推奨メディア特性** (MQL4): `(device-width: ...)`, `(device-height: ...)`, `(device-aspect-ratio: ...)` および `min-` / `max-` バリアント。`(width: ...)` / `(height: ...)` / `(aspect-ratio: ...)` を利用してください。
- **特性ごとの値型違反** (MQL5 §4): `(min-width: 400)` (長さに単位なし)、`(min-width: 400dpi)` (長さに解像度単位)、`(color: 1em)` (整数に長さ単位)、`(resolution: 96)` (解像度に単位なし) 等。
- **`<integer>` 特性に負値** (MQL5 §4.4): `(color: -1)`, `(monochrome: -2)`, `(min-color-index: -1)` 等。仕様は非負を要求しています。
- **`<ratio>` 特性に非正値** (MQL5 §4.5): `(aspect-ratio: 0)`, `(aspect-ratio: 0/1)`, `(aspect-ratio: -1/1)` 等。仕様は厳密に正を要求しています。

### `media=` / `sizes=` に不正なメディア条件 (`<general-enclosed>` 拒否)

[Media Queries Level 5 §3](https://www.w3.org/TR/mediaqueries-5/#general-enclosed) は `<general-enclosed>` を著者スタイルシートで用いることを明示的に禁止しています (旧 UA が将来の構文追加をパースできるようにするための後方互換用途にのみ存在)。v4 では css-tree の文法が寛容なため `<general-enclosed>` フォールバックに落ちる `<media-condition>` が素通りしていましたが、v5 では `no-invalid-attr-value` 違反として拒否します。

`link` / `style` / `source` / `svg|style` の `media=` と、`img` / `source` の `sizes=` で以下が新たに検出されます。

- `(min-width:)` — コロン後の値が空。
- `(123)` — `<ident>` が期待される位置に数値トークン。
- その他 `<media-feature>` 文法に合致せず `<general-enclosed>` フォールバックにのみマッチする `(...)` 形。

未知の特性名を用いた well-formed な `(<ident>: <value>)` 形 (例: `(-webkit-min-device-pixel-ratio: 2)`, `(future-feature: 42)`) はそのまま通過します。css-tree はこれらを `Feature` として解釈するため、将来の MQ 追加への前方互換性は保たれます。

`sizes=` 内の `<source-size-value>` に含まれる CSS 関数呼び出し (`clamp(...)`, `min(...)`, `max(...)`, `calc(...)`, `env(...)`) は明示的にスキップされます — 関数の引数リストは media condition ではありません。

これらの厳格化を個別に無効化する設定はありません。特定のケースで問題がある場合は、失敗するマークアップと仕様の該当段落を添えて [Issue を起票](https://github.com/markuplint/markuplint/issues/new/choose) してください — 仕様の誤読が判明したものは修正または範囲を狭めます。

### 上記に含まれていない追加パターン

RC 期間中に同じルール群がさらに厳格化した領域です。上の表には含まれていません。「設定の対応は不要」という点は同じです。

| 対象領域                                                                                   | v5 で失敗する例                                                                                 | Issue                                                         | 仕様                                                                                                                          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `script` 属性の適用可否表                                                                  | `<script type="module" defer src="a.js">`、`<script blocking="render">`（`src` なし）           | —                                                             | [HTML LS §4.12.1](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer)                                    |
| `meta[http-equiv=content-type]` は `charset=utf-8` の完全一致が必要                        | `<meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS">`                       | —                                                             | [HTML LS — encoding declaration state](https://html.spec.whatwg.org/multipage/parsing.html#attr-meta-http-equiv-content-type) |
| `meta[http-equiv=content-security-policy]` の CSP3 文法検証                                | `<meta http-equiv="Content-Security-Policy" content="not a policy">`                            | [#3942](https://github.com/markuplint/markuplint/issues/3942) | [CSP Level 3](https://www.w3.org/TR/CSP3/)                                                                                    |
| `bdo[dir]` は `auto` を許容せず、必須属性になった                                          | `<bdo dir="auto">`、`<bdo>`（`dir` なし）                                                       | —                                                             | [HTML LS — bdo 要素](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-bdo-element)                        |
| `usemap="#"`（空のフラグメント）                                                           | `<img usemap="#">`                                                                              | [#3945](https://github.com/markuplint/markuplint/issues/3945) | [HTML LS — HashName reference](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#hash-name-reference)             |
| `itemid` / `itemtype` は `itemscope` が必要                                                | `<div itemid="https://example.com/item">`（`itemscope` なし）                                   | [#3733](https://github.com/markuplint/markuplint/issues/3733) | [HTML LS §5.7.4](https://html.spec.whatwg.org/multipage/microdata.html#attr-itemid)                                           |
| `input` の `min` / `max` は type ごとの書式が必要、`progress[max]` は 0 より大きい値が必要 | `<input type="date" min="not-a-date">`、`<input type="number" min="abc">`、`<progress max="0">` | —                                                             | [HTML LS §4.10.5](https://html.spec.whatwg.org/multipage/input.html#the-input-element)                                        |
| `source[sizes]` は `srcset` が必要                                                         | `<source sizes="100vw">`（`srcset` なし）                                                       | —                                                             | [HTML LS — source 要素](https://html.spec.whatwg.org/multipage/embedded-content.html#attr-source-sizes)                       |
