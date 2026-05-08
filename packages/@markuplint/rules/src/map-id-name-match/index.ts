import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Require that a `<map>` element's `id` attribute, when present, has
 * the same value as its `name` attribute. Per HTML LS §4.8.13:
 * "If the id attribute is also specified, both attributes must have
 * the same value."
 *
 * @see https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'map') return;

			const idAttr = el.getAttributeNode('id');
			const nameAttr = el.getAttributeNode('name');

			if (!idAttr || !nameAttr) return;
			if (idAttr.isDynamicValue || nameAttr.isDynamicValue) return;

			if (idAttr.value === nameAttr.value) return;

			report({
				scope: idAttr,
				line: idAttr.valueNode?.startLine,
				col: idAttr.valueNode?.startCol,
				raw: idAttr.valueNode?.raw,
				message: t(
					'The "{0}" attribute on a "{1}" element must have the same value as the "{2}" attribute',
					'id',
					'map',
					'name',
				),
			});
		});
	},
});
