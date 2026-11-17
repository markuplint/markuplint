---
sidebar_position: 6
title: 'スペックデータと型'
---

# スペックデータと型

v5で`@deprecated`（`Removed in v6.`）にした型とフィールドを削除しました。互換のために残していたいくつかも、あわせて削除しています。`@markuplint/html-spec`のデータは、仕様書の文章も、要素のコンテンツカテゴリーも持ちません。

下の`NodeRule`のフィールドを除けば、設定への変更ではありません。スペックのデータ構造は`@markuplint/ml-spec`の公開APIではありませんが、`@markuplint/ml-spec`や`@markuplint/html-spec`を通じてスペックを読むコード、拡張スペック（`ExtendedSpec`。たとえば`*-spec`パッケージ）の作者、ここに挙げたAPIを呼ぶコードに影響します。

スペックから削除したキーを、JSONやJavaScriptのオブジェクトに書いたままにしても、スペックを読むときには無視されます。実行時には何も失敗せず、型の付いた場所ではTypeScriptが報告します。

## スペックのフィールド {#spec-fields}

| v5                                                                                              | v6                                                          |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `MLMLSpec`・`ExtendedSpec`・`@markuplint/html-spec`のデフォルトエクスポートの`cites`、`Cites`型 | 削除。`schemaToSpec()`は拡張の`cites`を読まなくなりました。 |
| `ElementSpec`の`categories`                                                                     | 削除。ルールが使うカテゴリーは`def['#contentModels']`です。 |
| `ElementSpec`の`omission`                                                                       | 削除。                                                      |
| `ElementSpec`・`Attribute`・`ARIARoleInSchema`の`description`                                   | 削除。                                                      |
| `ARIAProperty`の`valueDescriptions`                                                             | 削除。                                                      |

- `getAttrSpecs()`は、属性に`description: ''`を返さなくなりました。
- `@markuplint/vue-spec`と`@markuplint/alpine-spec`は、属性の`description`を設定しなくなりました。
- `schemaToSpec()`は、要素の`categories`をマージしなくなりました。拡張の`categories`は、要素スペックのほかのキーと同じく、ベースのスペックのものを置き換えます。
- `@markuplint/html-spec`のジェネレーターは、W3C文書の文章を今も読みます。専用の型で保持し、`index.json`に書く前に捨てます。

## ARIAロールのフィールド {#aria-roles}

ARIA 1.2がロールの2つのフィールドに使っていた名前を削除し、ARIA 1.3の名前だけにしました。`index.json`もこの名前で書かれています。

| v5                      | v6                                |
| ----------------------- | --------------------------------- |
| `requiredContextRole`   | `requiredAccessibilityParentRole` |
| `requiredOwnedElements` | `allowedAccessibilityChildRoles`  |

`@markuplint/ml-spec`の`ARIARole`と、拡張スペックの`def['#aria']`のロールが対象です。

```json title="v5"
{ "name": "x-item", "requiredContextRole": ["list"], "requiredOwnedElements": ["listitem"] }
```

```json title="v6"
{ "name": "x-item", "requiredAccessibilityParentRole": ["list"], "allowedAccessibilityChildRoles": ["listitem"] }
```

古い名前を書いたままの拡張スペックは、その名前を読まれません。そのロールは、必須の親も、必須の所有要素も持たないものとして扱われ、`require-parent-role`と`require-owned-elements`は検査しません。

## 属性の型名 {#attribute-types}

| v5                             | v6                             |
| ------------------------------ | ------------------------------ |
| `BrowsingContextName`          | `NavigableTargetName`          |
| `BrowsingContextNameOrKeyword` | `NavigableTargetNameOrKeyword` |

HTML標準が、valid browsing context nameをvalid navigable target nameに改名しました。検査の内容は同じです。削除した名前は`@markuplint/types`の型スキーマから消えており、型ではない名前に対して値は検査されません。どんな値にもマッチします。

## カスタムCSS構文 {#custom-css-syntax}

`@markuplint/types`の`CustomCssSyntax`から、`syntax.ebnf`と`syntax.properties`を削除しました。

- `ebnf`を持つ定義は、実装されていなかったため、すべての値にマッチしていました。今は`syntax.def`で値を検査します。
- `properties`はプロパティを登録し、`apply`は`<'my-prop'>`の形で指していました。`syntax.def`に型として定義し、`<my-prop>`の形で適用してください。

```ts title="v5"
{
	ref: 'https://example.com/',
	syntax: {
		apply: "<'my-prop'>",
		def: {},
		properties: { 'my-prop': 'a | b' },
	},
}
```

```ts title="v6"
{
	ref: 'https://example.com/',
	syntax: {
		apply: '<my-prop>',
		def: { 'my-prop': 'a | b' },
	},
}
```

## 設定の型 {#config-types}

`NodeRule`（`@markuplint/ml-config`と、`markuplint/testing-tool`の`NodeRule`）の`categories`・`roles`・`obsolete`を削除しました。どれも読まれていませんでした。`nodeRules`のエントリーは`selector`か`regexSelector`でマッチします。エントリーから削除し、`selector`か`regexSelector`を使ってください。

これらを書いたままの設定は、実行時にはエラーになりません。これまでと同じくキーは無視されます。`config.schema.json`には載っていないので、設定を検証するエディターは報告します。

## ルールのARIAバージョン {#aria-version}

WAI-ARIAを検査するルール（v4の`wai-aria`ルールの後継。[ARIA](/docs/migration/v4-to-v5/aria)を参照）は、`options.version`を読まなくなりました。v5のガイドはこのオプションを廃止としており、ルールのスキーマにも載っていませんが、設定に書かれていれば、ルールは読んでいました。

```json title="v5"
{ "rules": { "no-redundant-role": { "value": true, "options": { "version": "1.1" } } } }
```

```json title="v6"
{ "ruleCommonSettings": { "ariaVersion": "1.1" }, "rules": { "no-redundant-role": true } }
```

`options.version`を書いたままの設定は、エラーになりません。オプションは無視され、ルールは`ruleCommonSettings.ariaVersion`（なければ推奨のバージョン）で検査します。

## `@markuplint/file-resolver` {#file-resolver}

- `ConfigProvider#recursiveLoad()`から、`depth`引数を受け取るオーバーロードを削除しました。引数は無視されていました。引数を削除してください。
- `hasResolvableCollision()`を削除しました。代わりはありません。解決するものがあるかどうかは、`disambiguatePretendersForFile()`が自分で判断します。
