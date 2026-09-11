# vscode-markuplint

[Markuplint](https://markuplint.dev) for Visual Studio Code

## Extension Settings

- `markuplint.enable`: Control whether Markuplint is enabled for HTML files or not
- `markuplint.debug`: Enable debug mode
- `markuplint.defaultConfig`: It's the configuration specified if configuration files do not exist
- `markuplint.targetLanguages`: Specify the target languages
- `markuplint.workingDirectories`: Specify working directories for config resolution (see [Working Directories](#working-directories))
- `markuplint.hover.accessibility.enable`: Enable the feature that **popup Accessibility Object**
- `markuplint.hover.accessibility.ariaVersion`: Set `1.1`, `1.2`, or `1.3` WAI-ARIA version. If not set, uses markuplint's default version.

## Auto Fix

Markuplint provides Code Actions for auto-fixable problems.

### Quick Fix

When you hover over a diagnostic with a wavy underline, click the light bulb icon (or press `Ctrl+.` / `Cmd+.`) to see the available Quick Fixes.

### Fix on Save

To automatically fix all auto-fixable Markuplint problems when you save a file, add the following to your VS Code settings:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.markuplint": "explicit"
  }
}
```

| Value        | Behavior                                |
| ------------ | --------------------------------------- |
| `"explicit"` | Fix on manual save (`Cmd+S` / `Ctrl+S`) |
| `"always"`   | Fix on manual save and auto-save        |
| `"never"`    | Disable fix on save (default)           |

> **Note:** Only rules that have auto-fix support will be corrected. Rules without auto-fix will still report diagnostics but require manual changes.

## Working Directories

In monorepo setups where each sub-package has its own `.markuplintrc`, you may need to configure `markuplint.workingDirectories` so that markuplint resolves configuration files from the correct directory.

### Examples

**Explicit directories:**

```json
{
  "markuplint.workingDirectories": ["./client", "./server"]
}
```

**Glob pattern** (recommended for monorepos with many packages):

```json
{
  "markuplint.workingDirectories": [{ "pattern": "./packages/*/" }]
}
```

**Auto-detection** from `package.json` or `.markuplintrc`:

```json
{
  "markuplint.workingDirectories": [{ "mode": "auto" }]
}
```

**Use workspace folder** (falls back to workspace folder, but prefers a directory containing `.markuplintrc`):

```json
{
  "markuplint.workingDirectories": [{ "mode": "location" }]
}
```

If not set, markuplint uses the parent directory of each file as the working directory (default behavior).

## Release

[Changelog](https://marketplace.visualstudio.com/items/markuplint.vscode-markuplint/changelog)
