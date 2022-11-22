import type { SpecDefs } from '@markuplint/ml-spec';

import { readJson } from './read-json';

export function getGlobalAttrs() {
	const gAttrs = readJson<SpecDefs['#globalAttrs']>('../src/spec-common.attributes.json', {
		'#HTMLGlobalAttrs': {},
	});

	return gAttrs;
}
