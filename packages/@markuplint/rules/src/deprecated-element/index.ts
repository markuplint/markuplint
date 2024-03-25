import { createRule, getSpec } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (
				!(
					el.namespaceURI === 'http://www.w3.org/1999/xhtml' ||
					el.namespaceURI === 'http://www.w3.org/2000/svg'
				) ||
				el.elementType !== 'html'
			) {
				return;
			}
			const spec = getSpec(el, document.specs.specs);
			if (spec && (spec.obsolete != null || spec.deprecated || spec.nonStandard)) {
				const message = t(
					'{0} is {1:c}',
					t('the "{0*}" {1}', el.localName, 'element'),
					spec.deprecated ? 'deprecated' : spec.obsolete == null ? 'non-standard' : 'obsolete',
				);
				report({
					scope: el,
					message,
				});
			}
		});
	},
});
