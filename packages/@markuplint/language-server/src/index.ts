/**
 * Language Server Protocol server for markuplint.
 *
 * Run `markuplint-language-server --stdio` to start it. Any LSP client can use it: a client
 * needs no markuplint-specific configuration, because the server lints with the project's own
 * config file (`.markuplintrc` and its siblings), falls back to `markuplint:recommended` like the
 * CLI, and loads the markuplint installed in the project, falling back to the one that installs
 * with this package.
 *
 * The VS Code extension is a client of this package. What it sends beyond the LSP is in
 * {@link InitializationOptions}, and the custom messages are in `@markuplint/language-server/protocol`.
 *
 * Contracts that the clients impose, and that the code keeps because of them:
 *
 * - **stdout carries the protocol only.** Claude Code treats any other output on stdout as a
 *   crash of the server. `--stdio` makes `vscode-languageserver` redirect `console.*` away from
 *   stdout, and `debug` writes to stderr; do not write to `process.stdout` directly.
 * - **The `markuplint/*` messages are opt-in (`extendedProtocol`).** A client that has not
 *   registered `markuplint/ready` answers the request with `MethodNotFound`, and the others
 *   have no output channel or popup to show. Only the VS Code extension handles them; every
 *   other client receives `window/logMessage` and `window/showMessage`.
 * - **`window/showMessage` is sent as a notification.** `connection.window.showErrorMessage`
 *   sends `window/showMessageRequest`, which a client must answer and many do not.
 * - **`severityMap` exists because clients surface different severities.** OpenCode hands only
 *   `error` diagnostics to the model, Claude Code hands errors and warnings. Re-reporting
 *   markuplint's warnings as errors is the client's choice, not a server default.
 * - **No `langConfigs` means no per-language gate.** Which documents reach the server is the
 *   client's setting (`extensionToLanguage` of Claude Code, `extensions` of OpenCode,
 *   `filetypes` of Neovim), so the server lints every document it is given.
 *
 * What the clients accept is theirs to change; check them when this package misbehaves in one:
 *
 * - Claude Code: https://code.claude.com/docs/en/plugins-reference#lspservers (a server is
 *   registered only through a plugin, and one server serves an extension)
 * - OpenCode: https://opencode.ai/docs/lsp/ (`lsp` of `opencode.json`)
 * - Neovim: `:help vim.lsp.config()`
 *
 * @module
 */

export { bootServer } from './server/server.js';
export type { InitializationOptions, SeverityMap } from './types.js';
