import type { Element } from '@markuplint/ml-core';

import { createRule, isPretenderDeclaredElement, withPretenderDeclaredElements } from '@markuplint/ml-core';

import { getDOMValue } from '../helpers.js';

import meta from './meta.js';

/**
 * An id is unique in its tree, not in the file: the content of a `template` element and a
 * declarative shadow root are trees of their own, where an id may repeat one of another tree.
 * The ids are grouped by `getRootNode()`, and compared after the character references are
 * resolved (`a&#x62;` is `ab`), as the DOM has them.
 *
 * What a pretender declares (the slot wrappers and the static entries of `contents`) is rendered by the
 * component, so its ids count in the tree of the pretended element, in the order the component renders
 * them (`withPretenderDeclaredElements` of `@markuplint/ml-core`). They are not in the source, so a
 * repeated one is reported on the element that the component is written as.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 * @see https://dom.spec.whatwg.org/#concept-tree
 */
export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		const message = t(
			'{0} is {1:c}',
			t('{0} of {1}', t('the {0}', 'value'), t('the "{0*}" {1}', 'id', 'attribute')),
			'duplicated',
		);
		const idsOfTree = new Map<object, Set<string>>();
		const elements: Element<any, any>[] = [];
		await document.walkOn('Element', node => {
			elements.push(node);
		});
		for (const node of withPretenderDeclaredElements(elements)) {
			// A declared element is not in the source: it is reported where the component is written
			const context = node.pretenderContext;
			const origin = isPretenderDeclaredElement(node) && context?.type === 'origin' ? context.origin : null;
			const idAttrs = node.getAttributeToken('id');
			for (const idAttr of idAttrs) {
				if (idAttr.isDynamicValue || idAttr.isDirective) {
					continue;
				}
				const id = getDOMValue(idAttr);
				if (id == null) {
					continue;
				}
				const root = node.getRootNode();
				let ids = idsOfTree.get(root);
				if (!ids) {
					ids = new Set();
					idsOfTree.set(root, ids);
				}
				if (ids.has(id)) {
					report(
						origin
							? { scope: origin, message }
							: {
									scope: node,
									message,
									line: idAttr.startLine,
									col: idAttr.startCol,
									raw: idAttr.raw,
								},
					);
				}
				ids.add(id);
			}
		}
	},
});
