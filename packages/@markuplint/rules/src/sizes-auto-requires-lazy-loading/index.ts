import { createRule } from '@markuplint/ml-core';

import { hasSizesAuto } from '../srcset-sizes-constraint/parse-srcset.js';
import { allowsAutoSizes, findFollowingImg, isLazyLoading } from '../srcset-sizes-constraint/sibling-helpers.js';

import meta from './meta.js';

/**
 * HTML LS § the img element / the source element: `sizes="auto"` defers
 * sizing to the image's intrinsic dimensions, which are unknown until the
 * image starts loading — so it only makes sense together with
 * `loading="lazy"`, which the spec requires. Split out of the former
 * `srcset-sizes-constraint` rule's Checks 3 (`<img>`) and 4 (`<source>`, which
 * checks the following sibling `<img>` instead of itself). For the `<source>`,
 * the sibling `<img>` must allow auto-sizes: `loading="lazy"` and a `sizes` of
 * `auto` (`allowsAutoSizes`), not `loading="lazy"` alone.
 *
 * Gated on `srcset` being present, matching the source rule this was split
 * from: `sizes="auto"` has nothing to auto-size without candidates to choose
 * from.
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

			if (!el.getAttributeNode('srcset')) {
				return;
			}

			const sizesAttr = el.getAttributeNode('sizes');
			const sizesValue = sizesAttr?.value ?? null;
			const sizesIsDynamic = sizesAttr?.isDynamicValue;

			// img[sizes=auto] → loading=lazy required
			if (localName === 'img' && sizesValue != null && !sizesIsDynamic && hasSizesAuto(sizesValue)) {
				const loading = el.getAttribute('loading');
				if (loading !== 'lazy') {
					report({
						scope: el,
						line: sizesAttr!.valueNode?.startLine,
						col: sizesAttr!.valueNode?.startCol,
						raw: sizesAttr!.valueNode?.raw,
						message: 'The "sizes" attribute with "auto" requires the "loading" attribute to be "lazy"',
					});
				}
			}

			// source[sizes=auto] → the following sibling img must allow
			// auto-sizes: loading=lazy and sizes=auto (HTML LS § sizes
			// attributes). A dynamic loading / sizes on the img is not known.
			if (localName === 'source' && sizesValue != null && !sizesIsDynamic && hasSizesAuto(sizesValue)) {
				const img = findFollowingImg(el);
				const lazy = img ? isLazyLoading(img) : false;
				if (lazy === false) {
					report({
						scope: el,
						line: sizesAttr!.valueNode?.startLine,
						col: sizesAttr!.valueNode?.startCol,
						raw: sizesAttr!.valueNode?.raw,
						message:
							'The "source" element with sizes="auto" requires the following sibling "img" element to have loading="lazy"',
					});
				} else if (img && allowsAutoSizes(img) === false) {
					report({
						scope: el,
						line: sizesAttr!.valueNode?.startLine,
						col: sizesAttr!.valueNode?.startCol,
						raw: sizesAttr!.valueNode?.raw,
						message:
							'The "source" element with sizes="auto" requires the following sibling "img" element to have sizes="auto"',
					});
				}
			}
		});
	},
});
