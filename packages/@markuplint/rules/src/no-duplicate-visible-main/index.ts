import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Ensures no more than one visible `<main>` element exists in a document.
 * A `<main>` element with the `hidden` attribute is not considered visible.
 *
 * @see https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		const visibleMains: Element<boolean, null>[] = [];

		await document.walkOn('Element', el => {
			if (el.localName === 'main' && !el.hasAttribute('hidden')) {
				visibleMains.push(el);
			}
		});

		for (const el of visibleMains.slice(1)) {
			report({
				scope: el,
				message: t('There must not be more than one visible "{0}" element in a document', 'main'),
			});
		}
	},
});
