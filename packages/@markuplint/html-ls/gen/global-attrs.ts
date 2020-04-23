import { Attribute, AttributeType } from '@markuplint/ml-spec';
import fetch from './fetch';
import { nameCompare } from './utils';

export async function getGlobalAttrs() {
	const $ = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes');
	const $article = $('#wikiArticle');
	const $specials = $article.find('ul').eq(0).find('code');

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

		let type: AttributeType = 'string';
		switch (category) {
			case 'xml': {
				type = 'string';
				break;
			}
			case 'eventhandler': {
				type = 'function-body';
				break;
			}
		}

		const attr: Attribute = {
			name,
			description: 'WIP',
			type,
		};
		attrs.push(attr);
	});

	attrs.sort(nameCompare);

	return attrs;
}
