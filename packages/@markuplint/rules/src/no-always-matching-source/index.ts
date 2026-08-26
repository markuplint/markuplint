import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import { followingElementSiblings } from '../srcset-sizes-constraint/sibling-helpers.js';

import meta from './meta.js';

/** Violation message for an always-matching `<source>`. */
const ALWAYS_MATCHING_SOURCE_MESSAGE =
	'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute';

/**
 * HTML LS § the source element: when a `<source>` has a following sibling
 * `<source>` or `<img>` element with a `srcset` attribute specified, it must
 * have a usable `media` and/or `type` attribute, otherwise it "always
 * matches" and shadows the following candidates. Split out of the former
 * `srcset-sizes-constraint` rule's Check 6.
 *
 * Whether the current `<source>` itself has a `srcset` is irrelevant — the
 * requirement is about distinguishing it from what follows, not about its
 * own candidates.
 */
export default createRule<boolean>({
	meta,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'source') {
				return;
			}

			// source is only relevant inside <picture>
			if (el.parentElement?.localName !== 'picture') {
				return;
			}

			// Skip if element has spread attributes (dynamic props)
			if (el.hasSpreadAttr) {
				return;
			}

			if (isAlwaysMatchingSource(el)) {
				report({ scope: el, message: ALWAYS_MATCHING_SOURCE_MESSAGE });
			}
		});
	},
});

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
function isAlwaysMatchingSource(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean>,
): boolean {
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
function hasFollowingSrcsetSibling(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean>,
): boolean {
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
