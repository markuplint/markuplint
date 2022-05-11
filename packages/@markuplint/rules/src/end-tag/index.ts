import { createRule } from '@markuplint/ml-core';

const voidElements = [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
];

export default createRule<boolean>({
	defaultServerity: 'warning',
	async verify({ document, report, t }) {
		if (document.endTag === 'never') {
			return;
		}
		await document.walkOn('Element', el => {
			if (el.isOmitted) {
				return;
			}
			if (voidElements.some(vE => vE === el.localName)) {
				return;
			}
			if (el.closeTag != null) {
				return;
			}
			if ((document.endTag === 'xml' || el.isForeignElement) && el.selfClosingSolidus?.raw) {
				return;
			}

			report({
				scope: el,
				message: t('Missing {0}', t('the {0}', 'end tag')),
			});
		});
	},
});
