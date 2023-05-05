import type { SpecDefs } from '@markuplint/ml-spec';

import { readJson } from './read-json.js';

export function getGlobalAttrs(filePath: string) {
	const gAttrs = readJson<SpecDefs['#globalAttrs']>(filePath);

	return gAttrs;
}
