import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Require the `list` attribute on an `<input>` element to reference an
 * actual `<datalist>` element by ID. Per HTML LS §4.10.5.2: "The `list`
 * content attribute is used to identify an element that lists predefined
 * options to suggest to the user. If present, its value must be the ID of
 * a `datalist` element in the same tree." Existence of the ID itself is
 * the responsibility of `no-refer-to-non-existent-id`; this rule only
 * checks the element type when the ID resolves.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#the-list-attribute
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'input') return;
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;

			const listAttr = el.getAttributeNode('list');
			if (!listAttr) return;
			if (listAttr.isDynamicValue) return;

			const targetId = listAttr.value;
			const target = [...document.querySelectorAll('[id]')].find(
				candidate => candidate.getAttribute('id') === targetId,
			);

			// Existence is checked by `no-refer-to-non-existent-id`. If the ID does not resolve
			// here, leave that diagnostic to the dedicated rule and stay silent.
			if (!target) return;

			if (target.localName !== 'datalist') {
				report({
					scope: listAttr,
					line: listAttr.valueNode?.startLine,
					col: listAttr.valueNode?.startCol,
					raw: listAttr.valueNode?.raw,
					message: t(
						'The "{0}" attribute of the "{1}" element must reference a "{2}" element',
						'list',
						'input',
						'datalist',
					),
				});
			}
		});
	},
});
