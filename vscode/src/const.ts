// Identifiers
export const ID = 'markuplint';
export const NAME = 'Markuplint';
export const OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME = NAME;
export const OUTPUT_CHANNEL_DIAGNOSTICS_CHANNEL_NAME = `${NAME} Diagnostics` as const;
export const COMMAND_NAME_OPEN_LOG_COMMAND = `${ID}.openLog` as const;
export const LANGUAGE_LIST = [
	'html',
	'vue',
	'jade',
	'svelte',
	'astro',
	'nunjucks',
	'liquid',
	'handlebars',
	'mustache',
	'ejs',
	'haml',
	'jstl',
	'php',
	'smarty',
	'ruby',
	'javascript',
	'javascriptreact',
	'typescript',
	'typescriptreact',
] as const;

// Paths
export const WATCHING_CONFIGURATION_GLOB =
	'**/{.markuplintrc,markuplintrc.json,markuplint.config.json,markuplint.json,markuplint.config.js}';

// URI
export const WEBSITE_URL = 'https://markuplint.dev';
export const WEBSITE_URL_RULE_PAGE = `${WEBSITE_URL}/docs/rules/` as const;

// Messages
export const NO_INSTALL_WARNING =
	'since markuplint could not be found in the node_modules of the workspace, this use the version (v{0}) installed in VS Code Extension';
