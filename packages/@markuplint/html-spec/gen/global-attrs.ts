import type { Attribute, SpecDefs } from '@markuplint/ml-spec';
import { mergeAttributes, nameCompare } from './utils';
import fetch from './fetch';
import { getAttributes } from './html-elements';
import readJson from './read-json';

export async function getGlobalAttrs() {
	const htmlGlobalAttrs = await getHTMLGlobalAttrs();
	const gAttrs = readJson<SpecDefs['#globalAttrs']>('../src/global-attributes/_global.json', {
		'#HTMLGlobalAttrs': [],
	});
	if (gAttrs['#HTMLGlobalAttrs']) {
		const fromJSON = gAttrs['#HTMLGlobalAttrs'];
		// console.log(fromJSON.map(a => a.name));
		gAttrs['#HTMLGlobalAttrs'] = mergeAttributes(htmlGlobalAttrs, fromJSON).filter(
			(a): a is Attribute => typeof a !== 'string',
		);
		// console.log(gAttrs['#HTMLGlobalAttrs'].map(a => a.name));
	} else {
		gAttrs['#HTMLGlobalAttrs'] = htmlGlobalAttrs;
	}
	Object.values(gAttrs).forEach(attrs => attrs?.sort(nameCompare));

	return gAttrs;
}

async function getHTMLGlobalAttrs() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes');
	const attrs = getAttributes($, '#list_of_global_attributes', '_global');
	return attrs.filter((a): a is Attribute => typeof a !== 'string');
}
