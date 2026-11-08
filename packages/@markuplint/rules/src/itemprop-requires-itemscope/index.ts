import { createRule } from '@markuplint/ml-core';

import { getDOMValue } from '../helpers.js';

import meta from './meta.js';

/**
 * Rule that requires every `itemprop` to belong to an item.
 *
 * The `itemprop` attribute is defined in HTML LS §5.2.3 ("Names: the
 * itemprop attribute"). The conformance constraint behind this rule sits
 * under §5.2.5: a document must not contain an `itemprop` element that
 * would not be found to be a property of any of its items. Practically,
 * an element with `itemprop` belongs to an item when one of the following
 * is true:
 *
 * - it has an ancestor element with an `itemscope` attribute, or
 * - its `id` is referenced by some `itemscope` element's `itemref` token list.
 *
 * Either path makes the element part of an item; without either, the
 * `itemprop` is orphaned and contributes no property to any item.
 *
 * @see https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute
 * @see https://html.spec.whatwg.org/multipage/microdata.html#associating-names-with-items
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
		// The ids are collected by tree: the content of a `template` element and a declarative shadow
		// root are trees of their own, which an `itemref` does not reach out of, and the elements of
		// every tree are checked.
		// An `itemref` that is not known until it is rendered may reach any element of its tree, so
		// that tree is not checked.
		const itemrefIdsOfTree = new Map<object, Set<string>>();
		const treesWithDynamicItemref = new Set<object>();
		const itemrefHosts = document.deepQuerySelectorAll('[itemscope][itemref]');
		for (const host of itemrefHosts) {
			const root = host.getRootNode();
			let itemrefIds = itemrefIdsOfTree.get(root);
			if (!itemrefIds) {
				itemrefIds = new Set();
				itemrefIdsOfTree.set(root, itemrefIds);
			}
			const itemref = host.getAttributeNode('itemref');
			if (itemref?.isDynamicValue) {
				treesWithDynamicItemref.add(root);
			}
			for (const token of itemref?.value.split(/\s+/) ?? []) {
				const id = token ? getDOMValue(itemref, token) : null;
				if (id != null) itemrefIds.add(id);
			}
		}

		const itempropEls = document.deepQuerySelectorAll('[itemprop]');
		for (const el of itempropEls) {
			const hasAncestorScope = el.closest('[itemscope]') != null;
			const id = getDOMValue(el.getAttributeNode('id'));
			const isItemrefTarget = id != null && id !== '' && !!itemrefIdsOfTree.get(el.getRootNode())?.has(id);
			if (!hasAncestorScope && !isItemrefTarget && !treesWithDynamicItemref.has(el.getRootNode())) {
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
