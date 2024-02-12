import { createRule } from '@markuplint/ml-core';

export default createRule({
	meta: {
		category: 'a11y',
	},
	defaultSeverity: 'warning',
	verify({ document, report, t }) {
		const brList = [...document.querySelectorAll('br')];

		for (const br of brList) {
			let next = br.nextSibling;
			while (next && next.is(next.TEXT_NODE) && !next.nodeValue?.trim()) {
				next = next.nextSibling;
			}
			if (next && next.nodeName === 'BR') {
				report({
					scope: next,
					message: t('{0} detected', t('Consecutive {0}', t('"{0*}" {1}', 'br', 'elements'))),
				});
			}
		}
	},
});
