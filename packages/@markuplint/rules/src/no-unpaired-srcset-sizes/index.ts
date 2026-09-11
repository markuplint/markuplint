import { createRule } from '@markuplint/ml-core';

import { parseSrcset } from '../srcset-sizes-constraint/parse-srcset.js';
import { findFollowingImg } from '../srcset-sizes-constraint/sibling-helpers.js';

import meta from './meta.js';

/**
 * HTML LS § img/source `srcset` attributes: `sizes` and a width-descriptor
 * `srcset` are mutually required. Split out of the former
 * `srcset-sizes-constraint` rule's Checks 1 and 5, the two directions of this
 * one constraint.
 *
 * `<source>`'s direction (Check 5) is conditional: `sizes` "may" be omitted
 * when the following sibling `<img>` has `loading="lazy"` (auto-sizes
 * support). `<img>`'s direction (Check 1) has no such escape.
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
			// HTML LS § source: conditional — sizes "may" be present with w
			// descriptors, but the following sibling img must support
			// auto-sizes for it to be omittable. img supports auto-sizes when
			// loading=lazy (the dimensionsAttribute condition is also part of
			// the spec but the lazy attribute is the user-facing trigger).
			if (parsed && parsed.hasWidth && !sizesAttr) {
				// For `<source>`, `findFollowingImg` may return null (malformed
				// <picture> with no img). Optional chaining short-circuits to
				// undefined, and `undefined === 'lazy'` is false → sizes is
				// required. That's the correct fail-closed behaviour: an absent
				// img cannot supply auto-sizes for the source.
				const siblingImgLazy =
					localName === 'source' && findFollowingImg(el)?.getAttribute('loading') === 'lazy';
				if (!siblingImgLazy) {
					report({
						scope: el,
						message: 'The "sizes" attribute is required when the "srcset" attribute uses width descriptors',
					});
				}
			}
		});
	},
});
