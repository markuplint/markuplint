import { createRule } from '@markuplint/ml-core';

import { parseSrcset } from '../srcset-sizes-constraint/parse-srcset.js';

import meta from './meta.js';

/**
 * HTML LS § Srcset attributes: every candidate in a `srcset` must use the
 * same kind of descriptor — all width (`w`) or all pixel density (`x`,
 * including the implied `1x` of a descriptor-less candidate). Split out of
 * the former `srcset-sizes-constraint` rule's Check 2.
 *
 * Overlaps with the `Srcset` type validator `no-invalid-attr-value` uses for
 * the same attribute: that rule validates syntax, this one validates the
 * inter-descriptor constraint, and both may fire on the same mixed value.
 */
export default createRule<boolean>({
	meta,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const localName = el.localName;

			// Only check img and source (inside picture) elements
			if (localName !== 'img' && localName !== 'source') {
				return;
			}

			// source is only relevant inside <picture>
			if (localName === 'source' && el.parentElement?.localName !== 'picture') {
				return;
			}

			// Skip if element has spread attributes (dynamic props)
			if (el.hasSpreadAttr) {
				return;
			}

			const srcsetAttr = el.getAttributeNode('srcset');
			if (!srcsetAttr || srcsetAttr.isDynamicValue) {
				return;
			}

			const parsed = parseSrcset(srcsetAttr.value);

			if (parsed.hasWidth && (parsed.hasDensity || parsed.hasImplied)) {
				report({
					scope: el,
					line: srcsetAttr.valueNode?.startLine,
					col: srcsetAttr.valueNode?.startCol,
					raw: srcsetAttr.valueNode?.raw,
					message: 'The "srcset" attribute must not mix width and pixel density descriptors',
				});
			}
		});
	},
});
