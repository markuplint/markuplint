# 型定義リファレンス

このドキュメントでは、`@markuplint/ml-spec` で使用される型定義と JSON スキーマについて説明します。

## 概要

`@markuplint/ml-spec` は2層の型システムを採用しています。

1. **手書きの型** (`src/types/index.ts`) -- 要素スペック、ARIA ロール、属性、ロール計算結果のために markuplint 全体で使用されるランタイムインターフェースを定義します。
2. **生成された型** (JSON スキーマから生成) -- `.schema.json` ファイルから `json-schema-to-typescript` を使用して自動生成される、スキーマ検証済みの構造体を定義します。これらのファイルには「DO NOT MODIFY」ヘッダーが付きます。

手書きの型は必要に応じて生成された型をインポート・拡張しており（例: `Attribute` は `AttributeJSON` を拡張）、スキーマ検証データ層とランタイムAPI層の間に明確な分離を実現しています。

## コア仕様型

これらの型は `src/types/index.ts` で定義されており、markuplint のスペックシステムの基盤を形成します。

### `MLMLSpec`

完全なマークアップ言語仕様を表すルート仕様型です。

```ts
interface MLMLSpec {
  readonly cites: Cites; // 参照URL（readonly string[]）
  readonly def: SpecDefs; // 内部定義（グローバル属性、ARIA、コンテンツモデル）
  readonly specs: readonly ElementSpec[]; // 要素仕様の配列
}
```

### `ExtendedSpec`

フレームワーク固有のパッケージがベース仕様を拡張またはカスタマイズするために使用される部分仕様型です。`@markuplint/vue-spec`、`@markuplint/react-spec` などのパッケージで使用されます。

```ts
type ExtendedSpec = {
  readonly cites?: Cites;
  readonly def?: Partial<SpecDefs>;
  readonly specs?: readonly ExtendedElementSpec[];
};
```

`ExtendedElementSpec` は `ElementSpec` の部分バージョンで、`name` のみが必須です。他のプロパティはすべてオプションのオーバーライドです。属性は `Partial<Attribute>` を使用して変更されたフィールドのみを指定できます:

```ts
type ExtendedElementSpec = Partial<Omit<ElementSpec, 'name' | 'attributes'>> & {
  readonly name: ElementSpec['name'];
  readonly attributes?: Readonly<Record<string, Partial<Attribute>>>;
};
```

### `SpecDefs`

マークアップ言語仕様内の内部定義データで、グローバル属性、ARIA ロール/プロパティ定義、コンテンツモデルカテゴリマッピングを含みます。

```ts
type SpecDefs = {
  readonly '#globalAttrs': {
    readonly [category: string]: Readonly<Record<string, Partial<Attribute>>>;
  };
  readonly '#aria': {
    readonly '1.3': ARIASpec;
    readonly '1.2': ARIASpec;
    readonly '1.1': ARIASpec;
  };
  readonly '#contentModels': {
    readonly [model in Category]?: readonly string[];
  };
};
```

- **`#globalAttrs`** -- カテゴリをキーとした属性定義。各カテゴリ（例: `#HTMLGlobalAttrs`、`#ARIAAttrs`）は部分的な属性定義のレコードにマッピングされます。
- **`#aria`** -- 各仕様バージョン（1.1、1.2、1.3）の ARIA ロール/プロパティ定義。各バージョンには `roles`、`graphicsRoles`、`props` 配列が含まれます。
- **`#contentModels`** -- コンテンツモデルカテゴリからセレクタ配列へのマッピング。`Category` 値（`#flow`、`#phrasing` など）を、そのカテゴリに属する要素にマッチする CSS セレクタの配列にマッピングします。

### `ElementSpec`

単一の HTML または SVG 要素のすべての側面を記述する完全な要素仕様です。

