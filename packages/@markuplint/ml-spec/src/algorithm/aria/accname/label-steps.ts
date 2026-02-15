/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult } from './types.js';

import { ELEMENT_NODE, TEXT_NODE } from '../../../const/index.js';
import { flattenText, makeResult, resolveLabel } from './helpers.js';

/**
 * Resolves accessible name from `<label>` element association.
 *
 * Part of AccName 1.2 §4.3.2 Step 2E — for labelable elements, checks
 * the HTML label association before other element-specific rules.
 *
 * Control flow:
 * 1. Find labels via `resolveLabel`: explicit `<label for="id">` first,
 *    then implicit ancestor `<label>`.
 * 2. For each label, collect its text content via `collectLabelText`,
 *    which walks the label's children but **excludes** the labeled
 *    element itself (prevents circular inclusion).
 * 3. Join all label texts with a space separator and flatten whitespace.
 *
 * @param el - The labelable element to resolve label text for
 * @param resolver - Environment-dependent resolver for label lookups
 * @param visited - Set of element IDs already visited (cycle prevention)
 * @param computeFn - The recursive accessible name computation function
 * @param inLabelledbyTraversal - Whether this computation is part of an aria-labelledby traversal
 * @returns The resolved name result, or null if no label provides a name
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2 Step 2E
 * @see https://www.w3.org/TR/html-aam-1.0/#el-input-text — HTML-AAM label association
 */
export function resolveLabelText(
	el: AccnameElement,
	resolver: AccnameResolver,
	visited: ReadonlySet<string>,
	computeFn: (
		el: AccnameElement,
		resolver: AccnameResolver,
		inLabelledbyTraversal: boolean,
		visited: ReadonlySet<string>,
	) => AccnameResult,
	inLabelledbyTraversal: boolean,
): AccnameResult | null {
	const labels = resolveLabel(el, resolver);
	if (labels.length === 0) {
		return null;
	}

	const parts: string[] = [];
	for (const label of labels) {
		const text = collectLabelText(label, el, resolver, visited, computeFn, inLabelledbyTraversal);
		if (text) {
			parts.push(text);
		}
	}

	const name = flattenText(parts.join(' '));
	if (name) {
		return makeResult(name, 'label');
	}
	return null;
}

/**
 * Collects text from a label element, excluding the labeled element itself.
 * Parts are joined with a space separator, matching the AccName 1.2
 * concatenation behavior for label text.
 */
function collectLabelText(
	label: AccnameElement,
	labeledElement: AccnameElement,
	resolver: AccnameResolver,
	visited: ReadonlySet<string>,
	computeFn: (
		el: AccnameElement,
		resolver: AccnameResolver,
		inLabelledbyTraversal: boolean,
		visited: ReadonlySet<string>,
	) => AccnameResult,
	inLabelledbyTraversal: boolean,
): string {
	const parts: string[] = [];
	for (const child of label.childNodes) {
		if (child.nodeType === TEXT_NODE) {
			parts.push(child.textContent ?? '');
		} else if (child.nodeType === ELEMENT_NODE) {
			const childEl = child as AccnameElement;
			if (childEl === labeledElement) {
				continue;
			}
			const result = computeFn(childEl, resolver, inLabelledbyTraversal, visited);
			parts.push(result.name);
		}
	}
	return parts.join(' ');
}
