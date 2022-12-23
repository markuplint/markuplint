# クラス

## `MLEngine`

### コンストラクタ

```js
new MLEngine(file, options);
```

#### `file`

- `MLFile`
- 必須

静的`toMLFile`メソッドで、`MLFile`のインスタンスを生成します。

```js
const file = await MLEngine.toMLFile('./path/to/page.html');
```

#### `options`

- `Object`
- 省略可

| プロパティ          | 型         | 省略可 | 解説                                                                                 |
| ------------------- | ---------- | ------ | ------------------------------------------------------------------------------------ |
| `configFile`        | `string`   | ✓      | 設定ファイルパス                                                                     |
| `config`            | `Object`   | ✓      | 設定                                                                                 |
| `defaultConfig`     | `Object`   | ✓      | 自動検索に失敗したときのフォールバックされる設定                                     |
| `noSearchConfig`    | `boolean`  | ✓      | 設定ファイルを自動で検索しない                                                       |
| `locale`            | `string`   | ✓      | ロケール（言語設定）                                                                 |
| `fix`               | `boolean`  | ✓      | 実行後、修正コードを返します                                                         |
| `ignoreExt`         | `boolean`  | ✓      | 拡張子の種類に関係なく、ファイルを評価します                                         |
| `rules`             | `Object[]` | ✓      | 追加するカスタムルール                                                               |
| `importPresetRules` | `boolean`  | ✓      | ビルトインルールを自動に読み込みません                                               |
| `debug`             | `boolean`  | ✓      | デバッグモード                                                                       |
| `watch`             | `boolean`  | ✓      | ターゲットファイルまたは設定ファイルが更新されたときに、`lint`イベントを発生させます |

### メソッド

#### `exec`

```js
const result = await engine.exec();

if (result) {
  const { violations, filePath, sourceCode, fixedCode } = result;
}
```

##### 引数

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

なし

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

##### 戻り値

- `Promise<Object|null>`

| Property     | Type       | Description                                                                                 |
| ------------ | ---------- | ------------------------------------------------------------------------------------------- |
| `violations` | `Object[]` | 結果の配列                                                                                  |
| `filePath`   | `string`   | 検証したファイル名（絶対パス）                                                              |
| `sourceCode` | `string`   | 元のソースコード                                                                            |
| `fixedCode`  | `string`   | 修正されたソースコード（`fix`オプションを指定しなかった場合は、元のコードと同じになります） |
