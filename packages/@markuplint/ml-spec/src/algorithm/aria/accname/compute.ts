/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult } from './types.js';

import { computeReferenced, resolveAriaLabel, resolveAriaLabelledby } from './aria-steps.js';
import { getElementSpecificName } from './element-names.js';
import { resolveNameFromContent } from './helpers.js';
import { makeResult } from './result.js';

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
 * 1. **Step 2A — Hidden check** — If the element is hidden (per `isHidden`), return
 *    empty immediately, unless it is in an `aria-labelledby` traversal whose
 *    directly referenced node is hidden.
 * 2. **Pre-computed name** — (Implementation-specific extension) If the
 *    resolver provides `getPrecomputedName`, check it before standard steps.
 *    Used by ml-core's Pretender integration for framework components.
 * 3. **Step 2B — `aria-labelledby`** — Resolve referenced elements and
 *    recursively compute their names. Skipped when already inside a
 *    labelledby traversal (`inLabelledbyTraversal`) to prevent re-entry.
 * 4. **Step 2D — `aria-label`** — Use the `aria-label` attribute value.
 * 5. **Step 2E — Element-specific name** — Dispatch to HTML-AAM §4.1
 *    element-specific rules (label association, alt, value, legend, caption, SVG title),
 *    skipped for an element the resolver reports as exposed as presentational
 *    (`isExposedAsPresentational`).
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
 * Computes the text alternative of an element as a node referenced by
 * `aria-labelledby` or `aria-describedby` (the LabelledBy Traversal of Step 2B,
 * which the description computation also uses).
 *
 * @param el - The referenced element
 * @param resolver - Environment-dependent resolver for DOM traversal and role queries
 * @returns The computed text alternative and its source
 * @see https://w3c.github.io/accname/#comp_labelledby_traversal
 */
export function computeReferencedTextAlternative(el: AccnameElement, resolver: AccnameResolver): AccnameResult {
	return computeReferenced(el, resolver, new Set(el.id ? [el.id] : []), computeAccessibleNameInternal);
}

/**
 * Computes the host language text alternative of an element (AccName §4.3.2
 * Step 2E, HTML-AAM §4.1), such as the `alt` of an image or the `title` of an
 * SVG element, whether or not the element is exposed as presentational.
 *
 * Tells what an explicit `none` or `presentation` role drops from the name:
 * every source the HTML-AAM rules of Step 2E give (`label`, `alt`, `value`,
 * `placeholder`, `legend`, `caption`, `svg-title`, and the `default` label of a
 * submit, reset or image button). The sources that Step 2E shares with other
 * steps (`content`, the `title` attribute) are not dropped by the role, and give
 * `null`.
 *
 * @param el - The element
 * @param resolver - Environment-dependent resolver for DOM traversal and role queries
 * @returns The text alternative and its source, or `null` if the element has none
 * @see https://w3c.github.io/accname/#comp_host_language_label
 */
export function computeHostLanguageLabel(el: AccnameElement, resolver: AccnameResolver): AccnameResult | null {
	const result = getElementSpecificName(el, resolver, new Set(), computeAccessibleNameInternal, false);
	if (!result?.source || result.source === 'content' || result.source === 'title') {
		return null;
	}
	return result;
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
	// AccName 1.2 §4.3.2 Step 2A: Hidden elements return empty. In an aria-labelledby
	// traversal whose referenced node is hidden, `computeReferenced` passes a
	// resolver that finds nothing hidden.
	const hidden = resolver.isHidden(el);
	resolver.onVisit?.(el, { hidden, embeddedControl: false, inLabelledbyTraversal });
	if (hidden) {
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

	// AccName 1.2 §4.3.2 Step 2E: Element-specific name (HTML-AAM §4.1),
	// "unless the current node is exposed as presentational"
	const elementResult = resolver.isExposedAsPresentational?.(el)
		? null
		: getElementSpecificName(el, resolver, visited, computeAccessibleNameInternal, inLabelledbyTraversal);
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