```ts
type ElementSpec = {
  readonly name: string; // タグ名
  readonly namespace?: NamespaceURI; // XML 名前空間 URI
  readonly cite: string; // 参照URL
  readonly description?: string; // 人間が読める説明

  // ステータスフラグ
  readonly experimental?: true; // 実験的技術
  readonly obsolete?: true | { readonly alt: string }; // 廃止（代替要素の指定可）
  readonly deprecated?: true; // 非推奨
  readonly nonStandard?: true; // 非標準

  // 構造プロパティ
  readonly categories: readonly Category[]; // 要素カテゴリ
  readonly contentModel: ReadonlyDeep<ContentModel>; // 許可されるコンテンツパターン
  readonly omission: ElementSpecOmission; // タグ省略ルール

  // 属性と ARIA
  readonly globalAttrs: ReadonlyDeep<GlobalAttributes>; // グローバル属性の選択
  readonly attributes: Readonly<Record<string, Attribute>>; // 要素固有の属性
  readonly aria: ReadonlyDeep<ARIA>; // WAI-ARIA ロールとプロパティのマッピング

  // テンプレートエンジンサポート
  readonly possibleToAddProperties?: true; // 任意のプロパティを許可（テンプレートエンジン用）
};
```

`ElementSpecOmission` は `false`（省略不可）またはオブジェクト（`startTag` と `endTag` フィールドでタグ省略の可否を示す）のいずれかです。

### `Attribute`

単一の HTML/SVG 属性を型、説明、ステータスフラグとともに記述します。

```ts
type Attribute = {
  readonly name: string;
  readonly type: ReadonlyDeep<AttributeType> | readonly ReadonlyDeep<AttributeType>[];
  readonly description?: string;
  readonly caseSensitive?: true;
  readonly experimental?: boolean;
  readonly obsolete?: true;
  readonly deprecated?: boolean;
  readonly nonStandard?: true;
} & ExtendableAttributeSpec;
```

`& ExtendableAttributeSpec` の交差型により、生成された `AttributeJSON` 型のフィールド（`type` を除く。`ReadonlyDeep` ラッパーでオーバーライドされるため）が追加されます: `defaultValue`、`required`、`requiredEither`、`noUse`、`condition`、`ineffective`、`animatable`。

## ARIA 型

### `ARIARole`

プロパティ、要件、名前付け制約がすべて解決された ARIA ロールです。

```ts
type ARIARole = {
  readonly name: string; // ロール名（例: 'button', 'navigation'）
  readonly isAbstract: boolean; // 抽象ロールかどうか
  readonly deprecated: boolean; // 非推奨のロールかどうか

  // コンテキスト要件
  readonly requiredContextRole: readonly string[]; // 必要な親ロール
  readonly requiredOwnedElements: readonly string[]; // 必要な子ロール

  // アクセシブル名の制約
  readonly accessibleNameRequired: boolean; // アクセシブル名が必須
  readonly accessibleNameFromAuthor: boolean; // 著者からの名前（aria-label 等）が可能
  readonly accessibleNameFromContent: boolean; // 要素コンテンツからの名前が可能
  readonly accessibleNameProhibited: boolean; // 名前が禁止

  // プロパティ
  readonly childrenPresentational: boolean; // 子要素がプレゼンテーショナル
  readonly ownedProperties: readonly ARIARoleOwnedProperties[];
  readonly prohibitedProperties: readonly string[];
};
```

### `ARIARoleInSchema`

生のスキーマデータで定義された ARIA ロールです。スキーマは部分的なロール情報のみを提供する場合があるため、`name` 以外のすべてのプロパティはオプションです。オプションの `description` と `generalization`（スーパークラスロール）フィールドも含みます。

```ts
type ARIARoleInSchema = Partial<
  ARIARole & {
    readonly description: string;
    readonly generalization: readonly string[];
  }
> & {
  readonly name: string;
};
```

### `ARIARoleOwnedProperties`

ARIA ロールが所有するプロパティを、継承・必須・非推奨の情報とともに記述します。

```ts
type ARIARoleOwnedProperties = {
  readonly name: string; // プロパティ名（例: 'aria-expanded'）
  readonly inherited?: true; // スーパークラスロールから継承
  readonly required?: true; // このロールで必須
  readonly deprecated?: true; // このロールで非推奨
};
```

