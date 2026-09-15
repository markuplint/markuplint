import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * The HTML Living Standard scopes autofocus uniqueness to the "nearest ancestor
 * autofocus scoping root element" — the element itself if it is a `dialog` or
 * has a `popover` attribute, otherwise the nearest such ancestor, otherwise the
 * document as a whole. Two `autofocus` elements only conflict when they share
 * the same scoping root; two `dialog`/`popover` elements can each carry their
 * own `autofocus` target without conflict.
 *
 * @see https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute
 */
function getAutofocusScopingRoot(el: Element<boolean, null>): Element<boolean, null> | null {
	return el.closest('dialog, [popover]');
}

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

		const seenScopingRoots = new Set<Element<boolean, null> | null>();

		for (const el of autofocusElements) {
			const scopingRoot = getAutofocusScopingRoot(el);

			if (seenScopingRoots.has(scopingRoot)) {
				report({
					scope: el,
					message: t('The "{0}" attribute must be unique in the document', 'autofocus'),
				});
				continue;
			}

			seenScopingRoots.add(scopingRoot);
		}
	},
});
