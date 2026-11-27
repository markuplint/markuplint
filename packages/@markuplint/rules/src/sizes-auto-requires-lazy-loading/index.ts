import { createRule } from '@markuplint/ml-core';
import { specifiesSourceSizeAuto } from '@markuplint/types';

import { hasSizesAuto } from '../srcset-sizes-constraint/parse-srcset.js';
import { findFollowingImg, isAutoSizes, isLazyLoading } from '../srcset-sizes-constraint/sibling-helpers.js';

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
 * Whether `auto` is specified is read by the `<source-size-list>` grammar
 * (`specifiesSourceSizeAuto` of `@markuplint/types`, which also decodes CSS
 * escapes), as comments and whitespace around it are allowed
 * on a `<source>`. Whether an `<img>` allows auto-sizes is read from its
 * literal value (`hasSizesAuto`), so an `<img>` whose `sizes` specifies
 * `auto` in any other form is reported as well:
 *
 * > So whenever auto is specified, whether on the img element or on a
 * > previous sibling source element, the img element's sizes attribute value
 * > has to be exactly "auto" or start with "auto," (ASCII case-insensitive),
 * > with no comments or whitespace before or directly after auto.
 *
 * Gated on `srcset` being present, matching the source rule this was split
 * from. An `<img>` without `srcset` is left to the `@markuplint/html-spec`
 * data of its `sizes`: the condition allows it only on a lazily loaded image
 * (`no-disallowed-attr`) and the type only as the value `auto`
 * (`no-invalid-attr-value`).
 *
 * @see https://html.spec.whatwg.org/multipage/images.html#sizes-attributes
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

			// img[sizes=auto] → the literal form and loading=lazy required.
			// The keyword is matched ASCII case-insensitively; a dynamic
			// `loading` is not known and is not reported.
			if (localName === 'img' && sizesValue != null && !sizesIsDynamic && specifiesSourceSizeAuto(sizesValue)) {
				if (!hasSizesAuto(sizesValue)) {
					report({
						scope: el,
						line: sizesAttr!.valueNode?.startLine,
						col: sizesAttr!.valueNode?.startCol,
						raw: sizesAttr!.valueNode?.raw,
						message:
							'The "sizes" attribute with "auto" must be exactly "auto" or start with "auto," on the "img" element, with no whitespace or comments before or directly after "auto"',
					});
				}
				if (isLazyLoading(el) === false) {
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
			// auto-sizes: loading=lazy and sizes=auto (HTML LS §
			// allows-auto-sizes, see `allowsAutoSizes`). A dynamic loading / sizes on the img is not known.
			if (
				localName === 'source' &&
				sizesValue != null &&
				!sizesIsDynamic &&
				specifiesSourceSizeAuto(sizesValue)
			) {
				const img = findFollowingImg(el);
				const lazy = img ? isLazyLoading(img) : false;
				const auto = img ? isAutoSizes(img) : false;
				if (lazy === false || auto === false) {
					// Say everything that is missing at once, so that fixing
					// one does not reveal the other.
					const missing = [lazy === false && 'loading="lazy"', auto === false && 'sizes="auto"'].filter(
						Boolean,
					);
					report({
						scope: el,
						line: sizesAttr!.valueNode?.startLine,
						col: sizesAttr!.valueNode?.startCol,
						raw: sizesAttr!.valueNode?.raw,
						message:
							!img || (missing.length === 1 && lazy === false)
								? 'The "source" element with sizes="auto" requires the following sibling "img" element to have loading="lazy"'
								: `The "source" element with sizes="auto" requires the following sibling "img" element to have ${missing.join(' and ')}`,
					});
				}
			}
		});
	},
});
