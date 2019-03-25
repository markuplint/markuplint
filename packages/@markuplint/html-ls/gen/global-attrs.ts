import { Attribute } from './types';
import fetch from './fetch';

export async function getGlobalAttrs() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes');
	const $article = $('#wikiArticle');
	const $specials = $article
		.find('ul')
		.eq(0)
		.find('code');

	const attrs: Attribute[] = [];

	$specials.each((i, el) => {
		const name = $(el).text();
		if (/^aria-/i.test(name)) {
			return;
		}
		const type: Attribute['type'] = /^xml/i.test(name)
			? 'xml'
			: /^on[a-z]+$/i.test(name)
			? 'eventhandler'
			: 'global';
		const attr: Attribute = {
			name,
			type,
			value: {},
		};
		attrs.push(attr);
	});

	return attrs;
}
