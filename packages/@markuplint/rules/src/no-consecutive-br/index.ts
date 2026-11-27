import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';
import { hasText } from '@markuplint/shared';

export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	verify({ document, report, t }) {
		const brList = [...document.deepQuerySelectorAll('br')];

		for (const br of brList) {
			let next = br.nextSibling;
			// ASCII white space only: a no-break space (`&nbsp;`) is a character between the two
			while (next && next.is(next.TEXT_NODE) && !hasText(next.nodeValue)) {
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
