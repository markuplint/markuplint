import { fetch } from './fetch.ts';
import { getThisOutline } from './utils.ts';

/**
 * Fetches the MDN SVG element index page and extracts the list of
 * obsolete and deprecated SVG element names.
 * Each name is prefixed with `"svg_"` to distinguish it from HTML elements.
 *
 * @returns An array of deprecated/obsolete SVG element names (e.g., `["svg_altGlyph", ...]`)
 */
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
		.map(el => 'svg_' + $(el).text().trim().replaceAll(/<|>/g, ''));
	return deprecatedList;
}
