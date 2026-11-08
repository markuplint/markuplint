import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that warns when a heading skips a level relative to the previous
 * heading lead.
 *
 * Per HTML LS §4.3.11, the constraint applies only to a heading "following
 * another heading lead". A document whose first heading is at any level
 * (e.g., an article fragment starting with h3) has no lead, so it is
 * unaffected and never fires on the first heading.
 *
 * @see https://html.spec.whatwg.org/multipage/sections.html#headings-and-outlines-2
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultOptions: null,
	verify({ document, report, t }) {
		// The content of a `template` element and a declarative shadow root are trees of their own, and
		// where they are inserted is not known from the markup: the headings of each tree are the
		// sequence that the heading lead is judged in, as the headings of the document are.
		const headings = document.deepQuerySelectorAll('h1, h2, h3, h4, h5, h6');
		const prevLevelOfTree = new Map<object, number>();
		for (const heading of headings) {
			const level = Number.parseInt(heading.nodeName.slice(1));
			const root = heading.getRootNode();
			const prevLevel = prevLevelOfTree.get(root);

			if (prevLevel !== undefined && prevLevel + 1 < level) {
				report({
					scope: heading,
					message: t('{0} must not be skipped', t('Heading levels')),
				});
			}
			prevLevelOfTree.set(root, level);
		}
	},
});
