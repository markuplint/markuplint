// Identifiers
export const ID = 'markuplint';
export const NAME = 'Markuplint';
export const OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME = NAME;
export const OUTPUT_CHANNEL_DIAGNOSTICS_CHANNEL_NAME = `${NAME} Diagnostics` as const;
export const COMMAND_NAME_OPEN_LOG_COMMAND = `${ID}.openLog` as const;
export const COMMAND_NAME_RESTART_SERVER = `${ID}.restartServer` as const;

// Paths
export const WATCHING_CONFIGURATION_GLOB =
	'**/{.markuplintrc,markuplintrc.json,markuplint.config.json,markuplint.json,markuplint.config.js}';

// URI
export const WEBSITE_URL = 'https://markuplint.dev';
export const WEBSITE_URL_RULE_PAGE = `${WEBSITE_URL}/docs/rules/` as const;

// Messages

/**
 * Warning message shown when markuplint is not found in the workspace's node_modules.
 * Displayed in the status bar tooltip. Placeholder `{0}` is replaced with the bundled version number.
 */
export const NO_INSTALL_WARNING =
	'since markuplint could not be found in the node_modules of the workspace, this use the version (v{0}) installed in VS Code Extension';

/**
 * Warning message shown when the local markuplint (v4.0.0–4.9.x) fails to load on Node.js 22+
 * due to the removed `assert { type: 'json' }` syntax (import assertions).
 * Displayed as a popup via `warningToPopup`. Placeholder `{0}` is replaced with the bundled version number.
 *
 * @see https://github.com/markuplint/markuplint/issues/2837
 */
export const IMPORT_ASSERTION_COMPAT_WARNING =
	'your local markuplint is incompatible with Node.js 22+ due to import assertion syntax. The bundled version (v{0}) is used instead. To use your local version, upgrade to markuplint@4.10.0 or later. See: https://github.com/markuplint/markuplint/issues/2837';

/**
 * Error message shown when the parser a config requires cannot be loaded by a local markuplint.
 * Displayed as a popup via `errorToPopup`. `{0*}` is the parser package name, `{1*}` the VS Code language identifier.
 */
export const PARSER_NOT_FOUND_ERROR =
	'Parser not found. You probably need to install {0*} for documents of language {1*}.';

/**
 * Error message shown when the bundled markuplint cannot load a parser that lives in the user's workspace.
 * The bundled `@markuplint/file-resolver` imports parsers relative to itself, so a parser installed only in
 * the working directory is unreachable until markuplint itself is installed there.
 * The module cache is only cleared by a server restart, hence the restart instruction.
 * Displayed as a popup via `errorToPopup`. `{0}` is the bundled version, `{1*}` the parser package name,
 * `{2*}` the working directory.
 *
 * @see https://github.com/markuplint/markuplint/issues/4048
 */
export const BUNDLED_PARSER_LOAD_ERROR =
	'The markuplint bundled with the extension (v{0}) cannot load parsers installed in your workspace. Install markuplint and {1*} in {2*}, then run "Markuplint: Restart Language Server" so the extension can use the local installation.';

/**
 * Variant of {@link BUNDLED_PARSER_LOAD_ERROR} for when the local markuplint exists but was skipped
 * for the import assertion incompatibility ({@link IMPORT_ASSERTION_COMPAT_WARNING}): installing is
 * not the fix there, upgrading is.
 * Displayed as a popup via `errorToPopup`. `{0}` is the bundled version, `{1*}` the parser package name,
 * `{2*}` the working directory.
 */
export const BUNDLED_PARSER_LOAD_COMPAT_ERROR =
	'The markuplint bundled with the extension (v{0}) cannot load {1*} from {2*} because the markuplint installed there is incompatible with Node.js 22+. Upgrade it to markuplint@4.10.0 or later, then run "Markuplint: Restart Language Server".';
