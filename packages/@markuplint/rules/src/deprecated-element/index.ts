import { createRule, getSpec } from '@markuplint/ml-core';

export default createRule({
	verify({ document, report, t }) {
		void document.walkOn('Element', el => {
			if (
				!(
					el.namespaceURI === 'http://www.w3.org/1999/xhtml' ||
					el.namespaceURI === 'http://www.w3.org/2000/svg'
				) ||
				el.isCustomElement
			) {
				return;
			}
			const spec = getSpec(el, document.specs.specs);
			if (spec && (spec.obsolete || spec.deprecated || spec.nonStandard)) {
				const message = t(
					'{0} is {1:c}',
					t('the "{0*}" {1}', el.localName, 'element'),
					spec.deprecated ? 'deprecated' : spec.obsolete ? 'obsolete' : 'non-standard',
				);
				report({
					scope: el,
					message,
				});
			}
		});
	},
});
