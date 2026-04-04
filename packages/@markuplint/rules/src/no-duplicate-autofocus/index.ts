import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Ensures no more than one element in a document has the `autofocus` attribute.
 *
 * @see https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		const autofocusElements: Element<boolean, null>[] = [];

		await document.walkOn('Element', el => {
			if (el.hasAttribute('autofocus')) {
				autofocusElements.push(el);
			}
		});

		for (const el of autofocusElements.slice(1)) {
			report({
				scope: el,
				message: t('The "{0}" attribute must be unique in the document', 'autofocus'),
			});
		}
	},
});
