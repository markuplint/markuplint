import { ID, NAME } from '@markuplint/language-server/protocol';

export { ID };

// Identifiers
export const OUTPUT_CHANNEL_PRIMARY_CHANNEL_NAME = NAME;
export const OUTPUT_CHANNEL_DIAGNOSTICS_CHANNEL_NAME = `${NAME} Diagnostics` as const;
export const COMMAND_NAME_OPEN_LOG_COMMAND = `${ID}.openLog` as const;
export const COMMAND_NAME_RESTART_SERVER = `${ID}.restartServer` as const;

// Paths
export const WATCHING_CONFIGURATION_GLOB =
	'**/{.markuplintrc,markuplintrc.json,markuplint.config.json,markuplint.json,markuplint.config.js}';
