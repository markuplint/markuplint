import fetch from './fetch.js';
import { getThisOutline } from './utils.js';

export async function getSVGElementList() {
	const index = 'https://developer.mozilla.org/en-US/docs/Web/SVG/Element';
	const $ = await fetch(index);
	$('section').each((_, sec) => {
		const $sec = $(sec);
		const children = $sec.children();
		$sec.before(children);
		$sec.remove();
	});
	const $deprecatedIndex = getThisOutline($, $('#obsolete_and_deprecated_elements'));
	const deprecatedList = $deprecatedIndex
		.find('div > a')
		.toArray()
		.map(el => 'svg_' + $(el).text().trim().replace(/<|>/g, ''));
	return deprecatedList;
}