### `ARIAProperty`

ARIA プロパティまたはステートを、その値の型、列挙値、等価な HTML 属性とともに記述します。

```ts
type ARIAProperty = {
  readonly name: string; // プロパティ名（例: 'aria-hidden'）
  readonly type: 'property' | 'state'; // プロパティかステートか
  readonly deprecated?: true;
  readonly isGlobal?: true; // グローバル ARIA 属性かどうか
  readonly value: ARIAAttributeValue; // 値の型
  readonly conditionalValue?: readonly {
    // ロール固有の値オーバーライド
    readonly role: readonly string[];
    readonly value: ARIAAttributeValue;
  }[];
  readonly enum: readonly string[]; // 許可されるトークン値
  readonly defaultValue?: string;
  readonly equivalentHtmlAttrs?: readonly EquivalentHtmlAttr[];
  readonly valueDescriptions?: Readonly<Record<string, string>>;
};
```

### `ARIAAttributeValue`

WAI-ARIA 仕様で定義された、ARIA 属性の値の型です。

```ts
type ARIAAttributeValue =
  | 'true/false'
  | 'tristate'
  | 'true/false/undefined'
  | 'ID reference'
  | 'ID reference list'
  | 'integer'
  | 'number'
  | 'string'
  | 'token'
  | 'token list'
  | 'URI';
```

### `ARIAVersion`

サポートされている ARIA 仕様バージョン文字列の共用体型で、`ariaVersions` タプル（`['1.1', '1.2', '1.3'] as const`）から導出されます。

```ts
type ARIAVersion = '1.1' | '1.2' | '1.3';
```

推奨デフォルトバージョンは `'1.2'` です（`src/utils/aria-version.ts` の `ARIA_RECOMMENDED_VERSION` として定義）。

### `ComputedRole`

要素の ARIA ロール計算の結果です。

```ts
type ComputedRole = {
  readonly el: Element;
  readonly role:
    | (ARIARole & {
        readonly superClassRoles: readonly ARIARoleInSchema[];
        readonly isImplicit?: boolean;
      })
    | null;
  readonly errorType?: RoleComputationError;
};
```

- **`el`** -- DOM 要素の参照。
- **`role`** -- 解決されたロール（スーパークラスチェーンと暗黙フラグ付き）、またはロールが適用されない場合は `null`。
- **`errorType`** -- ロール計算中の問題を示すオプションのエラーコード。

### `RoleComputationError`

ARIA ロール計算中に発生しうるエラーコードで、抽象ロール、無効なコンテキスト、プレゼンテーショナルの競合などの具体的な問題を示します。

