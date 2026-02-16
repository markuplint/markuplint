import { createRule, getSpec } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that reports the use of deprecated or obsolete HTML elements.
 *
 * Walks HTML and SVG elements and checks their spec status. Reports any
 * element that is marked as deprecated or obsolete in the HTML specification.
 */
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
			if (spec && (spec.obsolete != null || spec.deprecated)) {
				const message = t(
					'{0} is {1:c}',
					t('the "{0*}" {1}', el.localName, 'element'),
					spec.deprecated ? 'deprecated' : 'obsolete',
				);
				report({
					scope: el,
					message,
				});
			}
		});
	},
});
