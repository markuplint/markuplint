import { createRule } from '@markuplint/ml-core';

import { parseSrcset } from '../srcset-sizes-constraint/parse-srcset.js';
import { allowsAutoSizes, findFollowingImg } from '../srcset-sizes-constraint/sibling-helpers.js';

import meta from './meta.js';

/**
 * HTML LS § img/source `srcset` attributes: `sizes` and a width-descriptor
 * `srcset` are mutually required. Split out of the former
 * `srcset-sizes-constraint` rule's Checks 1 and 5, the two directions of this
 * one constraint.
 *
 * `<source>`'s direction (Check 5) is conditional: `sizes` "may" be omitted
 * when the following sibling `<img>` allows auto-sizes (`loading="lazy"` and
 * `sizes="auto"`; see `allowsAutoSizes`). `<img>`'s direction (Check 1) has no
 * such escape.
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
			if (!srcsetAttr) {
				return;
			}

			const srcsetIsDynamic = srcsetAttr.isDynamicValue;
			const sizesAttr = el.getAttributeNode('sizes');
			const sizesIsDynamic = sizesAttr?.isDynamicValue;

			// Parse srcset unless dynamic
			const parsed = srcsetIsDynamic ? null : parseSrcset(srcsetAttr.value);

			// sizes present → srcset must use width descriptors
			if (sizesAttr && !sizesIsDynamic && parsed && !parsed.hasWidth) {
				report({
					scope: el,
					line: srcsetAttr.valueNode?.startLine,
					col: srcsetAttr.valueNode?.startCol,
					raw: srcsetAttr.valueNode?.raw,
					message: 'The "srcset" attribute requires width descriptors when the "sizes" attribute is present',
				});
			}

			// img / source-in-picture with w descriptors → sizes required.
			//
			// HTML LS § img srcset: unconditional — "the sizes attribute must
			// also be present" when any candidate uses a width descriptor.
			//
			// HTML LS § source: conditional — sizes "may" be omitted only when
			// the following sibling img allows auto-sizes (loading=lazy and
			// sizes=auto; the same condition is the second source of truth for
			// `sizes-auto-requires-lazy-loading`).
			if (parsed && parsed.hasWidth && !sizesAttr) {
				// For `<source>`, `findFollowingImg` may return null (malformed
				// <picture> with no img): an absent img cannot supply
				// auto-sizes, so sizes is required (fail-closed). A dynamic
				// `loading` / `sizes` on the img is not known → not reported.
				const img = localName === 'source' ? findFollowingImg(el) : null;
				const allowed = img ? allowsAutoSizes(img) : false;
				if (allowed === false) {
					report({
						scope: el,
						message: 'The "sizes" attribute is required when the "srcset" attribute uses width descriptors',
					});
				}
			}
		});
	},
});