| エラーコード                                        | 説明                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ABSTRACT`                                          | 抽象ロールが割り当てられた（抽象ロールは直接使用してはならない）             |
| `GLOBAL_PROP_MUST_NOT_BE_PRESENTATIONAL`            | グローバル ARIA プロパティを持つ要素はプレゼンテーショナルであってはならない |
| `IMPLICIT_ROLE_NAMESPACE_ERROR`                     | 暗黙のロールが要素の名前空間と一致しない                                     |
| `INTERACTIVE_ELEMENT_MUST_NOT_BE_PRESENTATIONAL`    | インタラクティブ要素はプレゼンテーショナルであってはならない                 |
| `INVALID_LANDMARK`                                  | ランドマークロールの使用が無効                                               |
| `INVALID_REQUIRED_CONTEXT_ROLE`                     | 必須コンテキストロールが満たされていない                                     |
| `NO_EXPLICIT`                                       | 明示的なロールが割り当てられていない                                         |
| `NO_OWNER`                                          | 必須コンテキストの所有元要素が見つからない                                   |
| `NO_PERMITTED`                                      | この要素でそのロールは許可されていない                                       |
| `REQUIRED_OWNED_ELEMENT_MUST_NOT_BE_PRESENTATIONAL` | 必須の所有子要素はプレゼンテーショナルであってはならない                     |
| `ROLE_NO_EXISTS`                                    | 指定されたロールが存在しない                                                 |

## ユーティリティ型

### `Matches`

要素が指定された CSS セレクタ文字列にマッチするかどうかをテストする関数型です。通常は `Element.prototype.matches` にバインドされます。

```ts
type Matches = (selector: string) => boolean;
```

### `Cites`

仕様全体で使用される参照 URL 配列型です。

```ts
type Cites = readonly string[];
```

### `EquivalentHtmlAttr`

ARIA プロパティと意味的に等価な HTML 属性を記述し、HTML 属性から ARIA ステート/プロパティへの自動マッピングを可能にします。

```ts
type EquivalentHtmlAttr = {
  readonly htmlAttrName: string;
  readonly isNotStrictEquivalent?: true;
  readonly value: string | null;
};
```

## 生成された型

これらの型は `json-schema-to-typescript` により JSON スキーマファイルから自動生成されます。「DO NOT MODIFY」ヘッダーが付いており、直接編集してはいけません。

### `aria.schema.json` から -- `src/types/aria.ts`

**`ARIA`** -- 条件とバージョンオーバーライドを含む要素レベルの ARIA 仕様です。

```ts
interface ARIA {
  implicitRole: ImplicitRole;
  permittedRoles: PermittedRoles;
  namingProhibited?: true;
  implicitProperties?: ImplicitProperties;
  properties?: PermittedARIAProperties;
  conditions?: {
    [selector: string]: {
      /* 条件ごとのオーバーライド */
    };
  };
  '1.3'?: {
    /* バージョン固有のオーバーライド */
  };
  '1.2'?: {
    /* バージョン固有のオーバーライド */
  };
  '1.1'?: {
    /* バージョン固有のオーバーライド */
  };
}
```

**`ImplicitRole`** -- 要素の暗黙的（デフォルト）ロールです。

```ts
type ImplicitRole = false | string; // false は「対応するロールなし」を意味する
```

**`PermittedRoles`** -- 要素で許可されるロールです。

```ts
type PermittedRoles =
  | boolean // true = 「任意のロール」、false = 「ロールなし」
  | (string | { name: string; deprecated?: true })[] // 特定のロールリスト
  | PermittedARIAAAMInfo; // AAM委任（core-aam または graphics-aam）
```

**`PermittedARIAProperties`** -- 要素の ARIA プロパティ制約です。

```ts
type PermittedARIAProperties =
  | false // 「ロールや aria-* 属性なし」
  | {
      global?: true; // グローバル ARIA プロパティを許可
      role?: true | string | [string, ...string[]]; // 許可されたロールに適用されるプロパティ
      only?: [
        /* 特定のプロパティ */
      ]; // 許可されるプロパティのホワイトリスト
      without?: [
        /* 重大度付きの禁止プロパティ */
      ]; // 重大度レベル付きのブラックリスト
    };
