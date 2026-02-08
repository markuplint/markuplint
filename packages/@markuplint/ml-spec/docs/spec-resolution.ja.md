# 仕様解決パイプライン

このドキュメントでは、`@markuplint/ml-spec` がベースとなるHTML仕様とフレームワーク固有の拡張仕様をマージし、要素・属性のルックアップを解決し、ARIAバージョニングを処理し、パイプライン全体でキャッシュを管理する仕組みについて解説します。

## 目次

- [概要](#概要)
- [スキーママージ (`schemaToSpec`)](#スキーママージ-schematospec)
- [要素仕様のルックアップ](#要素仕様のルックアップ)
- [名前空間の解決](#名前空間の解決)
- [属性仕様の解決](#属性仕様の解決)
- [ARIAバージョンの解決](#ariaバージョンの解決)
- [配列マージ (`mergeArray`)](#配列マージ-mergearray)
- [キャッシュ戦略](#キャッシュ戦略)

---

## 概要

仕様解決パイプラインは、複数のソースから単一の統合仕様を構築するメカニズムです。
全体のフローは以下のとおりです：

```
@markuplint/html-spec (MLMLSpec)
      +
フレームワーク仕様 (ExtendedSpec[])    例: vue-spec, react-spec, svelte-spec
      |
      v
  schemaToSpec()
      |
      v
  マージ済み MLMLSpec  (すべての下流アルゴリズムで使用)
```

ユーザーの設定ファイルでは、1つ以上のフレームワークプラグインを参照できます。
各プラグインは `ExtendedSpec` を提供し、ベースのHTML仕様にフレームワーク固有の
要素、属性、ARIA定義、コンテンツモデルカテゴリを追加・上書き・拡張します。

要素ルックアップ、属性解決、ARIAクエリ、コンテンツモデルチェックなど、
すべての下流APIは `schemaToSpec` が返すマージ済み `MLMLSpec` を操作します。
この設計により、解決ロジックは特定の定義がベース仕様からのものか
拡張仕様からのものかを意識する必要がありません。

### 主要な型

| 型             | 役割                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| `MLMLSpec`     | 完全な仕様オブジェクト: cites, defs (globalAttrs, aria, contentModels), 要素ごとのspecs |
| `ExtendedSpec` | `MLMLSpec` の任意のセクションに寄与できる部分的なオーバーレイ                           |
| `ElementSpec`  | 要素ごとの定義: name, categories, attributes, globalAttrs, aria, contentModel           |
| `Attribute`    | 単一属性の定義: name, type, description, その他のメタデータ                             |

---

## スキーママージ (`schemaToSpec`)

**ファイル:** `src/utils/schema-to-spec.ts`

```ts
function schemaToSpec(schemas: readonly [MLMLSpec, ...ExtendedSpec[]]): MLMLSpec;
```

この関数は、最初の要素が常にベースの `MLMLSpec`（通常は `@markuplint/html-spec`）
であり、残りの要素がゼロ個以上の `ExtendedSpec` オブジェクトであるタプルを受け取ります。
マージ結果を含む新しい `MLMLSpec` を返します。

### ステップごとのマージプロセス

マージは反復的に実行されます。各 `ExtendedSpec` が順番に累積結果に畳み込まれます：

```ts
const [main, ...extendedSpecs] = schemas;
const result = { ...main };

for (const extendedSpec of extendedSpecs) {
  // 各セクションをマージ...
}
```

#### 1. 引用元 (Cites)

拡張仕様が `cites` を提供する場合、既存の配列に連結されます：

```ts
result.cites = [...result.cites, ...extendedSpec.cites];
```

単純な配列結合であり、重複排除は行われません。
引用元は仕様間で一意であることが想定されているためです。

#### 2. グローバル属性

拡張仕様の `#extends` プロパティがベース仕様の `#HTMLGlobalAttrs` カテゴリに
スプレッドされます：

```ts
gAttrs['#HTMLGlobalAttrs'] = {
  ...def['#globalAttrs']?.['#HTMLGlobalAttrs'],
  ...extendedSpec.def['#globalAttrs']?.['#extends'],
};
```

これにより、フレームワークは新しいグローバル属性（例: Vueの `v-if`, `v-for`）を
導入でき、そのカテゴリを参照するすべての要素の `#HTMLGlobalAttrs` の一部となります。
同じキーの既存属性は拡張仕様によって上書きされます。

#### 3. ARIA定義

各ARIAバージョン（`1.1`, `1.2`, `1.3`）について、`roles`, `props`,
`graphicsRoles` の3つの配列が `mergeArray` を使ってマージされます：

```ts
def['#aria'] = {
  '1.1': {
    roles: mergeArray(def['#aria']['1.1'].roles, extendedSpec.def['#aria']['1.1'].roles),
    props: mergeArray(def['#aria']['1.1'].props, extendedSpec.def['#aria']['1.1'].props),
    graphicsRoles: mergeArray(def['#aria']['1.1'].graphicsRoles, extendedSpec.def['#aria']['1.1'].graphicsRoles),
  },
  // 1.2 と 1.3 も同様
};
```

`mergeArray` は名前ベースのマッチングを使用します（[配列マージ](#配列マージ-mergearray)を参照）。
そのため、拡張仕様は新しいARIAロール/プロパティの追加と
既存定義の上書きの両方が可能です。

#### 4. コンテンツモデル

すべてのコンテンツモデルカテゴリが和集合されます。
ベースと拡張の両方にまたがる各カテゴリキーについて、
セレクタ配列が連結されます：

```ts
const keys = new Set([...Object.keys(def['#contentModels']), ...Object.keys(extendedSpec.def['#contentModels'])]);

for (const modelName of keys) {
  models[modelName] = [...(mainModel ?? []), ...(exModel ?? [])];
}
```

これにより、フレームワークは既存のカテゴリにカスタム要素を追加したり
（例: `#phrasing` に `<router-link>` を追加）、
まったく新しいカテゴリを定義したりできます。

#### 5. 要素仕様

要素は名前で照合されます（大文字小文字を区別しない比較）。
ベース仕様の各要素について：

- 一致する拡張要素が存在しない場合、ベース要素はそのまま保持されます。
- 一致が見つかった場合、仕様がマージされます：

```ts
specs.push({
  ...elSpec, // ベース要素のスプレッド
  ...exSpec, // 拡張仕様がトップレベルプロパティを上書き
  globalAttrs: {
    ...elSpec.globalAttrs,
    ...exSpec?.globalAttrs,
  },
  attributes: mergeAttrSpec(elSpec.attributes, exSpec?.attributes),
  categories: mergeArray(elSpec.categories, exSpec?.categories),
});
```

ヘルパー関数 `mergeAttrSpec` はすべての属性キーを和集合し、
各キーについて拡張属性をベース属性にスプレッドすることで、
個々の属性定義の部分的な上書きを可能にします。

---

## 要素仕様のルックアップ

**ファイル:** `src/utils/get-spec.ts`, `src/utils/get-spec-by-tag-name.ts`

要素ルックアップAPIは2つのレイヤーで構成されています：

### DOMラッパー: `getSpec`

```ts
function getSpec<K extends keyof ElementSpec>(
  el: Element,
  specs: readonly Pick<ElementSpec, 'name' | K>[],
): Pick<ElementSpec, 'name' | K> | null;
```

DOM `Element` から `el.localName` と `el.namespaceURI` を抽出し、
`getSpecByTagName` に委譲する便利なラッパーです。

### コアルックアップ: `getSpecByTagName`

```ts
function getSpecByTagName<K extends keyof ElementSpec>(
  specs: readonly Pick<ElementSpec, 'name' | K>[],
  localName: string,
  namespace: string | null,
): Pick<ElementSpec, 'name' | K> | null;
```

処理手順：

1. `resolveNamespace(localName, namespace)` を呼び出し、名前空間修飾名を取得
   （例: SVGのcircle要素なら `"svg:circle"`、HTMLのdivなら `"div"`）。
2. モジュールレベルの `Map<string, ElementSpec | null>` キャッシュを
   修飾名をキーとしてチェック。
3. キャッシュにない場合、`specs` を線形検索して `name` で照合。
4. 結果（ミス時の `null` を含む）をキャッシュに格納して返却。

ジェネリックパラメータ `K` により、呼び出し元は `ElementSpec` の特定のキーのみを
要求でき、型システムを通じて運ばれるデータ量を削減しつつ型安全性を維持します。

---

## 名前空間の解決

**ファイル:** `src/utils/resolve-namespace.ts`, `src/utils/get-ns.ts`

### `resolveNamespace`

```ts
function resolveNamespace(
  name: string,
  namespaceURI: string | null = 'http://www.w3.org/1999/xhtml',
): NamespacedElementName;
```

要素名とオプションの名前空間URIを完全に正規化された形式に解決します：

```ts
type NamespacedElementName = {
  localNameWithNS: string; // 例: "svg:circle" または "div"
  localName: string; // 例: "circle" または "div"
  namespace: Namespace; // "html" | "svg" | "mml" | "xlink"
  namespaceURI: NamespaceURI; // 完全なURI文字列
};
```

解決ロジック：

1. **コロンで分割** -- `name` にコロンが含まれる場合（例: `"svg:circle"`）、
   プレフィックスは明示的な名前空間ヒントとして、サフィックスはローカル名として扱われます。
2. **名前空間の決定** -- 名前空間は明示的なプレフィックスまたは
   `getNS(namespaceURI)` の呼び出しから解決されます。
   どちらも認識された名前空間を返さない場合、デフォルトで `'html'` になります。
3. **修飾名の構築** -- HTML名前空間の場合、修飾名はローカル名のみ（プレフィックスなし）。
   その他の名前空間の場合、短縮形が前置されます：
   `"svg:circle"`, `"mml:math"` など。
4. **キャッシュ** -- 結果は `Map<string, NamespacedElementName>` に
   `name + namespaceURI` の連結をキーとしてキャッシュされます。

### 名前空間URIマッピング

| 名前空間URI                          | 短縮形  |
| ------------------------------------ | ------- |
| `http://www.w3.org/1999/xhtml`       | `html`  |
| `http://www.w3.org/2000/svg`         | `svg`   |
| `http://www.w3.org/1998/Math/MathML` | `mml`   |
| `http://www.w3.org/1999/xlink`       | `xlink` |

### `getNS` ヘルパー

```ts
function getNS(namespaceURI: string | null): Namespace;
```

名前空間URI文字列をその短縮形にマップする単純なswitch-case関数です。
認識されないURI（`null` を含む）は `'html'` を返します。

---

## 属性仕様の解決

**ファイル:** `src/utils/get-attr-specs.ts`（DOMラッパー）、`src/utils/get-attr-specs-spec.ts`（コア）

### DOMラッパー: `getAttrSpecs`（`get-attr-specs.ts`）

```ts
function getAttrSpecs(el: Element, schema: MLMLSpec): readonly Attribute[] | null;
```

`el.localName` と `el.namespaceURI` を抽出し、コア関数に委譲します。

### コア関数: `getAttrSpecs`（`get-attr-specs-spec.ts`）

```ts
function getAttrSpecs(localName: string, namespace: NamespaceURI | null, schema: MLMLSpec): readonly Attribute[] | null;
```

解決手順：

1. **スキーマ無効化** -- `schema` 参照が変更されたかどうかを `WeakSet<MLMLSpec>` で
   チェックします。変更があった場合、属性キャッシュ全体がクリアされます。
   これにより、仕様が再マージされた際の正確性が保証されます。

2. **キャッシュチェック** -- `Map<string, readonly Attribute[] | null>` で
   名前空間修飾名をルックアップします。

3. **要素仕様の検索** -- `schema.specs` から名前空間修飾名で一致する要素を検索。
   見つからない場合は `null` を返し（キャッシュにも格納）ます。

4. **グローバル属性の収集** -- 要素の `globalAttrs` 選択マップを反復処理します。
   各カテゴリについて：
   - `false` -- そのカテゴリを完全にスキップ
   - `true` -- そのグローバルカテゴリのすべての属性を含める
   - `string[]` -- そのカテゴリから指定された名前の属性のみを含める

   ```ts
   for (const catName in elSpec.globalAttrs) {
     const catAttrs = elSpec.globalAttrs[catName];
     if (catAttrs === false) continue;
     if (typeof catAttrs === 'boolean') {
       attrs = { ...attrs, ...global };
     }
     if (Array.isArray(catAttrs)) {
       for (const selectedName of catAttrs) {
         attrs[selectedName] = { ...attrs[selectedName], ...global[selectedName] };
       }
     }
   }
   ```

5. **要素固有属性のマージ** -- 要素自身の `attributes` が収集されたグローバルの上に
   スプレッドされるため、要素固有の定義がグローバルを上書きします：

   ```ts
   attrs[attrName] = {
     description: '',
     ...current, // グローバルから
     ...attr, // 要素仕様から
   };
   ```

6. **ソート済み配列への変換** -- 属性マップが `Attribute[]` に変換され、
   各エントリに `type: 'Any'` のデフォルト値が設定された後、
   `nameCompare` を使って大文字小文字を区別せずにアルファベット順でソートされます。

7. **キャッシュと返却** -- ソート済み配列がキャッシュに格納され、返却されます。

### `nameCompare`

```ts
function nameCompare(a: HasName | string, b: HasName | string): number;
```

大文字小文字を区別しないソートコンパレータ。`name` プロパティを抽出（または文字列を
そのまま使用）し、大文字に変換して標準的な辞書式比較を行います。

---

## ARIAバージョンの解決

**ファイル:** `src/utils/resolve-version.ts`, `src/utils/aria-version.ts`,
`src/utils/validate-aria-version.ts`, `src/algorithm/aria/get-aria.ts`

### `resolveVersion`

```ts
function resolveVersion(aria: ReadonlyDeep<ARIA>, version: ARIAVersion): Omit<ReadonlyDeep<ARIA>, ARIAVersion>;
```

マルチバージョンの `ARIA` オブジェクトからバージョン固有のARIA定義を抽出します。
各プロパティについて、バージョン固有の値が存在すればそれが使用され、
なければベース（バージョン非依存）の値が適用されます：

```ts
const implicitRole = aria[version]?.implicitRole ?? aria.implicitRole;
const permittedRoles = aria[version]?.permittedRoles ?? aria.permittedRoles;
// ...以下同様
```

特殊ケース: バージョン `'1.1'` の `namingProhibited` は常にベース値を使用します。
名前付け禁止の概念はARIA 1.2まで正式化されなかったためです：

```ts
const namingProhibited =
  version === '1.1' ? aria.namingProhibited : (aria[version]?.namingProhibited ?? aria.namingProhibited);
```

返されるオブジェクトには解決済みのプロパティのみが含まれ、
バージョンキー（`'1.1'`, `'1.2'`, `'1.3'`）は型から除去されます。

### `getARIA`

```ts
function getARIA(
  specs: MLMLSpec,
  localName: string,
  namespace: string | null,
  version: ARIAVersion,
  matches: Matches,
): Omit<ReadonlyDeep<ARIA>, ARIAVersion | 'conditions'> | null;
```

高レベルのARIAリゾルバです。以下の処理を行います：

1. `getVersionResolvedARIA`（内部関数）を呼び出し、バージョン解決済みの仕様を取得。
2. 仕様に `conditions`（CSSセレクタをキーとするオーバーライド）がある場合、
   それらを反復処理し、最初にマッチした条件のプロパティを適用します。
   これにより、`<input type="checkbox">` が `<input type="text">` とは
   異なるARIAセマンティクスを持つようなケースを処理します。
3. `permittedRoles` を最適化 -- リスト内に `"presentation"` と `"none"` の
   両方がある場合、両方の同義語が存在することを保証します
   （WAI-ARIA 1.2の注記に準拠）。

内部関数 `getVersionResolvedARIA` は `Map<string, ARIA | null>` に
`localName + namespace + version` をキーとして結果をキャッシュします。

### バージョン定数とバリデーション

```ts
// aria-version.ts
const ariaVersions = ['1.1', '1.2', '1.3'] as const;
const ARIA_RECOMMENDED_VERSION = '1.2';

// validate-aria-version.ts
function validateAriaVersion(version: string): version is ARIAVersion;
```

`validateAriaVersion` は文字列が `ariaVersions` タプルのメンバーであるかどうかを
チェックする型ガードです。設定の境界で、ユーザー提供のバージョン文字列が
型付きパイプラインに入る前にバリデーションするために使用されます。

---

## 配列マージ (`mergeArray`)

**ファイル:** `src/utils/merge-array.ts`

```ts
function mergeArray<T extends NamedDefinition>(a: readonly T[], b: readonly T[] | null | undefined): readonly T[];
```

ここで `NamedDefinition = string | { readonly name: string }` です。

これは仕様マージパイプライン全体で使用されるコアマージユーティリティです。
単純な結合ではなく、**名前ベースのマージ**を行います：

### アルゴリズム

1. `b` が `null` または `undefined` の場合、`a` をそのまま返す。
2. `a` のコピーから開始。
3. `b` の各アイテムについて：
   - `getName()` を使って名前を抽出（大文字小文字を区別せず、トリム済み）。
   - 結果の中で同じ名前のアイテムを検索。
   - **一致なし:** 拡張アイテムを末尾に追加。
   - **一致あり（両方が文字列）:** 文字列は追加データのない単純な識別子なので、
     ベースアイテムが保持されます（spliceで削除後、代替をpushせずにループが
     継続され、実質的にベースバージョンが維持されます）。
   - **一致あり（ベースが文字列、拡張がオブジェクト）:** 拡張のより詳細な
     オブジェクト形式で置換。
   - **一致あり（両方がオブジェクト）:** 2つのオブジェクトをスプレッドマージし、
     拡張のプロパティが優先：
     ```ts
     const exItem = { ...aItem, ...bItem };
     ```

### `getName` ヘルパー

```ts
function getName(def: NamedDefinition): string {
  const result = typeof def === 'string' ? def : def.name;
  return result.toLowerCase().trim();
}
```

名前は比較前に小文字化およびトリムされ、大文字小文字を区別しない照合が保証されます。

---

## キャッシュ戦略

このパッケージは冗長な計算を回避するために複数のキャッシュレイヤーを使用しています。
仕様は通常一度ロードされ、リント実行のライフタイム全体で再利用されるため、
これらのキャッシュは大幅なパフォーマンス向上をもたらします。

### キャッシュ一覧

| #   | 場所                                          | キャッシュ型                                                      | キー                                            | 値                                             | 無効化                                            |
| --- | --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| 1   | `getSpecByTagName`                            | `Map<string, any>`                                                | 名前空間修飾名（例: `"svg:circle"`）            | `ElementSpec \| null`                          | モジュールライフタイム（クリアなし）              |
| 2   | `getVersionResolvedARIA`（`get-aria.ts` 内）  | `Map<string, ARIA \| null>`                                       | `localName + namespace + version`（文字列連結） | バージョン解決済みARIA仕様またはnull           | モジュールライフタイム（クリアなし）              |
| 3   | `getContentModel`                             | `Map<Specs, Map<Element, ...>>`                                   | 外側: specs配列参照; 内側: DOM Element参照      | `PermittedContentPattern[] \| boolean \| null` | specs参照ごとに外側マップエントリを作成           |
| 4   | `contentModelCategoryToTagNames`              | `Map<Category, ReadonlyArray<string>>`                            | カテゴリ文字列（例: `"#flow"`）                 | フリーズされたソート済みタグ名配列             | モジュールライフタイム（クリアなし）              |
| 5   | `resolveNamespace`                            | `Map<string, NamespacedElementName>`                              | `name + namespaceURI`（文字列連結）             | 解決済み名前空間オブジェクト                   | モジュールライフタイム（クリアなし）              |
| 6   | `getAttrSpecs`（`get-attr-specs-spec.ts` 内） | `Map<string, readonly Attribute[] \| null>` + `WeakSet<MLMLSpec>` | 名前空間修飾名                                  | ソート済み属性配列またはnull                   | スキーマ参照変更時にクリア（WeakSetチェック経由） |

### キャッシュの特性

**明示的な退去なし:** ほとんどのキャッシュはモジュールレベルの `Map` インスタンスで、
プロセスのライフタイム全体にわたって永続化されます。これが適切である理由：

- 仕様データはマージ後に不変。
- ユニークな要素/属性の数は限定的（HTMLには約120要素）。
- リント実行は通常1つの設定を処理。

**スキーマ対応の無効化:** `getAttrSpecs` キャッシュ（項目6）は例外です。
`WeakSet<MLMLSpec>` を使用してスキーマ参照の変更を検出します。
新しいスキーマが渡された場合（例: 異なるフレームワーク仕様を持つ異なる
ファイルパターンの実行時）、処理前に `cacheMap` 全体がクリアされます：

```ts
if (!schemaCache.has(schema)) {
  cacheMap.clear();
}
```

**ネストされたキャッシュ:** `getContentModel` キャッシュ（項目3）は
2段階の `Map<Specs, Map<Element, ...>>` 構造を使用します。
外側のマップはspecs配列参照でキーが付けられるため、
異なる仕様設定は別々のキャッシュを維持します。
内側のマップはDOM Element参照でキーが付けられるため、
同じ仕様コンテキスト内で同じ要素を再クエリするとO(1)になります。

**決定論的キー:** 項目1、2、5のキャッシュは文字列連結をキーに使用します。
`resolveNamespace` は同じ入力に対して決定論的な出力を生成し、
仕様データは変更されないため、これらの連結キーは安定しています。

### キャッシュを含むデータフロー

```
schemaToSpec()  -->  マージ済み MLMLSpec (キャッシュなし; 起動時に1回呼び出し)
                          |
              +-----------+-----------+
              |           |           |
     getSpecByTagName  getAttrSpecs  getARIA
       (キャッシュ 1)   (キャッシュ 6)  (キャッシュ 2)
              |                       |
       resolveNamespace         resolveVersion
        (キャッシュ 5)          (純粋関数; キャッシュなし)
                                      |
                               getContentModel
                                (キャッシュ 3)
                                      |
                        contentModelCategoryToTagNames
                                (キャッシュ 4)
```

各矢印は関数呼び出しを表します。キャッシュは各レイヤーで繰り返しの呼び出しを
インターセプトするため、同じ要素に対する2回目のルックアップでは
コールチェーンのすべてのレベルでキャッシュ済みの結果にヒットします。
