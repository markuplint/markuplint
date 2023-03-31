import { createRule, getSpec } from '@markuplint/ml-core';

export default createRule({
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
					spec.deprecated ? 'deprecated' : spec.obsolete != null ? 'obsolete' : 'non-standard',
				);
				report({
					scope: el,
					message,
				});
			}
		});
	},
});
