# よくある質問

<!-- textlint-disable ja-technical-writing/no-exclamation-question-mark -->

## バグを発見しました。どうしたらよいですか？

ご利用ありがとうございます。まずは直近のマークアップでお困りのはずで、そこを解決したいでしょう。

**すぐにできることは、その[ルールを無効にすること](/docs/guides/ignoring-code#disable-by-selector)です。**部分的な問題であれば、セレクタを使いながら部分的に無効化することをおすすめします。そうすることで、他のバグが発生していない箇所は有効のままMarkuplint自体は利用を継続できます。

バグ報告はそのあとでも結構です。[Issueを作ってもらう](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix)のが確実ですが（日本語で構いません）、[作者のTwitter](https://twitter.com/cloud10designs)にDMを送ったり、「Markuplint」を含んでツイートしてもらえば拾いに行きます。ぜひバグの修正と機能改善にご協力ください。

## どう考えてもおかしくないのに警告がでます

バグの可能性が大いに高いですが、その前に確認していただきたいことがあります。

- 改行コードがCRLFになっている [#31](https://github.com/markuplint/markuplint/issues/31)
- [サポートが間に合っていない構文](/docs/guides/besides-html#supported-syntaxes)を使っている [#240](https://github.com/markuplint/markuplint/issues/240)

これらは既知の問題ですが、現在のところ対応が難航しています。申し訳ありませんが、部分的にルールの無効化をしてください。

上記以外の問題を発見したら、ご報告ください。

## 初心者ですが使っても大丈夫ですか？

大丈夫です。初学者こそ利用していただきたいです。しっかりと活用しようとするとNode.jsとコマンドの知識が必要になってしまいますが、VS Codeであれば[拡張機能](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint)をインストールするだけですぐに利用できます。また、単純に試したいだけであれば[プレイグラウンドサイト](https://playground.markuplint.dev)がありますので、お気軽にお試しください。

## Markuplintはアクセシビリティチェッカーとして機能しますか？

<!-- textlint-disable ja-technical-writing/no-doubled-joshi -->

一部機能しますが、すべてのチェックはできません。Markuplintがサポートするのは主に次のとおりです。

- HTMLやSVG、WAI-ARIAが仕様に準拠しているかどうか
- コード上で静的に発見しうるアクセシビリティの問題
- 設定したプロジェクトのルールに則っているかどうか

アクセシビリティはコードに関わること以外にも、情報設計に関わること、ビジュアルデザインに関わること、そもそもコンテンツや戦略の段階から問題が生まれることがあります。ただ少なくともコードに関わることだけはMarkuplintが担うことで、その他の問題解決に取り組む余裕を生み出すことを期待しています。

<!-- textlint-enable ja-technical-writing/no-doubled-joshi -->

## HTMLHintやeslint-plugin-jsx-a11yと何が違うの？

できることのいくつかは共通するものがありますが、Markuplintとの大きな差としては次のことが挙げられます。

- [要素の親子関係（構造）の適合性チェック](/docs/rules/permitted-contents)ができること
- 強力な[セレクタ](/docs/guides/selectors)機能によって細かくルールを制御できること
- HTMLやJSX以外の構文を多くサポートしていること

もちろん[**HTMLHint**](https://htmlhint.com/)、[**eslint-plugin-jsx-a11y**](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)、それぞれにしかできないこともあり、どれも導入して併用できますので、適宜プロジェクトにあった利用をしていただけると嬉しいです。

## 警告が出たコードをどうやって修正したらいいのかわかりません

<!-- textlint-disable ja-technical-writing/no-doubled-joshi, ja-technical-writing/ja-no-weak-phrase -->

これはとても難しい質問です。問題の内容によりケースバイケースなので一概に答えられませんが、基本的には**必要と言われた要素や属性は追加し、不要と言われた要素や属性は削除します**。それによってスタイルの修正を余儀なくされた場合、スタイルを修正してください。スタイルをどの要素に対して施すかは基本的にルールはありません。しかしHTMLの要素や属性にはルールがあります。どちらを優先するのか、ということになりますが、準拠することで得られるメリットはアクセシビリティや互換性など多くあります。修正にかかるコストやメンテナンス管理の問題などプロジェクトにあるかもしれませんが、プロダクトの品質を優先するのであれば積極的に取り組んでいきたいところです。

また、元も子もない話ですが、修正案を考えるにあたって**HTMLの知識は必須**です。Markuplintから警告を受けた要素や属性から少しずつ調べていって身につけていくと良いでしょう。[HTML Standard](https://momdo.github.io/html/)本体の仕様を調べることが一番良いですが、MDNのドキュメント「[HTML の学習: ガイドとチュートリアル](https://developer.mozilla.org/ja/docs/Learn/HTML)」など読みやすいものから調べていってもよいかもしれません。

<!-- textlint-enable ja-technical-writing/no-doubled-joshi, ja-technical-writing/ja-no-weak-phrase -->

## OGPで怒られます

Open GraphプロトコルはHTMLとは異なる仕様のため、標準で対応していません。[対応できる設定例](/docs/rules/invalid-attr#the-open-graph-protocol)がありますので参考にしてください。

## `invalid-attr`ルールで怒られます

[`invalid-attr`](/docs/rules/invalid-attr)はHTMLの仕様に存在しない属性が要素に指定されていると警告します。HTML以外の構文や、フレームワークを利用していると頻繁に遭遇するかもしれません。`invalid-attr`には[`attrs`](/docs/rules/invalid-attr#setting-attrs-option)オプションがあり、そこに許可したい属性を追加することで警告をなくすことができます。

また、ReactとVueに関してはスペックプラグインを導入することにより、各構文で独自に使用される属性には警告がでないように定義されています。（参考: [なぜスペックプラグインが必要なのですか](/docs/guides/besides-html#why-need-the-spec-plugins)）

もしも構文やフレームワーク（[Next.js](https://nextjs.org/)や[Nuxt](https://nuxtjs.org/)など）のスペックプラグインがあると便利になるのであれば[リクエスト](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Features%3A+Proposal&template=feature.md&title=Supporting+for)してください。

## `character-reference`ルールで怒られます

<!-- textlint-disable ja-technical-writing/ja-no-weak-phrase -->

[`character-reference`](/docs/rules/character-reference)は文字を厳密に評価しません。文字が有効な場所にありエスケープする必要がない場合でも、変更を促されてしまいます。いくつかの構文やテンプレートエンジンでは不都合が起こるかもしれません。その場合、このルール自体を無効化するか、もしくは[Issueで状況を報告](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Bug&template=bug_repot.md&title=Fix)していただければ対処できるかもしれません。

<!-- textlint-enable ja-technical-writing/ja-no-weak-phrase -->

## `require-accessible-name`ルールで怒られます

[アクセシブルな名前](https://momdo.github.io/wai-aria-1.2/#dfn-accessible-name)はほとんどの場合`aria-label`を使ってしまえば解決できますが、最初の解決手段としてそれを使用するのは**避けましょう**。
[アクセシブルな名前の計算](https://momdo.github.io/accname-1.1/)は複雑で、要素によって得られる場所が異なるので、次の表を参考にしてください。

| 要素       | 主な名前が得られる場所 | `aria-label`の使用     |
| ---------- | ---------------------- | ---------------------- |
| `a`        | コンテンツ             | 可能（**推奨しない**） |
| `img`      | `alt`属性              | 可能（**推奨しない**） |
| `h1`〜`h6` | コンテンツ             | 可能（**推奨しない**） |
| `button`   | コンテンツ             | 可能（**推奨しない**） |
| `table`    | `caption`要素          | 可能（**推奨しない**） |
| `input`    | `label`要素            | 可能（**推奨しない**） |
| `select`   | `label`要素            | 可能（**推奨しない**） |
| `textarea` | `label`要素            | 可能（**推奨しない**） |

## CLIでglob形式が期待通りに動きません

シェルの種類によってはglob形式の挙動が異なります。MarkuplintのCLIにglob形式を渡したい場合、クォーテーションで囲うのが確実です。

```shell
# シェルによって異なり、Markuplint CLIには可変長の文字列としてファイルのフルパスが渡されます
markuplint **/*.html

# Markuplint CLIに文字列として渡されるので確実に内部でglob形式として処理されます
markuplint "**/*.html"
```

## Reactで使えますか？

もちろん使えます。React（JSX）の他に、Vue、Svelte、Astro、Pug、PHPなどに対応しています。利用にはMarkuplintが公式に提供しているプラグインを併用する必要があります。詳しくは[HTML以外につかう](/docs/guides/besides-html)を御覧ください。

## Angularに対応していないようですが？

公式には用意できておりませんが、有志の方が[`markuplint-angular-parser`](https://www.npmjs.com/package/markuplint-angular-parser)を作ってくださっています。こちらをご利用ください。

## 対応しているエディタはVS Codeだけですか？

ごめんなさい、公式に対応しているのは**VS Codeだけ**です。かつてはAtomも対応していましたが、現在はVS Codeのみです。[VS Code拡張のソースコード](https://github.com/markuplint/vscode-markuplint)は公開しているので、有志による開発がなされることに期待しています。

## JSONの出力に対応していますか？

CLIで`--format`オプションを使うことでJSONの出力ができます。

```shell
markuplint "**/*.html" --format JSON
```

## E2Eテストに利用できますか？

もちろん利用できます。Markuplintはコンポーネント単位のチェックができるように設計されていますが、レンダリングされたHTMLまるごとのチェックも可能です。Markuplintはブラウザとは異なる**HTMLパーサ**を利用するのでHTMLを文字列で渡す必要があります。E2Eテストでの活用方法としては、サーバが返却したHTML文字列か、ブラウザが公開したDOMツリーを文字列に変換し、[MarkuplintのAPI](/docs/api)に渡すことでチェックできるでしょう。

<!-- textlint-enable ja-technical-writing/no-exclamation-question-mark -->
