# コントリビュート

ご興味をもっていただきありがとうございます。

以下の事項でご貢献いただけます。

- [問題やバグを報告する](https://github.com/markuplint/markuplint/issues)
- W3C/WHATWGの仕様変更に伴う[スキーマ](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)の更新
- [新機能の要望・提案](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Features%3A+Proposal&template=feature.md&title=Supporting+for)
- APIやCLIの改善
- 仕様に沿ったリント設計の見直し
- ドキュメントや[ウェブサイト](https://markuplint.dev/)の改善
- 運用方法の再設計と改善
- [テスト](https://github.com/markuplint/markuplint/actions?query=workflow%3ATest)や[カバレッジ](https://coveralls.io/github/markuplint/markuplint?branch=main)の改善
- プラグインの開発

目的は、すべての開発者により良いマークアップができることと、多様なプロジェクトそれぞれに適合することです。そのため、みなさんの協力が必要です。あなたの思いが、多様性につながります。

## コードへの貢献

以下が必要です。

- Node.js v22以降
- NPM
- (任意) Volta

リポジトリをクローンした後、[Docker](https://github.com/markuplint/markuplint/blob/main/Dockerfile)からのインストールも可能です。

コードを書いた際は、次のことをお願いしています。

- `npm run lint`でコードの整形とリントチェックをしてください
- `npm run build`でビルドが正常に行われることを確認してください
- `npm run test`でテストが成功することを確認してください
- トピックブランチにプッシュし、プルリクエストを作成してください
- 以下のレビュアーをアサインします。
  - コード全般、コードの改善の場合: @yusukehirao
  - プラグイン開発の場合: @yusukehirao
  - ドキュメントおよびウェブサイト関連の場合: @yusukehirao, @kagankan
  - [dockerfile](https://github.com/markuplint/markuplint/blob/main/Dockerfile)に関すること: @conao3
  - [GitHub Actions](https://github.com/markuplint/markuplint/tree/main/.github/workflows)に関すること: @tyankatsu0105
