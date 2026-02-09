# メンテナンスガイド

## コマンド

| コマンド                                       | 説明                   |
| ---------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/svelte-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/svelte-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/svelte-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/svelte-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル                | カバレッジ                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| `index.spec.ts`               | SvelteParser 統合テスト（要素、制御フロー、ディレクティブ）        |
| `svelte-parser/index.spec.ts` | svelte/compiler 統合テスト（AST 構造の検証）                       |
| `sveltekit-parser.spec.ts`    | SvelteKit テンプレートパーサーテスト（プレースホルダータグの処理） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/svelte-parser';

const doc = parser.parse('<div class="foo">{name}</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

## レシピ

### 1. 新しいディレクティブの追加

1. `src/parser.ts` を読み、`visitAttr()` メソッドを特定
2. ディレクティブのプレフィックス（例: `newdir:`）を特定し、必要なフラグを決定:
   - `isDirective: true` — 純粋なディレクティブの場合（`on:`、`use:`、`transition:` のように）
   - `isDirective: undefined` + `potentialName` — 属性にマッピングするディレクティブの場合（`bind:value` のように）
   - `isDuplicatable: true` — 複数インスタンスが許可される場合（`class:` のように）
3. 既存のディレクティブチェックの後に新しい `if (baseName === 'newdir')` ブランチを追加
4. ビルド: `yarn build --scope @markuplint/svelte-parser`
5. `src/index.spec.ts` にテストケースを追加
6. テスト: `yarn test --scope @markuplint/svelte-parser`

### 2. 新しい制御フローブロックの追加

1. `src/parser.ts` を読み、`nodeize()` 内の既存ブロックケースを確認
2. ブロックの構造を決定:
   - **シンプルなブロック**（open + close のみ、`{#key}...{/key}` のように）→ `parse-block.ts` の `parseBlock()` を使用
   - **複雑なブロック**（中間タグあり、`{#each}...{:else}...{/each}` のように）→ プライベートメソッドを実装
3. `nodeize()` の `switch (originNode.type)` ブロックに新しい `case 'NewBlock':` を追加
4. シンプルなブロックの場合、`KeyBlock` パターンに従う:
   ```ts
   case 'NewBlock': {
       const { openToken, closeToken } = parseBlock(this, { ...token, depth, parentNode }, originNode);
       return [
           this.visitPsBlock({ ...openToken, depth, parentNode, nodeName: 'new', isFragment: true }, originNode.fragment.nodes)[0],
           this.visitPsBlock({ ...closeToken, depth, parentNode, nodeName: '/new', isFragment: true })[0],
       ];
   }
   ```
5. 複雑なブロックの場合、`#parseEachBlock()` または `#parseAwaitBlock()` パターンに従う
6. Svelte コンパイラが新しい AST タイプを追加した場合、`src/svelte-parser/index.ts` の `SvelteBlock` ユニオン型を更新
7. 新しいブロックのフラグメントフィールド名が異なる場合、`src/parse-block.ts` の `parseBlock()` を更新
8. ビルドとテスト: `yarn build --scope @markuplint/svelte-parser && yarn test --scope @markuplint/svelte-parser`

### 3. SvelteKit プレースホルダーの更新

1. `src/sveltekit-parser.ts` を読む
2. `ignoreTags` 配列のエントリを追加または変更:
   ```ts
   ignoreTags: [
       {
           type: 'sveltekit-placeholder',
           start: '%sveltekit.',
           end: '%',
       },
       // 新しいプレースホルダーパターンをここに追加
   ],
   ```
3. ビルド: `yarn build --scope @markuplint/svelte-parser`
4. `src/sveltekit-parser.spec.ts` にテストケースを追加
5. テスト: `yarn test --scope @markuplint/svelte-parser`

### 4. specificBindDirective セットの変更

1. `src/parser.ts` を読み、`specificBindDirective` プロパティを特定
2. このセットは、どの `bind:` サブ名を真のディレクティブとして扱うかを決定（現在は `group` と `this`）
3. 新しいエントリを追加するには、コンストラクタを変更:
   ```ts
   readonly specificBindDirective: ReadonlySet<string> = new Set(['group', 'this', 'newname']);
   ```
4. ビルドとテスト: `yarn build --scope @markuplint/svelte-parser && yarn test --scope @markuplint/svelte-parser`

### 5. svelte/compiler 統合の更新

1. `src/svelte-parser/index.ts` を読む
2. `svelteParse()` 関数は `svelte/compiler` の `parse()` を `{ modern: true }` でラップ
3. Svelte 依存を更新する際:
   - Svelte コンパイラの新しい AST ノードタイプを確認
   - 必要に応じて `SvelteNode` 型ユニオンを更新
   - 新しいブロックタイプが追加された場合は `SvelteBlock` 型ユニオンを更新
   - 新しいノードタイプに対して `nodeize()` に新しいケースを追加
4. ビルドとテスト: `yarn build --scope @markuplint/svelte-parser && yarn test --scope @markuplint/svelte-parser`

## トラブルシューティング

### 制御フローブロックが誤った数の psblock ノードを生成する

**症状:** 制御フローブロック（例: `{#if}...{:else}...{/if}`）が期待より多い、または少ない psblock ノードを生成する。

**原因:** トークン境界の計算が不正、または中間タグが正しく検出されていない。

**解決策:**

1. トークン検出に使用される正規表現パターンを確認:
   - `#traverseIfBlock()` — `alternate` フィールドのトラバースを確認
   - `#parseEachBlock()` — `{\s*:else\s*}$` 正規表現を確認
   - `#parseAwaitBlock()` — `{\s*:then[\s|}]` と `{\s*:catch[\s|}]` 正規表現を確認
   - `parseBlock()` — `{\s*\/[a-z]+\s*}$` 正規表現を確認
2. `originBlockNode` をログ出力して Svelte AST ノード構造を検証 — フィールド名は Svelte バージョン間で変更される可能性あり

### 属性ディレクティブが認識されない

**症状:** Svelte ディレクティブ（例: `bind:value`）が正しい `isDirective` / `potentialName` フラグでパースされない。

**原因:** ディレクティブプレフィックスが `visitAttr()` で処理されていない、または `specificBindDirective` セットにエントリが不足している。

**解決策:**

1. `visitAttr()` の `split(':')` ロジックを確認 — ディレクティブプレフィックスが処理されていることを確認
2. `specificBindDirective` を確認 — このセット内のエントリは真のディレクティブとして扱われ、セット外のエントリは `potentialName` の動作になる
3. 特定のディレクティブ構文でテストケースを追加

### SvelteKit プレースホルダーがマスクされない

**症状:** `%sveltekit.head%` のような SvelteKit プレースホルダーが psblock ではなく raw テキストとして表示される。

**原因:** `SvelteKitTemplateParser` の `ignoreTags` パターンがプレースホルダー構文にマッチしていない。

**解決策:**

1. `src/sveltekit-parser.ts` を確認 — `start` と `end` パターンがプレースホルダーにマッチすることを検証
2. `start` フィールドはプレースホルダーの先頭にマッチ（例: `%sveltekit.`）
3. `end` フィールドはプレースホルダーの末尾にマッチ（例: `%`）

### Script タグが psblock に変換されない

**症状:** Svelte テンプレート内の `<script>` タグが Script psblock ではなくテキストノードとして表示される。

**原因:** `visitText()` オーバーライドが `<script>` パターンを検出していない。

**解決策:**

1. `src/parser.ts` の `visitText()` を確認 — 正規表現 `/^<script[\s>]/i` が script タグにマッチする必要がある
2. `<script>` の処理を `ignoreTags` に移動しないこと — `lang` 属性を保持する必要がある（issue #2505 参照）

### Svelte コンパイラエラーが正しくラップされない

**症状:** Svelte の構文エラーがソース位置なしの不親切なエラーメッセージを生成する。

**原因:** `parseError()` メソッドが Svelte コンパイラエラーの形状にマッチしていない。

**解決策:**

1. `src/parser.ts` の `parseError()` を確認 — `start`、`end`、`frame` プロパティを持つエラーを期待している
2. Svelte コンパイラのエラー形状が変更された場合、プロパティチェックを適宜更新
