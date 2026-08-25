# よくある質問

<!-- textlint-disable ja-technical-writing/no-exclamation-question-mark -->

## はじめたい

### 初心者ですが使っても大丈夫ですか？

大丈夫です。VS Codeであれば[拡張機能](https://marketplace.visualstudio.com/items?itemName=markuplint.vscode-markuplint)をインストールするだけですぐに利用できます。Node.jsやコマンドラインの知識は不要です。また、[プレイグラウンドサイト](https://playground.markuplint.dev)でインストールなしに試すこともできます。

### Reactで使えますか？

もちろん使えます。React（JSX）の他に、Vue、Svelte、Astro、Alpine.js、HTMX、Pug、PHPなどに対応しています。詳しくは[HTML以外で使う](/docs/guides/beyond-html)、またはそのまま使える設定例として[Reactプロジェクトのユースケース](/docs/configuration/usecases/react-project)をご覧ください。

### Angularに対応していないようですが？

公式には用意できておりませんが、有志の方が[`markuplint-angular-parser`](https://www.npmjs.com/package/markuplint-angular-parser)を作ってくださっています。こちらをご利用ください。

### 対応しているエディタはVS Codeだけですか？

公式に対応しているのは**VS Code**ですが、**Cursor**、**Windsurf**、**VSCodium**などVS Codeベースのエディタであれば、VS Code拡張機能がそのまま利用できるため動作が期待できます。[VS Code拡張のソースコード](https://github.com/markuplint/markuplint/tree/main/vscode)は公開しているので、その他のエディタについても有志による開発がなされることに期待しています。

## 警告を解決したい

### OGPで怒られます

Open GraphプロトコルはHTMLとは異なる仕様のため、標準で対応していません。[対応できる設定例](/docs/rules/no-unknown-attr#the-open-graph-protocol)がありますので参考にしてください。

### `no-unknown-attr`ルールで怒られます

[`no-unknown-attr`](/docs/rules/no-unknown-attr)はHTMLの仕様に存在しない属性が要素に指定されていると警告します。フレームワークを利用していると頻繁に遭遇するかもしれません。[`allowAttrs`](/docs/rules/no-unknown-attr#setting-allow-attrs-option)オプションで許可したい属性を追加できます。

ReactとVueに関してはスペックプラグインにより、各構文固有の属性には警告がでないように定義されています。（参考: [なぜスペックプラグインが必要なのですか](/docs/guides/beyond-html#why-need-the-spec-plugins)）

### `no-unescaped-char`ルールで怒られます

<!-- textlint-disable ja-technical-writing/ja-no-weak-phrase -->

[`no-unescaped-char`](/docs/rules/no-unescaped-char)は、デフォルトではリテラルの`<`(HTMLが常にエスケープを要求する唯一の文字)のみを検出します。[`strict`](/docs/rules/no-unescaped-char#setting-strict-option)オプションを有効にすると、`>`、`"`、素の`&`も検出対象になりますが、これらは技術的には未エスケープでも仕様に準拠しており、テンプレートエンジンによっては不都合が起きることがあります。その場合は、ルールを[無効化](/docs/guides/ignoring-code)するか、[Issueで報告](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix)してください。

<!-- textlint-enable ja-technical-writing/ja-no-weak-phrase -->

### `require-accessible-name`ルールで怒られます

[アクセシブルな名前](https://momdo.github.io/wai-aria-1.2/#dfn-accessible-name)は`aria-label`で解決できますが、最初の解決手段としてそれを使用するのは**避けましょう**。[アクセシブルな名前の計算](https://www.w3.org/TR/accname-1.2/)は複雑で、要素によって得られる場所が異なります:

| 要素       | 主な名前が得られる場所 | `aria-label`の使用     |
| ---------- | ---------------------- | ---------------------- |
| `a`        | コンテンツ             | 可能（**推奨しない**） |
| `img`      | `alt`属性              | 可能（**推奨しない**） |
| `h1`〜`h6` | コンテンツ             | 可能（**推奨しない**） |
| `button`   | コンテンツ             | 可能（**推奨しない**） |
| `input`    | `label`要素            | 可能（**推奨しない**） |
| `select`   | `label`要素            | 可能（**推奨しない**） |
| `textarea` | `label`要素            | 可能（**推奨しない**） |

### 警告が出たコードをどうやって修正したらいいのかわかりません

<!-- textlint-disable ja-technical-writing/no-doubled-joshi, ja-technical-writing/ja-no-weak-phrase -->

基本的には**必要と言われた要素や属性は追加し、不要と言われた要素や属性は削除します**。スタイルの修正が必要なら、スタイルを修正してください。HTMLの要素や属性にはルールがありますが、スタイルをどの要素に施すかにはルールはありません。準拠することで得られるメリットはアクセシビリティや互換性など多くあります。

修正案を考えるにあたって**HTMLの知識は必須**です。Markuplintから警告を受けた要素や属性から少しずつ調べていくと良いでしょう。[HTML Standard](https://momdo.github.io/html/)の仕様を調べることが一番ですが、MDNの「[HTML の学習: ガイドとチュートリアル](https://developer.mozilla.org/ja/docs/Learn/HTML)」から始めてもよいかもしれません。

<!-- textlint-enable ja-technical-writing/no-doubled-joshi, ja-technical-writing/ja-no-weak-phrase -->

### どう考えてもおかしくないのに警告がでます

バグの可能性が高いですが、まず確認してください:

- [サポートが間に合っていない構文](/docs/guides/beyond-html#supported-syntaxes)を使っていませんか？ [#240](https://github.com/markuplint/markuplint/issues/240)

未対応構文の問題であれば、部分的にルールを無効化してください。それ以外であればご報告ください。

## もっと知りたい

### Markuplintはアクセシビリティチェッカーとして機能しますか？

<!-- textlint-disable ja-technical-writing/no-doubled-joshi -->

Markuplintは**コード上で静的に発見しうる**アクセシビリティの問題をチェックします:

- HTMLやSVG、WAI-ARIAが仕様に準拠しているか
- アクセシブルな名前の欠落、不正なARIAロール、不適切なランドマーク構造
- 設定したプロジェクト固有のルール

アクセシビリティは情報設計やビジュアルデザイン、コンテンツ戦略にも関わります。Markuplintがコードに関わる部分を担うことで、その他の問題解決に取り組む余裕を生み出すことを期待しています。

<!-- textlint-enable ja-technical-writing/no-doubled-joshi -->

### HTMLHintやeslint-plugin-jsx-a11yと何が違うの？

主な違い:

- **構造の検証** — 要素の親子関係（コンテンツモデル）をチェックできる
- **強力なセレクタ** — CSSセレクタ、拡張擬似クラス、正規表現できめ細かくルールを制御
- **幅広い構文サポート** — HTML、JSX以外に17以上の構文に対応

[**HTMLHint**](https://htmlhint.com/)、[**eslint-plugin-jsx-a11y**](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)にもそれぞれ固有の機能があり、すべて併用できます。

### JSONの出力に対応していますか？

CLIで`--format`オプションを使うことでJSONの出力ができます。

```shell
markuplint "**/*.html" --format JSON
```

### E2Eテストに利用できますか？

もちろん利用できます。Markuplintはコンポーネント単位のチェック向けに設計されていますが、レンダリングされたHTMLのチェックも可能です。Markuplintはブラウザとは異なる**HTMLパーサ**を利用するので、HTMLを文字列で渡す必要があります。サーバが返却したHTML文字列か、ブラウザのDOMツリーを文字列に変換し、[MarkuplintのAPI](/docs/api)に渡すことでチェックできます。

### CLIでglob形式が期待通りに動きません

シェルの種類によってはglob形式の挙動が異なります。クォーテーションで囲うのが確実です。

```shell
# ❌ シェルによってはMarkuplint CLIに渡される前にフルパスに展開される
markuplint **/*.html

# ✅ 文字列として渡され、内部でglob形式として処理される
markuplint "**/*.html"
```

## バグを発見しました

ご利用ありがとうございます。まず、問題のある**[ルールを無効化](/docs/guides/ignoring-code#disable-by-selector)**することですぐに対処できます。部分的な問題であれば、セレクタを使って部分的に無効化し、他の箇所は保護されたまま利用を継続できます。

その後、[Issueを作成](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix)してお知らせください（日本語で構いません）。[X (Twitter)](https://x.com/markuplint)へのDMや「Markuplint」を含むツイートも拾いに行きます。

<!-- textlint-enable ja-technical-writing/no-exclamation-question-mark -->