```

**`ImplicitProperties`** -- デフォルトの ARIA プロパティ値（`^aria-.+` にマッチするキー）。

```ts
interface ImplicitProperties {
  [ariaProperty: string]: string; // 例: { 'aria-checked': 'false' }
}
```

### `attributes.schema.json` から -- `src/types/attributes.ts`

**`AttributeType`** -- 認識されるすべての属性値型をカバーする大きな共用体型です。以下を含みます:

- **CSS プロパティ名**: `<'color'>`、`<'display'>`、`<'font-size'>` など（標準、ベンダープレフィックス付き、非推奨の CSS プロパティが数百個）
- **CSS 値型**: `<color>`、`<length>`、`<number>`、`<url>`、`<integer>` など
- **SVG 固有型**: `<svg-path>`、`<view-box>`、`<preserve-aspect-ratio>` など
- **markuplint カスタム型**: `DOMID`、`URL`、`BCP47`、`MIMEType`、`DateTime`、`AutoComplete`、`Int`、`Uint`、`Number`、`Boolean`、`Any`、`JSON`、`FunctionBody` など
- **構造化型バリアント**: `List`、`Enum`、`Number`、`Directive`

**`GlobalAttributes`** -- 要素に適用されるグローバル属性カテゴリを指定する属性カテゴリ選択です。

```ts
interface GlobalAttributes {
  '#HTMLGlobalAttrs'?: boolean;
  '#GlobalEventAttrs'?: boolean | string[];
  '#HTMLLinkAndFetchingAttrs'?: string[];
  '#HTMLEmbededAndMediaContentAttrs'?: string[];
  '#HTMLFormControlElementAttrs'?: string[];
  '#HTMLTableCellElementAttrs'?: string[];
  '#ARIAAttrs'?: boolean;
  '#SVGAnimationAdditionAttrs'?: string[];
  '#SVGAnimationAttributeTargetAttrs'?: string[];
  '#SVGAnimationEventAttrs'?: string[];
  '#SVGAnimationTargetElementAttrs'?: string[];
  '#SVGAnimationTimingAttrs'?: string[];
  '#SVGAnimationValueAttrs'?: string[];
  '#SVGConditionalProcessingAttrs'?: string[];
  '#SVGCoreAttrs'?: string[];
  '#SVGFilterPrimitiveAttrs'?: string[];
  '#SVGPresentationAttrs'?: string[];
  '#SVGTransferFunctionAttrs'?: string[];
  '#XLinkAttrs'?: string[];
}
```

**`AttributeJSON`** -- 型、条件、フラグを含む生の属性定義です。

```ts
interface AttributeJSON {
  type?: AttributeType | [AttributeType, ...AttributeType[]];
  defaultValue?: string;
  deprecated?: boolean;
  required?: boolean | AttributeCondition;
  requiredEither?: string[];
  noUse?: boolean;
  condition?: AttributeCondition;
  ineffective?: AttributeCondition;
  animatable?: boolean;
  experimental?: boolean;
}
```

**`List`** -- スペース区切りまたはカンマ区切りのトークンリスト用の構造化型です。

```ts
interface List {
  token: string | Enum; // トークン型または列挙定義
  separator: 'space' | 'comma'; // 区切り文字の型
  disallowToSurroundBySpaces?: boolean;
  allowEmpty?: boolean;
  ordered?: boolean;
  unique?: boolean;
  caseInsensitive?: boolean;
  number?: ('zeroOrMore' | 'oneOrMore') | { min: number; max: number };
}
```

**`Enum`** -- 列挙属性値です。

```ts
interface Enum {
  enum: [string, ...string[]]; // 少なくとも1つの値が必須
  disallowToSurroundBySpaces?: boolean;
  caseInsensitive?: boolean;
  invalidValueDefault?: string; // 値が無効な場合のデフォルト
  missingValueDefault?: string; // 属性が欠落している場合のデフォルト
  sameStates?: { [k: string]: unknown };
}
```

**`Number`** -- 数値属性の制約です。

```ts
interface Number {
  type: 'float' | 'integer';
  gt?: number; // より大きい
  gte?: number; // 以上
  lt?: number; // より小さい
  lte?: number; // 以下
  clampable?: boolean;
}
```

**`Directive`** -- ディレクティブとトークンの両方を含む複雑な属性のためのディレクティブベースの属性バリデーションです。

```ts
interface Directive {
  directive: [string, ...string[]]; // 少なくとも1つのディレクティブ
  token: AttributeType; // バリデーション対象のトークン型
  ref?: string; // 参照URL
}
```

### `content-models.schema.json` から -- `src/types/permitted-structures.ts`

**`PermittedContentPattern`** -- すべてのコンテンツモデルパターン型の共用体です。

```ts
type PermittedContentPattern =
  | PermittedContentRequire // 必須コンテンツ
  | PermittedContentOptional // オプションのコンテンツ
  | PermittedContentOneOrMore // 1回以上の出現
  | PermittedContentZeroOrMore // 0回以上の出現
  | PermittedContentChoice // コンテンツ選択肢の中から選択
  | PermittedContentTransparent; // トランスペアレントコンテンツモデル
