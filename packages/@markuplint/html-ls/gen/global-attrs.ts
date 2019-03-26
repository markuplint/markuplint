import { Attribute, AttributeValue } from './types';
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

		const category = /^xml/i.test(name) ? 'xml' : /^on[a-z]+$/i.test(name) ? 'eventhandler' : null;

		if (!category) {
			return;
		}

		let value: AttributeValue = 'string';
		switch (category) {
			case 'xml': {
				value = 'string';
				break;
			}
			case 'eventhandler': {
				value = 'function-body';
				break;
			}
		}

		const attr: Attribute = {
			name,
			description: 'WIP',
			category,
			value,
		};
		attrs.push(attr);
	});

	return attrs;
}
