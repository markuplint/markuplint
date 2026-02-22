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

[Changelog](https://marketplace.visualstudio.com/items/yusukehirao.vscode-markuplint/changelog)
