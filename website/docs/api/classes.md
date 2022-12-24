# Classes

## `MLEngine`

### Constructor

```js
new MLEngine(file, options);
```

#### `file`

- `MLFile`
- Required

Use the `toMLFile` static method, create a `MLFile` instance.

```js
const file = await MLEngine.toMLFile('./path/to/page.html');
```

#### `options`

- `Object`
- Optional

| Property            | Type       | Optional | Description                                                            |
| ------------------- | ---------- | -------- | ---------------------------------------------------------------------- |
| `configFile`        | `string`   | ✓        | The file path of the configuration.                                    |
| `config`            | `Object`   | ✓        | The configuration.                                                     |
| `defaultConfig`     | `Object`   | ✓        | The Fallback configuration when failing to auto search.                |
| `noSearchConfig`    | `boolean`  | ✓        | No search a configure file automatically.                              |
| `locale`            | `string`   | ✓        | Locale.                                                                |
| `fix`               | `boolean`  | ✓        | Returns the fixed code after the execution.                            |
| `ignoreExt`         | `boolean`  | ✓        | Evaluates files even though the type of extension.                     |
| `rules`             | `Object[]` | ✓        | Additional custom rules.                                               |
| `importPresetRules` | `boolean`  | ✓        | No imports preset rules.                                               |
| `debug`             | `boolean`  | ✓        | Outputs logs for debugging.                                            |
| `watch`             | `boolean`  | ✓        | Fires `lint` event when the target file or the config file is updated. |

### Methods

#### `exec`

```js
const result = await engine.exec();

if (result) {
  const { violations, filePath, sourceCode, fixedCode } = result;
}
```

##### Parameter

None

##### Return

- `Promise<Object|null>`

| Property     | Type       | Description                                                                                |
| ------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `violations` | `Object[]` | The array of results.                                                                      |
| `filePath`   | `string`   | The absolute path of the target file                                                       |
| `sourceCode` | `string`   | The original source code.                                                                  |
| `fixedCode`  | `string`   | The Fixed source code. It is the same as the original code if didn't specify `fix` option. |
