/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult } from './types.js';

import { flattenText, makeResult } from './helpers.js';

/**
 * Resolves accessible name via `aria-labelledby` attribute.
 *
 * Implements AccName 1.2 §4.3.2 Step 2B:
 * "If the current node has an `aria-labelledby` attribute that contains
 * at least one valid IDREF, and the current node is not already part of
 * an ongoing `aria-labelledby` traversal, process its IDREFs [...]"
 *
 * Control flow:
 * 1. Read `aria-labelledby` attribute; return null if absent or empty.
 * 2. Split the attribute value by whitespace into IDREF tokens.
 * 3. Mark the current element's ID as visited (cycle prevention for A→B→A).
 * 4. For each IDREF:
 *    a. Skip if already visited — **except** self-references (see below).
 *    b. Resolve the referenced element via `resolver.getElementById`.
 *    c. Recursively compute the referenced element's name with
 *       `inLabelledbyTraversal=true` (prevents Step 2B re-entry in `compute.ts`).
 *    d. Each IDREF branch gets its own copy of the visited set so that
 *       one branch's traversal does not block later branches.
 * 5. Join all resolved parts with a space separator and flatten whitespace.
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
 * @param el - The element with a potential aria-labelledby attribute
 * @param resolver - Environment-dependent resolver for element lookups
 * @param visited - Set of element IDs already visited (cycle prevention)
 * @param computeFn - The recursive accessible name computation function
 * @returns The resolved name result, or null if aria-labelledby is not present or yields no name
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
 * Resolves accessible name via `aria-label` attribute.
 *
 * Implements AccName 1.2 §4.3.2 Step 2D:
 * "If the current node has an `aria-label` attribute whose value is
 * not undefined, not the empty string, and not a string of whitespace [...]"
 *
 * @param el - The element with a potential aria-label attribute
 * @returns The resolved name result, or null if aria-label is not present or empty
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2 Step 2D
 */
export function resolveAriaLabel(el: AccnameElement): AccnameResult | null {
	const label = el.getAttribute('aria-label');
	if (label?.trim()) {
		return makeResult(label, 'aria-label');
	}
	return null;
}
