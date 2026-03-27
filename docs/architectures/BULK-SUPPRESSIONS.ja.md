# Bulk Suppressions（一括抑制） — 設計ドキュメント

markuplint の Bulk Suppressions 機能の設計思想、アルゴリズム、アーキテクチャについて説明します。

**ステータス:** 実験的機能（Experimental）
**トラッキング Issue:** [#3503](https://github.com/markuplint/markuplint/issues/3503)（Phase 1）、[#3509](https://github.com/markuplint/markuplint/issues/3509)（Phase 2）

## 解決する課題

既存プロジェクトに新しい lint ルールを導入する際、大量の既存違反が報告されます。これにより以下のジレンマが生じます：

- **`error` で有効化** → 既存違反で CI が即座に失敗する
- **`warning` で有効化** → 誰も修正しない。新規違反も見逃される
- **全部直してから有効化** → 膨大な作業量。他の開発がブロックされる
- **ルールを無効化** → 何の意味もない

Bulk Suppressions は第四の選択肢を提供します：**既存違反を記録して抑制し、新規コードにのみルールを厳密に適用する。**

## 設計哲学

### 精度 > 安定性

scope セレクタが壊れた場合（DOM リファクタリングで `id` が変わった等）：

- scope がどのサブツリーにもマッチしなくなる → scope 内の違反数 = 0
- カウント比較: 0 ≤ 抑制カウント → **抑制が維持される**
- エントリは「未使用」となり `--prune-suppressions` がクリーンアップを推奨する

**偽陰性は発生しない。** 壊れた scope によって新規違反が隠されることは絶対にない。最悪のケースでも、古い違反が想定より少し長く抑制され続けるだけであり、`--prune-suppressions` や `--suppress` の再実行で修正できる。

一方、タグ名のみのセレクタ（例: `div > div > div`）を使うと**偽陽性のリスク**がある：ファイル内の別の `div > div > div` が新規違反を抑制カウントに吸収し、リグレッションを隠してしまう。これが本当の危険。

**結論:** id/class/attr を使った精密なセレクタを採用する。リファクタリングで壊れうることを受け入れる。壊れた場合の影響は安全側に倒れる。

### カウントベースのマッチング（ESLint 互換）

コアアルゴリズムは意図的にシンプル：

```
各 (ファイル, ルール) ペアについて:
  現在の違反数 ≤ 抑制カウント → 全て抑制
  現在の違反数 > 抑制カウント → 全件報告（差分だけではない）
```

**なぜ超過時に全件報告？** 違反が増えた場合、調査のために全体像が必要。「新規2件」だけでは文脈がなくデバッグが困難。

**なぜ個別の違反を追跡しない？** 行番号は編集のたびにずれる。違反メッセージのハッシュも脆弱。カウントベースのマッチングは、コード整形、並べ替え、軽微なリファクタリングに対して堅牢。

## アーキテクチャ

### 2段階のフェーズ

```
Phase 1（カウントのみ）:  ファイル + ルール → カウント
Phase 2（scope 付き）:    ファイル + ルール → カウント + scope セレクタ
```

Phase 2 は追加的 — `scope` のない既存の suppressions ファイルはファイルレベル抑制として引き続き動作する。

### Suppressions ファイルフォーマット

```json
{
  "src/index.html": {
    "attr-duplication": { "count": 3, "scope": "#main-nav > ul" },
    "case-sensitive-attr-name": { "count": 1 }
  }
}
```

- **キー:** 相対ファイルパス（POSIX セパレータ、suppressions ファイルからの相対位置）
- **`count`:** 抑制する error レベル違反の数
- **`scope`**（任意）: LCA サブツリーを示す CSS セレクタ

### モジュール構成

```
packages/markuplint/src/suppressions/
├── types.ts                 — SuppressionEntry, SuppressionsData
├── compute-scope.ts         — LCA 計算、セレクタ生成
├── generate-suppressions.ts — 違反から抑制データを構築
├── apply-suppressions.ts    — 抑制データで違反をフィルタリング
├── merge-suppressions.ts    — 既存 + 新規の抑制をマージ（max カウント）
├── prune-suppressions.ts    — 不要なエントリを削除
├── suppressions-file.ts     — JSON ファイルの読み書き、パスユーティリティ
└── index.ts                 — バレルエクスポート
```

### データフロー

```
┌─────────────────────────────────────────────────┐
│  --suppress モード                              │
│                                                 │
│  violations ──→ generateSuppressions()          │
│  + nodeLists     ├─ computeScopeForViolations() │
│                  │   ├─ findNodeAtPosition()    │
│                  │   ├─ computeLCA()            │
│                  │   └─ generateUniqueSelector()│
│                  └─→ SuppressionsData           │
│                      ↓                          │
│                  mergeSuppressions()             │
│                      ↓                          │
│                  writeSuppressionsFile()         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  通常 lint モード                               │
│                                                 │
│  violations ──→ applySuppressions()             │
│  + suppressions   ├─ getScopedErrorInfo()       │
│  + nodeLists      │   └─ isViolationInScope()   │
│                   │       └─ matchesScopeSelector│
│                   └─→ フィルタ済み violations    │
└─────────────────────────────────────────────────┘
```

## Selector Scope（LCA アルゴリズム）

### コンセプト

あるルールのファイル内の全違反が特定のサブツリー内にある場合、**最小共通祖先（LCA: Lowest Common Ancestor）**を計算し、その CSS セレクタを生成する。これにより抑制スコープが絞られ、ファイル内の他の部分で発生した新規違反を検出できる。

### アルゴリズム

1. **逆引き:** 各違反の DOM ノードを `line:col` → `nodeList` の線形探索で特定
2. **祖先チェーン:** 各ノードの祖先チェーン（parent → grandparent → ... → root）を収集
3. **LCA:** チェーンをルートから走査し、全チェーンに共通する最深ノードを特定
4. **フォールバック:** LCA が `body` または `html` の場合、`undefined` を返す（ファイルレベル抑制）
5. **セレクタ生成:** LCA ノードの最小一意セレクタを生成

### セレクタ生成戦略

優先順位（一意性が高い順）：

| 戦略 | 例 | 使用条件 |
|---|---|---|
| `#id` | `#main-nav` | ノードに `id` 属性がある |
| `tag.classA.classB` | `nav.global-nav.sticky` | ノードにクラスがある（全クラスを含む） |
| `tag[attr="value"]` | `section[role="navigation"]`、`input[type="checkbox"]` | 識別属性がある（任意要素の `role`、`<input>` の `type`） |
| nth-of-type 付き祖先パス | `main > section:nth-of-type(2)` | id・クラス・識別属性がない場合、同名兄弟に `:nth-of-type()` を付加 |
| id/class/attr で停止する祖先パス | `#main > ul` | 祖先に id・クラス・識別属性がある |

### Scope マッチング（Apply 側）

抑制適用時、scope セレクタを違反ノードに対してマッチング：

1. 違反ノードを `line:col` で特定
2. 祖先を遡りながら各ノードを scope セレクタと照合
3. セレクタセグメントを右（最も具体的）から左（祖先方向）に `>` コンビネータでマッチ
4. 対応セレクタ形式: `#id`、`tag.classA.classB`、`tag:nth-of-type(n)`、`tag`

## 先行事例

| ツール | 言語 | マッチング方式 | 備考 |
|---|---|---|---|
| **ESLint** | JS/TS | ファイル + ルール + カウント | 公式、カウントベース |
| **@rushstack/eslint-bulk** | JS/TS | ファイル + ルール + scopeId（AST 階層） | TikTok 開発、`.ClassName.methodName` |
| **PHPStan** | PHP | メッセージ正規表現 + カウント + パス | ベースラインパターンの先駆者 |
| **detekt** | Kotlin | RuleID + Finding シグネチャ | コード構造ベース |
| **RuboCop** | Ruby | ルール単位のファイル除外リスト | 粒度が粗い |
| **Stylelint** | CSS | ファイル + ルール + カウント | ESLint 互換 |
| **Ruff** | Python | `# noqa` のインライン自動挿入 | ソースコードを直接変更 |

markuplint のアプローチは、ESLint のカウントベースのシンプルさと @rushstack のスコープ認識精度を組み合わせ、CSS セレクタ（HTML リンターにとって自然な選択）を AST スコープ識別子の代わりに使用する。

## CLI オプション

| フラグ | 説明 |
|---|---|
| `--suppress` | 現在の全 error 違反を suppressions ファイルに記録 |
| `--suppress-rule <rule>` | 指定ルールの違反のみ記録 |
| `--prune-suppressions` | 不要なエントリ（修正済み違反）を suppressions ファイルから削除 |
| `--suppressions-location <path>` | suppressions ファイルのカスタムパス（デフォルト: `markuplint-suppressions.json`） |

## 既知の制限事項

- **`--prune-suppressions` は scope フィルタリングを行わない:** ファイルレベルの全違反をカウントする。scope を考慮した正確なカウントには `--suppress` を再実行する。
- **パフォーマンス:** `findNodeAtPosition` は違反ごとに O(n) の線形探索を行う。一般的なファイルサイズでは許容範囲だが、非常に大きなドキュメントではポジションインデックスによる最適化が考えられる。
- **テンプレート言語:** Vue/Svelte のプリプロセッサブロックは `parentNode` を通じて透過的に処理されるが、生成される scope セレクタはパース後の DOM 構造を反映するため、ソーステンプレートとは異なる場合がある。

## 将来の検討事項

- **`--prune-suppressions` での scope 対応:** prune 時にも `nodeLists` を渡してスコープ認識カウント比較を行う
- **Scope 検証:** scope セレクタがドキュメント内のどのノードにもマッチしない場合に警告する
- **API サポート:** `MLEngine` API を通じてプログラマティックに suppressions を利用可能にする（現在は生成が CLI のみ）
- **ファイルフォーマットのバージョニング:** 破壊的なフォーマット変更が必要になった場合、`{ version: N, ... }` エンベロープを導入する
