import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	verify({ document, report, t }) {
		const brList = [...document.querySelectorAll('br')];

		for (const br of brList) {
			let next = br.nextSibling;
			while (next && next.is(next.TEXT_NODE) && !next.nodeValue?.trim()) {
				next = next.nextSibling;
			}
			if (next && next.nodeName === 'BR') {
				const target = next;
				report({
					scope: target,
					message: t('{0} detected', t('Consecutive {0}', t('"{0*}" {1}', 'br', 'elements'))),
					fix: fixer => fixer.remove({ startOffset: target.startOffset, raw: target.raw }),
				});
			}
		}
	},
});
