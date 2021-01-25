import fetch from './fetch';
import { getAttributes } from './html-elements';
import { nameCompare } from './utils';

export async function getGlobalAttrs() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes');
	const attrs = getAttributes($, '#list_of_global_attributes', '_global');
	attrs.sort(nameCompare);
	return attrs;
}
