import { createRule } from '@markuplint/ml-core';
import { getSpecByTagName } from '@markuplint/ml-spec';
import specs from '@markuplint/html-spec';

export default createRule({
	name: 'deprecated-element',
	defaultValue: null,
	defaultOptions: null,
	async verify(context) {
		const message = context.translate('{0} is {1}', 'Element', 'deprecated');
		await context.document.walkOn('Element', async el => {
			const ns = el.ns;
			if (!(ns === 'html' || ns === 'svg') || el.isCustomElement) {
				return;
			}
			const spec = getSpecByTagName(el.nameWithNS, specs);
			if (spec && (spec.obsolete || spec.deprecated || spec.nonStandard)) {
				context.report({
					scope: el,
					message,
				});
			}
		});
	},
});
