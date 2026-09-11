/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult } from './types.js';

import { resolveAriaLabel, resolveAriaLabelledby } from './aria-steps.js';
import { getElementSpecificName } from './element-names.js';
import { makeResult, resolveNameFromContent } from './helpers.js';

const EMPTY_RESULT: AccnameResult = { name: '', source: null };

/**
 * Computes the accessible name for an element.
 *
 * Implements the Accessible Name and Description Computation algorithm
 * per AccName 1.2 §4.3.2 ("Computation Steps") and HTML-AAM §4.1
 * ("Accessible Name and Description Computation").
 *
 * Control flow (Steps map to AccName 1.2 §4.3.2):
 *
 * 1. **Step 2A — Hidden check** — If the element is hidden (per `isHidden`) and NOT
 *    referenced by `aria-labelledby`, return empty immediately.
 * 2. **Pre-computed name** — (Implementation-specific extension) If the
 *    resolver provides `getPrecomputedName`, check it before standard steps.
 *    Used by ml-core's Pretender integration for framework components.
 * 3. **Step 2B — `aria-labelledby`** — Resolve referenced elements and
 *    recursively compute their names. Skipped when already inside a
 *    labelledby traversal (`inLabelledbyTraversal`) to prevent re-entry.
 * 4. **Step 2D — `aria-label`** — Use the `aria-label` attribute value.
 * 5. **Step 2E — Element-specific name** — Dispatch to HTML-AAM §4.1
 *    element-specific rules (label association, alt, value, legend, caption, SVG title).
 * 6. **Step 2F — Name from content** — If the element's role allows
 *    `nameFrom: ["content"]`, or the element is referenced by `aria-labelledby`
 *    (`inLabelledbyTraversal`), recursively collect child text (including
 *    embedded control values per Step 2C).
 * 7. **Step 2I — Title fallback** — Use the `title` attribute value.
 *
 * @param el - The element to compute the accessible name for
 * @param resolver - Environment-dependent resolver for DOM traversal and role queries
 * @returns The computed name and its source
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2
 * @see https://www.w3.org/TR/html-aam-1.0/#accessible-name-and-description-computation — HTML-AAM §4.1
 */
export function computeAccessibleName(el: AccnameElement, resolver: AccnameResolver): AccnameResult {
	return computeAccessibleNameInternal(el, resolver, false, new Set());
}

/**
 * @param inLabelledbyTraversal - When true, Step 2B is skipped to prevent re-entry
 *   into `resolveAriaLabelledby`, and Step 2F name-from-content is enabled regardless
 *   of role. This is set by Step 2B when processing each IDREF.
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2
 */
export function computeAccessibleNameInternal(
	el: AccnameElement,
	resolver: AccnameResolver,
	inLabelledbyTraversal: boolean,
	visited: ReadonlySet<string>,
): AccnameResult {
	// AccName 1.2 §4.3.2 Step 2A: Hidden elements return empty unless referenced by aria-labelledby
	if (!inLabelledbyTraversal && resolver.isHidden(el)) {
		return EMPTY_RESULT;
	}

	// [Implementation-specific] Pre-computed name (e.g., Pretender integration) — checked after hidden check
	if (resolver.getPrecomputedName) {
		const precomputed = resolver.getPrecomputedName(el);
		if (precomputed != null) {
			return makeResult(precomputed, 'content');
		}
	}

	// AccName 1.2 §4.3.2 Step 2B: aria-labelledby (skipped when inside labelledby traversal)
	if (!inLabelledbyTraversal) {
		const labelledbyResult = resolveAriaLabelledby(el, resolver, visited, computeAccessibleNameInternal);
		if (labelledbyResult) {
			return labelledbyResult;
		}
	}

	// AccName 1.2 §4.3.2 Step 2D: aria-label
	const ariaLabelResult = resolveAriaLabel(el);
	if (ariaLabelResult) {
		return ariaLabelResult;
	}

	// AccName 1.2 §4.3.2 Step 2E: Element-specific name (HTML-AAM §4.1)
	const elementResult = getElementSpecificName(
		el,
		resolver,
		visited,
		computeAccessibleNameInternal,
		inLabelledbyTraversal,
	);
	if (elementResult) {
		return elementResult;
	}

	// AccName 1.2 §4.3.2 Step 2F/2C: Name from content
	// Applies when the role allows nameFrom: ["content"] OR when the element is
	// directly referenced by aria-labelledby (inLabelledbyTraversal).
	if (resolver.allowsNameFromContent(el) || inLabelledbyTraversal) {
		const content = resolveNameFromContent(
			el,
			resolver,
			visited,
			computeAccessibleNameInternal,
			inLabelledbyTraversal,
		);
		if (content.trim()) {
			return makeResult(content, 'content');
		}
	}

	// AccName 1.2 §4.3.2 Step 2I: Title attribute fallback
	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return EMPTY_RESULT;
}
