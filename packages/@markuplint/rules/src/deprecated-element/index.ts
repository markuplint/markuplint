import specs from '@markuplint/html-spec';
import { createRule } from '@markuplint/ml-core';
import { getSpecByTagName } from '@markuplint/ml-spec';

export default createRule({
	async verify({ document, report, t }) {
		await document.walkOn('Element', async el => {
			const ns = el.ns;
			if (!(ns === 'html' || ns === 'svg') || el.isCustomElement) {
				return;
			}
			const spec = getSpecByTagName(el.nameWithNS, specs);
			if (spec && (spec.obsolete || spec.deprecated || spec.nonStandard)) {
				const message = t(
					'{0} is {1:c}',
					t('the "{0}" {1}', el.nodeName, 'element'),
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
