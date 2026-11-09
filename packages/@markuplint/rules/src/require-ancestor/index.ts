import { createRule } from '@markuplint/ml-core';
import { isShadowRoot } from '@markuplint/ml-spec';

import meta from './meta.js';

/**
 * Looks for the ancestor that the content model asks for (`descendantOf`) in the tree of the
 * element, as the DOM does: the climb stops at the top of the content of a `template` element, and
 * does not go on to the tree that holds the `template`.
 *
 * What the rule decides for an element whose climb ends there depends on where the content is placed:
 *
 * - The content of an ordinary `template` element is placed where the markup does not tell
 *   (a script clones it into the document), so the rule does not decide and reports nothing,
 *   whether or not a matching ancestor stands outside of the `template`.
 * - The content of a declarative shadow root is placed in its host, and it is a tree of its own:
 *   an ancestor outside of the shadow root is not an ancestor of the element, so it is reported.
 *
 * A `template` of a template engine that renders its children in place of it (Vue's `<template v-if>`,
 * or the `template` of a framework whose spec puts the children in the element itself) is not an HTML
 * `template` element, and the climb goes through it as through any other element.
 *
 * @see https://dom.spec.whatwg.org/#concept-tree-parent-element
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 */
export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const elSpec = document.specs.specs.find(s => s.name === el.localName);
			const descendantOf = elSpec?.contentModel?.descendantOf;
			if (!descendantOf) {
				return;
			}
			let ancestor = el.treeParentElement;
			let found = false;
			while (ancestor) {
				if (ancestor.matches(descendantOf)) {
					found = true;
					break;
				}
				ancestor = ancestor.treeParentElement;
			}
			if (found) {
				return;
			}
			const root = el.getRootNode();
			if (root.is(root.DOCUMENT_FRAGMENT_NODE) && !isShadowRoot(root)) {
				return;
			}
			report({
				scope: el,
				message: t(
					'{0} must appear as a descendant of {1}',
					t('the "{0}" {1}', el.localName, 'element'),
					t('the "{0}" {1}', descendantOf, 'element'),
				),
			});
		});
	},
});
