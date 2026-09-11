/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult } from './types.js';

import { flattenText, makeResult } from './helpers.js';

/**
 * Implements AccName 1.2 §4.3.2 Step 2B:
 * "If the current node has an `aria-labelledby` attribute that contains
 * at least one valid IDREF, and the current node is not already part of
 * an ongoing `aria-labelledby` traversal, process its IDREFs [...]"
 *
 * **Self-reference handling** (spec-defined, not a custom extension):
 * An element may reference its own ID in `aria-labelledby` to include its
 * own content alongside other referenced elements. This is explicitly
 * permitted by the spec (AccName 1.2 §4.3.2 Example 2):
 *   `<h2 id="h" aria-labelledby="h foo">Meeting</h2>`
 * Infinite recursion is prevented by `inLabelledbyTraversal`, not by the
 * visited set — `computeFn` is called with `inLabelledbyTraversal=true`,
 * which causes `compute.ts` to skip Step 2B on the referenced element.
 *
 * @see https://www.w3.org/TR/accname-1.2/#comp_labelledby_traversal — AccName 1.2 §4.3.2 Step 2B
 */
export function resolveAriaLabelledby(
	el: AccnameElement,
	resolver: AccnameResolver,
	visited: ReadonlySet<string>,
	computeFn: (
		el: AccnameElement,
		resolver: AccnameResolver,
		inLabelledbyTraversal: boolean,
		visited: ReadonlySet<string>,
	) => AccnameResult,
): AccnameResult | null {
	const labelledbyAttr = el.getAttribute('aria-labelledby');
	if (!labelledbyAttr?.trim()) {
		return null;
	}

	const ids = labelledbyAttr.trim().split(/\s+/);
	const parts: string[] = [];
	const newVisited = new Set(visited);

	// Mark the current element as visited to prevent other elements from
	// circling back to it (e.g., A → B → A).
	if (el.id) {
		newVisited.add(el.id);
	}

	for (const id of ids) {
		// Skip IDs already visited — but allow self-references (id === el.id).
		// The spec requires that an element CAN reference itself in
		// aria-labelledby to include its own content alongside other IDs.
		// Example (AccName 1.2 §4.3.2 Example 2):
		//   <h2 id="h" aria-labelledby="h foo">Meeting</h2>
		// Here "h" references itself, contributing "Meeting" to the result.
		//
		// Infinite recursion is prevented not by the visited set, but by
		// inLabelledbyTraversal: computeFn is called with true below,
		// which causes compute.ts to skip Step 2B (aria-labelledby) on
		// the referenced element, so it never re-enters this function.
		if (newVisited.has(id) && id !== el.id) {
			continue;
		}

		const referenced = resolver.getElementById(id);
		if (!referenced) {
			continue;
		}

		// Each branch gets its own visited set so that one IDREF's
		// traversal doesn't block resolution of a later IDREF.
		const innerVisited = new Set([...newVisited, id]);

		const result = computeFn(referenced, resolver, true, innerVisited);
		if (result.name) {
			parts.push(result.name);
		}
	}

	const name = flattenText(parts.join(' '));
	if (name) {
		return makeResult(name, 'aria-labelledby');
	}
	return null;
}

/**
 * Implements AccName 1.2 §4.3.2 Step 2D:
 * "If the current node has an `aria-label` attribute whose value is
 * not undefined, not the empty string, and not a string of whitespace [...]"
 *
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2 Step 2D
 */
export function resolveAriaLabel(el: AccnameElement): AccnameResult | null {
	const label = el.getAttribute('aria-label');
	if (label?.trim()) {
		return makeResult(label, 'aria-label');
	}
	return null;
}
