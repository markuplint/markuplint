import { AttributeJSON } from '@markuplint/ml-spec';
import readJSON from './read-json';

export function getAttribute(tagName: string, namespace?: string) {
	const fileName = namespace ? `${namespace}_${tagName}` : tagName.toLowerCase();
	return readJSON(`../src/attributes/${fileName}.json`, {
		tag: tagName,
		attributes: [] as (AttributeJSON | string)[],
	});
}
