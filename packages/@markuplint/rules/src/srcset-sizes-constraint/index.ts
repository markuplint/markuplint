import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';
import { hasSizesAuto, parseSrcset } from './parse-srcset.js';

/**
 * Rule that enforces WHATWG constraints between the `srcset`, `sizes`,
 * `loading`, `media`, and `type` attributes on `<img>` and `<source>`
 * elements.
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
				// Check 6 still applies to a srcset-less `<source>`: it can shadow the
				// following candidates regardless of whether it has its own srcset.
				// (A missing srcset itself is reported by other rules.)
				if (localName === 'source' && isAlwaysMatchingSource(el)) {
					report({ scope: el, message: ALWAYS_MATCHING_SOURCE_MESSAGE });
				}
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

			// Check 6: HTML LS § source — when a `<source>` has a following sibling
			// `<source>` or `<img>` element with a `srcset` attribute specified, it
			// must have a usable `media` and/or `type` attribute, otherwise it
			// "always matches" and shadows the following candidates. (Srcset-less
			// sources are handled above at the early return.)
			if (localName === 'source' && isAlwaysMatchingSource(el)) {
				report({ scope: el, message: ALWAYS_MATCHING_SOURCE_MESSAGE });
			}
		});
	},
});

/** Violation message for Check 6 (an always-matching `<source>`). */
const ALWAYS_MATCHING_SOURCE_MESSAGE =
	'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute';

/**
 * Whether a `media` attribute value is "always matching" per HTML LS, i.e. it
 * does not distinguish the `<source>` from its siblings.
 *
 * A value is always-matching when, after stripping leading and trailing ASCII
 * whitespace, it is the empty string or an ASCII case-insensitive match for the
 * string `"all"`.
 *
 * ASCII whitespace (TAB, LF, FF, CR, SPACE) is stripped explicitly rather than
 * via `String.prototype.trim`, which would also strip non-ASCII whitespace such
 * as NBSP. A media value padded with NBSP around "all" is NOT
 * always-matching per the spec and must keep its distinguishing media query.
 *
 * @param value - The raw `media` attribute value
 * @returns `true` if the value is empty or `"all"` (case-insensitive)
 */
function isAlwaysMatchingMedia(value: string): boolean {
	const normalized = value.replaceAll(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase();
	return normalized === '' || normalized === 'all';
}

/**
 * Whether a `<source>` "always matches" and so shadows the following
 * candidates: it lacks a usable `media`/`type` attribute yet has a following
 * sibling `<source>`/`<img>` with a `srcset` attribute. See HTML LS § the
 * source element.
 *
 * A `type` attribute (any value, including dynamic) satisfies the requirement.
 * A `media` attribute satisfies it only when its value is a non-always-matching
 * media query; a dynamic value is unknown at lint time, so assume it qualifies
 * to avoid false positives.
 *
 * @param el - The `<source>` element to test
 * @returns `true` if the source must be reported as always-matching
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function isAlwaysMatchingSource(el: Element<boolean>): boolean {
	const typeAttr = el.getAttributeNode('type');
	const mediaAttr = el.getAttributeNode('media');
	const hasUsableType = typeAttr != null;
	const hasUsableMedia = mediaAttr != null && (mediaAttr.isDynamicValue || !isAlwaysMatchingMedia(mediaAttr.value));
	return !hasUsableType && !hasUsableMedia && hasFollowingSrcsetSibling(el);
}

/**
 * Whether the element has a following sibling `<source>` or `<img>` element
 * with a `srcset` attribute specified.
 *
 * Per the spec the sibling does not have to be the immediately next sibling.
 *
 * @param el - The starting element to search from
 * @returns `true` if such a following sibling exists
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function hasFollowingSrcsetSibling(el: Element<boolean>): boolean {
	for (const sibling of followingElementSiblings(el)) {
		if (
			(sibling.localName === 'source' || sibling.localName === 'img') &&
			sibling.getAttributeNode('srcset') != null
		) {
			return true;
		}
	}
	return false;
}

/**
 * Find the first following sibling `<img>` element.
 * Per the spec, the img does not have to be the immediately next sibling.
 *
 * @param el - The starting element to search from
 * @returns The first following sibling `<img>` element, or `null` if none found
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function findFollowingImg(el: Element<boolean>): Element<boolean> | null {
	for (const sibling of followingElementSiblings(el)) {
		if (sibling.localName === 'img') {
			return sibling;
		}
	}
	return null;
}

/**
 * Iterate the element's following element siblings in document order.
 *
 * @param el - The element whose following siblings to iterate
 * @yields Each following element sibling, nearest first
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function* followingElementSiblings(el: Element<boolean>): Generator<Element<boolean>> {
	let sibling = el.nextElementSibling;
	while (sibling != null) {
		yield sibling;
		sibling = sibling.nextElementSibling;
	}
}
