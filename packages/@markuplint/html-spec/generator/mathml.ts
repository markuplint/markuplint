import { fetch } from './fetch.ts';

/**
 * Fetches the MDN MathML element index page and extracts the list of
 * deprecated and non-standard MathML element names.
 * Each name is prefixed with `"mml_"` to distinguish it from HTML/SVG elements.
 *
 * @returns An array of deprecated/non-standard MathML element names (e.g., `["mml_maction", ...]`)
 */
export async function getMathMLElementList() {
	const index = 'https://developer.mozilla.org/en-US/docs/Web/MathML/Element';
	const $ = await fetch(index);
	const deprecatedList: string[] = [];

	// MathML element page lists deprecated/non-standard status inline with icons
	// rather than having a separate section like SVG
	$('main#content td code').each((_, el) => {
		const $el = $(el);
		const text = $el.text().trim().replaceAll(/<|>/g, '');
		if (!text || !text.startsWith('m')) {
			return;
		}
		const $row = $el.closest('tr');
		const hasDeprecated = $row.find('.icon.icon-deprecated, .icon-deprecated').length > 0;
		const hasNonStandard = $row.find('.icon.icon-nonstandard, .icon-nonstandard').length > 0;
		if (hasDeprecated || hasNonStandard) {
			deprecatedList.push('mml_' + text);
		}
	});

	return deprecatedList;
}
