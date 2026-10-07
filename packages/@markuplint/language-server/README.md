# @markuplint/language-server

[Language Server Protocol](https://microsoft.github.io/language-server-protocol/) server for [markuplint](https://markuplint.dev). It reports markuplint violations as diagnostics, offers quick fixes, and shows the accessibility properties of an element on hover. It is the server behind the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=markuplint.markuplint-vscode), and runs with any other LSP client: AI coding agents such as Claude Code and OpenCode, Neovim, Helix, and so on.

## Install

```sh
npm install --save-dev @markuplint/language-server
```

The server starts with `markuplint-language-server --stdio`. It needs no settings: it lints with the project's markuplint config file (`.markuplintrc` and its siblings), falls back to `markuplint:recommended` as the CLI does, and loads the markuplint installed in the project. The markuplint that ships with this package is used when the project has none.

Which files the server receives is up to the client, so list the extensions you want linted in its configuration.

## Claude Code

Claude Code registers language servers through plugins. Create a directory with a `.lsp.json`, and load it with `claude --plugin-dir <directory>`:

```json
{
  "markuplint": {
    "command": "npx",
    "args": ["markuplint-language-server", "--stdio"],
    "extensionToLanguage": {
      ".html": "html"
    }
  }
}
```

After Claude edits a matching file, the violations appear as diagnostics in its context. Claude Code uses one server per extension, so leave out extensions that another language server already handles (such as `.tsx`).

## OpenCode

Add the server to `opencode.json`. OpenCode passes only diagnostics of the `error` severity to the model, so `severityMap` re-reports markuplint's warnings as errors:

```json
{
  "lsp": {
    "markuplint": {
      "command": ["npx", "markuplint-language-server", "--stdio"],
      "extensions": [".html"],
      "initialization": {
        "severityMap": { "warning": "error" }
      }
    }
  }
}
```

## Neovim

Neovim 0.11 or later:

```lua
vim.lsp.config['markuplint'] = {
	cmd = { 'npx', 'markuplint-language-server', '--stdio' },
	filetypes = { 'html' },
	root_markers = { '.markuplintrc', 'package.json', '.git' },
}
vim.lsp.enable('markuplint')
```

## Options

A client passes them as `initializationOptions`. All of them are optional.

| Option               | Description                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `severityMap`        | Re-reports diagnostics with another severity: `{ "warning": "error" }`. Keys are `error`, `warning`, `info`; values add `hint`.          |
| `workingDirectories` | Working directories for monorepos, as in the VS Code extension's `markuplint.workingDirectories` setting.                                |
| `workspaceFolders`   | Absolute paths of the workspace folders. The `workspaceFolders` and `rootUri` of the `initialize` request are used when this is not set. |
| `gitPath`            | Path to the `git` binary that bulk suppression uses.                                                                                     |
| `langConfigs`        | Per-language settings. When set, only the languages listed with `enable: true` are linted.                                               |
| `extendedProtocol`   | For the VS Code extension: sends the `markuplint/*` messages instead of `window/logMessage` and `window/showMessage`.                    |