```

各パターンバリアント（`PermittedContentTransparent` を除く）は `Model` またはネストされた `PermittedContentPattern[]` を受け取り、オプションの `max` カウントをサポートします。

**`ContentModel`** -- 要素の完全なコンテンツモデルです。

```ts
interface ContentModel {
  contents: PermittedContentPattern[] | boolean; // コンテンツパターンまたは真偽値
  descendantOf?: string; // コンテキスト制約
  conditional?: {
    // 条件依存のコンテンツ
    condition: string;
    contents: PermittedContentPattern[] | boolean;
  }[];
}
```

**`Category`** -- コンテンツモデルカテゴリ。13個の HTML カテゴリと19個の SVG カテゴリを含みます。

HTML カテゴリ:

- `#text`、`#phrasing`、`#flow`、`#interactive`、`#heading`
- `#sectioning`、`#metadata`、`#embedded`、`#palpable`、`#script-supporting`

SVG カテゴリ:

- `#SVGAnimation`、`#SVGBasicShapes`、`#SVGContainer`、`#SVGDescriptive`
- `#SVGFilterPrimitive`、`#SVGFont`、`#SVGGradient`、`#SVGGraphics`
- `#SVGGraphicsReferencing`、`#SVGLightSource`、`#SVGNeverRendered`
- `#SVGNone`、`#SVGPaintServer`、`#SVGRenderable`、`#SVGShape`
- `#SVGStructural`、`#SVGStructurallyExternal`、`#SVGTextContent`、`#SVGTextContentChild`

**`Model`** と **`ContentType`**:

```ts
type Model = ContentType | ContentType[];
type ContentType = string | Category;
```

## JSON スキーマファイル

以下の JSON スキーマファイルは `schemas/` ディレクトリにあります。

| スキーマファイル                | 行数 | 説明                                                                                                    |
| ------------------------------- | ---- | ------------------------------------------------------------------------------------------------------- |
| `element.schema.json`           | 11   | コンテンツモデル、属性、グローバル属性、ARIA への `$ref` ポインタを組み合わせるトップレベル要素スキーマ |
| `aria.schema.json`              | 291  | 暗黙のロール、許可されたロール、プロパティ、バージョンオーバーライドを含む ARIA ロール/プロパティ定義   |
| `attributes.schema.json`        | 190  | 属性型の共用体、属性 JSON 定義、グローバル属性カテゴリ選択、属性名パターン                              |
| `content-models.schema.json`    | 215  | コンテンツモデルパターン（require、optional、oneOrMore、zeroOrMore、choice、transparent）とカテゴリ定義 |
| `global-attributes.schema.json` | 787  | HTML と SVG のグローバル属性カテゴリ（`gen/global-attribute.data.ts` から自動生成）                     |

## スキーマ生成ワークフロー

スキーマ生成パイプラインは以下のように動作します:

1. **`gen/global-attribute.data.ts`** がグローバル属性カテゴリの信頼できるデータソースを定義し、カテゴリごとにすべての属性名をリストします。

2. **`gen/gen.ts`** がグローバル属性データを読み取り、2つのスキーマファイルを生成します:
   - `schemas/global-attributes.schema.json` -- カテゴリ定義とカテゴリごとの列挙を含む完全なグローバル属性スキーマ。
   - `schemas/attributes.schema.json` -- カテゴリ固有のプロパティセレクタを含む `GlobalAttributes` 型を含む属性スキーマ。

3. **`json-schema-to-typescript`** が各 `.schema.json` ファイルを対応する TypeScript ファイルに変換します:
   - `schemas/aria.schema.json` --> `src/types/aria.ts`
   - `schemas/attributes.schema.json` --> `src/types/attributes.ts`
   - `schemas/content-models.schema.json` --> `src/types/permitted-structures.ts`

4. 生成された TypeScript ファイルには「DO NOT MODIFY」ヘッダーが含まれます。生成された型を更新するには、ソース JSON スキーマ（または自動生成スキーマの場合は生成スクリプト）を変更してから、生成パイプラインを再実行します。
