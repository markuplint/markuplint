# MLDOM リファレンス

`@markuplint/ml-core` の MLDOM サブシステムの詳細リファレンスです。

## ドキュメント

| ドキュメント                                       | 説明                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [概要](./ml-dom/overview.ja.md)                    | 概要、クラス階層、MLToken                                                                  |
| [MLNode](./ml-dom/node.ja.md)                      | MLNode 抽象基底、MLParentNode                                                              |
| [MLDocument](./ml-dom/document.ja.md)              | ドキュメントルートノード                                                                   |
| [MLElement](./ml-dom/element.ja.md)                | 要素ノード（セレクタマッチング、属性、省略要素）                                           |
| [Pretender システム](./ml-dom/pretender.ja.md)     | コンポーネントリンティング用の仮想要素マッピング（初期化、プロパティ委譲、アクセシブル名） |
| [MLAttr](./ml-dom/attr.ja.md)                      | 属性ノード（トークン分解、スプレッド属性）                                                 |
| [MLBlock](./ml-dom/block.ja.md)                    | プリプロセッサブロックノード（透過性、条件分岐子ノード、コンテンツモデル検証）             |
| [ルールマッピング](./ml-dom/rule-mapping.ja.md)    | ルールがノードに適用される仕組み（3層処理、詳細度解決）                                    |
| [その他のノード型](./ml-dom/others.ja.md)          | MLCharacterData, MLText, MLComment, MLDocumentType, MLElementCloseTag, MLDocumentFragment  |
| [ヘルパーとユーティリティ](./ml-dom/helpers.ja.md) | ヘルパー関数、補助クラス、型ユーティリティ                                                 |
