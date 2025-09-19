// Identifiers
export const ID = 'markuplint';
export const NAME = 'Markuplint';
export const OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME = NAME;
export const OUTPUT_CHANNEL_DIAGNOSTICS_CHANNEL_NAME = `${NAME} Diagnostics` as const;
export const COMMAND_NAME_OPEN_LOG_COMMAND = `${ID}.openLog` as const;

// Paths
export const WATCHING_CONFIGURATION_GLOB =
	'**/{.markuplintrc,markuplintrc.json,markuplint.config.json,markuplint.json,markuplint.config.js}';

// URI
export const WEBSITE_URL = 'https://markuplint.dev';
export const WEBSITE_URL_RULE_PAGE = `${WEBSITE_URL}/docs/rules/` as const;

// Messages
export const NO_INSTALL_WARNING =
	'since markuplint could not be found in the node_modules of the workspace, this use the version (v{0}) installed in VS Code Extension';

export const NODE_22_COMPATIBILITY_WARNING = `⚠️ Local markuplint compatibility issue detected

Your local markuplint version (v{0}) is incompatible with VS Code's Node.js 22 engine.
Using bundled markuplint version instead.

To use your local markuplint version:
- Upgrade to markuplint@4.10.0 or later
- Or downgrade VS Code to version < 1.90.0

See: https://github.com/markuplint/markuplint/issues/2837`;
