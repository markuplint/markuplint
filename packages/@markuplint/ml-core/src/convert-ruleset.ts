import type { Config } from '@markuplint/ml-config';

import { Ruleset } from './ruleset/index.js';

/**
 * Converts a markuplint {@link Config} object into a {@link Ruleset} instance
 * that can be used by the linting engine.
 *
 * @param config - The configuration to convert (defaults to an empty config)
 * @returns A new Ruleset instance
 */
export function convertRuleset(config: Config = {}) {
	return new Ruleset(config);
}
