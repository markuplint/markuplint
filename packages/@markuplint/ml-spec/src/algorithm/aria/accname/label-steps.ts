/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult } from './types.js';

import { ELEMENT_NODE, TEXT_NODE } from '../../../const/index.js';
import { flattenText, makeResult, resolveLabel } from './helpers.js';

/**
 * Part of AccName 1.2 §4.3.2 Step 2E — for labelable elements, the HTML label
 * association is checked before other element-specific rules.
 *
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
 * Excludes the labeled element itself to prevent circular inclusion. Parts are
 * joined with a space separator, matching the AccName 1.2 concatenation
 * behavior for label text.
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
			if (result.name) {
				parts.push(result.name);
			} else {
				// Transparent traversal: when the child element has no accessible name
				// (e.g., <span> with role="generic"), recursively collect its descendant text.
				// This matches the behavior of resolveNameFromContent's fallback.
				parts.push(
					collectLabelText(childEl, labeledElement, resolver, visited, computeFn, inLabelledbyTraversal),
				);
			}
		}
	}
	return parts.join(' ');
}
