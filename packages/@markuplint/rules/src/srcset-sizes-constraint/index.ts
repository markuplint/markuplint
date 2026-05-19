import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';
import { hasSizesAuto, parseSrcset } from './parse-srcset.js';

/**
 * Rule that enforces WHATWG constraints between the `srcset`, `sizes`,
 * and `loading` attributes on `<img>` and `<source>` elements.
 */
export default createRule<boolean>({
	meta: meta,
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
			const sizesValue = sizesAttr?.value ?? null;
			const sizesIsDynamic = sizesAttr?.isDynamicValue;

			// Parse srcset unless dynamic
			const parsed = srcsetIsDynamic ? null : parseSrcset(srcsetAttr.value);

			// Check 2: width and density descriptors must not be mixed
			if (parsed && parsed.hasWidth && (parsed.hasDensity || parsed.hasImplied)) {
				report({
					scope: el,
					line: srcsetAttr.valueNode?.startLine,
					col: srcsetAttr.valueNode?.startCol,
					raw: srcsetAttr.valueNode?.raw,
					message: 'The "srcset" attribute must not mix width and pixel density descriptors',
				});
			}

			// Check 1: sizes present → srcset must use width descriptors
			if (sizesAttr && !sizesIsDynamic && parsed && !parsed.hasWidth) {
				report({
					scope: el,
					line: srcsetAttr.valueNode?.startLine,
					col: srcsetAttr.valueNode?.startCol,
					raw: srcsetAttr.valueNode?.raw,
					message: 'The "srcset" attribute requires width descriptors when the "sizes" attribute is present',
				});
			}

			// Check 3: img[sizes=auto] → loading=lazy required
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

			// Check 4: source[sizes=auto] → following sibling img must have loading=lazy
			if (localName === 'source' && sizesValue != null && !sizesIsDynamic && hasSizesAuto(sizesValue)) {
				const img = findFollowingImg(el);
				if (!img || img.getAttribute('loading') !== 'lazy') {
					report({
						scope: el,
						line: sizesAttr!.valueNode?.startLine,
						col: sizesAttr!.valueNode?.startCol,
						raw: sizesAttr!.valueNode?.raw,
						message:
							'The "source" element with sizes="auto" requires the following sibling "img" element to have loading="lazy"',
					});
				}
			}

			// Check 5: img / source-in-picture with w descriptors → sizes required.
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

/**
 * Find the first following sibling `<img>` element.
 * Per the spec, the img does not have to be the immediately next sibling.
 *
 * @param el - The starting element to search from
 * @returns The first following sibling `<img>` element, or `null` if none found
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function findFollowingImg(el: Element<boolean>): Element<boolean> | null {
	let sibling = el.nextElementSibling;
	while (sibling != null) {
		if (sibling.localName === 'img') {
			return sibling;
		}
		sibling = sibling.nextElementSibling;
	}
	return null;
}
