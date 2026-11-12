import type { PlainData } from '@markuplint/ml-config';
import type { Element, RuleConfigValue } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';
import { getSpecByTagName, isShadowRoot } from '@markuplint/ml-spec';

import { isRenderedAway, isUnknownOutput } from '../helpers.js';

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
 * A component whose output is not known (`MLElement#isUnresolvedComponent`: no pretender stands for
 * it) may render the ancestor, so an element with such a component above it, up to the top of its
 * tree, is not reported: the rule does not decide what the file does not tell. A pretender that
 * says what the component renders is read as that element, and a web component is the element
 * that it is written as. What renders its children in place is not one even where the parser sees it
 * as a component: a fragment (Vue's `slot` is one to its parser) and a `template` with a directive
 * ({@link isUnknownOutput}).
 *
 * When the content model says the ancestor is required only of an element with a parent node
 * (`descendantOfWithParentNode`, as the `area` element's is), an element that has no parent node in
 * the file ({@link hasParentNode}) is not reported:
 *
 * > An area element with a parent node must have a map element ancestor.
 *
 * @see https://dom.spec.whatwg.org/#parent-element
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 * @see https://html.spec.whatwg.org/multipage/image-maps.html#the-area-element
 */
export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const contentModel = getSpecByTagName(document.specs.specs, el.localName, el.namespaceURI)?.contentModel;
			const descendantOf = contentModel?.descendantOf;
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
				// What the component renders is not known, so the ancestor may be among it. The climb does not
				// leave the tree of the element (`treeParentElement`), so a component outside a declarative shadow
				// root is not reached
				if (isUnknownOutput(ancestor)) {
					return;
				}
				ancestor = ancestor.treeParentElement;
			}
			if (found || (contentModel.descendantOfWithParentNode && !hasParentNode(el))) {
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
					t('the "{0*}" {1}', el.localName, 'element'),
					t('the "{0*}" {1}', descendantOf, 'element'),
				),
			});
		});
	},
});

/**
 * Whether the element has a parent node, as far as the file tells. In a whole document every element
 * has one. An element at the top of a file that is a fragment of a document (a partial, a component)
 * has none: where it is inserted is not known from the markup. What is rendered away between the
 * element and the top of the file is not a parent node: a block of a template language, which
 * `parentNode` (and so `parentElement`) walks through, and a fragment of JSX or a `template` with
 * a directive ({@link isRenderedAway}).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - An element
 * @returns `false` if the element is at the top of a fragment document
 */
function hasParentNode<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
): boolean {
	if (!el.isInFragmentDocument()) {
		return true;
	}
	let parent = el.parentElement;
	while (parent && isRenderedAway(parent)) {
		parent = parent.parentElement;
	}
	return parent !== null;
}
