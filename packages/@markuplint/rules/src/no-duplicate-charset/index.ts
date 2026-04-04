import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Ensures no more than one `<meta>` element with a `charset` attribute exists in a document.
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		const charsetMetaElements: Element<boolean, null>[] = [];

		await document.walkOn('Element', el => {
			if (el.localName === 'meta' && el.hasAttribute('charset')) {
				charsetMetaElements.push(el);
			}
		});

		for (const el of charsetMetaElements.slice(1)) {
			report({
				scope: el,
				message: t(
					'There must not be more than one "{0}" element with the "{1}" attribute in a document',
					'meta',
					'charset',
				),
			});
		}
	},
});
