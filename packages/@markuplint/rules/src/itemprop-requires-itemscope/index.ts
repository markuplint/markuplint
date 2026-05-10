import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that requires every `itemprop` to belong to an item.
 *
 * Per HTML LS §5.2.4 ("Names: the itemprop attribute"), an element with
 * an `itemprop` attribute is in error unless one of the following is true:
 *
 * - it has an ancestor element with an `itemscope` attribute, or
 * - its `id` is referenced by some `itemscope` element's `itemref` token list.
 *
 * Either path makes the element part of an item; without either, the
 * `itemprop` is orphaned and contributes no property to any item.
 *
 * @see https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute
 */
export default createRule<boolean, null>({
	meta,
	verify({ document, report, t }) {
		// Build the set of element ids referenced by some `[itemscope] [itemref]`.
		// HTML LS does not require `itemref` to point to a descendant — any
		// element in the same tree may be claimed via id, so we collect ids
		// once and then check each `[itemprop]` against the union set.
		// `itemref="  "` (whitespace-only) yields zero tokens and contributes
		// no entries to the set; orphans referencing such a host stay orphans.
		const itemrefIds = new Set<string>();
		const itemrefHosts = document.querySelectorAll('[itemscope][itemref]');
		for (const host of itemrefHosts) {
			const value = host.getAttribute('itemref') ?? '';
			for (const token of value.split(/\s+/)) {
				if (token) itemrefIds.add(token);
			}
		}

		const itempropEls = document.querySelectorAll('[itemprop]');
		for (const el of itempropEls) {
			const hasAncestorScope = el.closest('[itemscope]') != null;
			const id = el.getAttribute('id');
			const isItemrefTarget = id != null && id !== '' && itemrefIds.has(id);
			if (!hasAncestorScope && !isItemrefTarget) {
				report({
					scope: el,
					message: t(
						'{0} must {1}',
						t('the {0}', 'element'),
						'belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
					),
				});
			}
		}
	},
});
