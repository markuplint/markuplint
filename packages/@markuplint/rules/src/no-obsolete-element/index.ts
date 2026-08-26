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
				// Web components and authored elements (JSX/Vue/Svelte) reach this rule
				// through `pretenders`: they masquerade as a known HTML element via
				// `el.localName`, so the spec lookup below resolves correctly. See #3740.
				(el.elementType !== 'html' && el.pretenderContext?.type !== 'pretender')
			) {
				return;
			}
			const spec = getSpec(el, document.specs.specs);
			if (spec && spec.obsolete != null) {
				report({
					scope: el,
					message: t('{0} is {1:c}', t('the "{0*}" {1}', el.localName, 'element'), 'obsolete'),
				});
			}
		});
	},
});
