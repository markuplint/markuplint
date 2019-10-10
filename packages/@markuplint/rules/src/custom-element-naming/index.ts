import { Result, createRule } from '@markuplint/ml-core';

/**
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 */
const pcenChar = [
	'\\-',
	'\\.',
	'[0-9]',
	'_',
	'[a-z]',
	'\u00B7',
	'[\u00C0-\u00D6]',
	'[\u00D8-\u00F6]',
	'[\u00F8-\u037D]',
	'[\u037F-\u1FFF]',
	'[\u200C-\u200D]',
	'[\u203F-\u2040]',
	'[\u2070-\u218F]',
	'[\u2C00-\u2FEF]',
	'[\u3001-\uD7FF]',
	'[\uF900-\uFDCF]',
	'[\uFDF0-\uFFFD]',
	'[\uD800-\uDBFF][\uDC00-\uDFFF]',
].join('|');
export const rePCEN = new RegExp(`^[a-z](?:${pcenChar})*\\-(?:${pcenChar})*$`);

// TODO: Ignore tags
// const ignoreTags = [
// 	'annotation-xml',
// 	'color-profile',
// 	'font-face',
// 	'font-face-src',
// 	'font-face-uri',
// 	'font-face-format',
// 	'font-face-name',
// 	'missing-glyph',
// ];

export default createRule<string | null>({
	name: 'custom-element-naming',
	defaultValue: null,
	defaultOptions: null,
	defaultLevel: 'warning',
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walkOn('Element', async node => {
			if (!node.rule.value) {
				return;
			}
			const tagName = node.nodeName;
			const isCustomElement = rePCEN.test(tagName);
			if (!isCustomElement) {
				return;
			}
			const pattern = node.rule.value;
			const rePattern = new RegExp(pattern);
			if (rePattern.test(tagName)) {
				return;
			}
			reports.push({
				severity: node.rule.severity,
				message: messages(`Invalid custom element name. Expected pattern is /${pattern}/`),
				line: node.startLine,
				col: node.startCol,
				raw: node.raw,
			});
		});
		return reports;
	},
});
