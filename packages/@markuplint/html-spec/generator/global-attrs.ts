import type { SpecDefs } from '@markuplint/ml-spec';

import { readJson } from './read-json.ts';

/**
 * Reads the global HTML attributes definition from a JSON file.
 *
 * @param filePath - The absolute path to the common attributes JSON file
 * @returns The parsed global attributes specification object
 */
export function getGlobalAttrs(filePath: string) {
	const gAttrs = readJson<SpecDefs['#globalAttrs']>(filePath);

	return gAttrs;
}
