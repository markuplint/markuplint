import type { SpecDefs } from '@markuplint/ml-spec';

import readJson from './read-json';

export function getGlobalAttrs() {
	const gAttrs = readJson<SpecDefs['#globalAttrs']>('../src/global-attributes/_global.json', {
		'#HTMLGlobalAttrs': {},
	});

	return gAttrs;
}
