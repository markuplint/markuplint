import type { AttributesSchema } from '@markuplint/ml-spec';

import readJSON from './read-json';

export function getAttribute(tagName: string, namespace?: string) {
	const fileName = namespace ? `${namespace}_${tagName}` : tagName.toLowerCase();
	return readJSON<AttributesSchema>(`../src/attributes/${fileName}.json`, {
		tag: tagName,
		ref: 'N/A',
		global: {},
		attributes: {},
	});
}
