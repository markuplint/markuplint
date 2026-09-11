import { fetch } from './fetch.ts';

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
