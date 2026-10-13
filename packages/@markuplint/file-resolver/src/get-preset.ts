import type { Config } from '@markuplint/ml-config';

import { ConfigLoadError } from '@markuplint/shared';

import { log } from './debug.js';

const cache = new Map<string, Config>();
const pLog = log.extend('get-preset');

/**
 * Loads a built-in preset (`markuplint:<name>`).
 *
 * @param name - The preset name without the `markuplint:` prefix
 * @param referrer - The config that asked for the preset, named in the error message
 * @throws {ConfigLoadError} The preset cannot be imported. It is a failure to
 *   load a config (Tier 2), not a bug in markuplint: a name the user mistyped
 *   and a runtime that rejects the import both end here.
 */
export async function getPreset(name: string, referrer = '<unknown>'): Promise<Config> {
	if (cache.has(name)) {
		return cache.get(name)!;
	}

	// NOTE: `isFatalError()` is intentionally NOT applied at this catch. What
	// `import()` throws for an unloadable JSON module differs by runtime
	// (Node.js, Deno and Bun use different classes and codes), and a
	// `SyntaxError` or `TypeError` here may come from the module loader rather
	// than from markuplint's own code. The cause goes to the debug log.
	const imported = await import(`@markuplint/config-presets/preset.${name}.json`, {
		with: { type: 'json' },
	}).catch((error: unknown) => error);

	if (imported instanceof Error) {
		pLog('Error in getPreset: %O', imported);
		throw new ConfigLoadError(`Preset markuplint:${name} is not found`, `markuplint:${name}`, referrer);
	}

	const json: Config = imported.default ?? imported;
	cache.set(name, json);

	return json;
}
