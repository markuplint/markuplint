/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult, AccnameSource } from './types.js';

import { ELEMENT_NODE, SVG_NAMESPACE, TEXT_NODE, TEXT_LIKE_INPUT_TYPES } from '../../../const/index.js';

export { EMBEDDED_CONTROL_ROLES } from '../../../const/index.js';

export function makeResult(name: string, source: AccnameSource | null): AccnameResult {
	const trimmed = flattenText(name);
	return {
		name: trimmed,
		source: trimmed ? source : null,
	};
}

export function flattenText(text: string): string {
	return text.replaceAll(/\s+/g, ' ').trim();
}

/**
 * Implements AccName 1.2 §4.3.2 Steps 2F and 2C:
 *
 * - **Step 2F**: "If the current node's role allows name from content [...],
 *   return the accumulated text of the current node's descendant nodes."
 * - **Step 2C (Embedded Controls)**: "If the current node is a descendant of
 *   an `aria-labelledby` or `aria-label` reference AND the current node is
 *   an embedded control, return the embedded control's value." Per spec,
 *   `aria-label` is ignored for embedded controls during this traversal.
 *
 * **Limitation:** CSS-generated content (`::before`/`::after` with the `content`
 * property) is not included. AccName 1.2 §4.3.2 Step 2G specifies that CSS
 * generated textual content should be part of the accumulated text, but markuplint
 * performs static HTML analysis without CSS processing, so this content is
 * unavailable at lint time.
 *
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2 Step 2F
 * @see https://www.w3.org/TR/accname-1.2/#comp_embedded_control — AccName 1.2 §4.3.2 Step 2C
 */
export function resolveNameFromContent(
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
): string {
	const parts: string[] = [];
	for (const child of el.childNodes) {
		if (child.nodeType === TEXT_NODE) {
			parts.push(child.textContent ?? '');
		} else if (child.nodeType === ELEMENT_NODE) {
			const childEl = child as AccnameElement;
			if (resolver.isEmbeddedControl(childEl)) {
				// Step 2C: Embedded controls — use value directly, aria-label is ignored
				parts.push(getEmbeddedControlValue(childEl));
			} else {
				const result = computeFn(childEl, resolver, inLabelledbyTraversal, visited);
				if (result.name) {
					parts.push(result.name);
				} else {
					// When name-from-content traversal reaches an element with no accessible name,
					// recursively collect its text content (transparent traversal)
					parts.push(collectTextContent(childEl, resolver, visited, computeFn, inLabelledbyTraversal));
				}
			}
		}
	}
	return parts.join(' ');
}

/**
 * [Implementation-specific extension] Recursively collects text content
 * from an element and its descendants during name-from-content traversal.
 *
 * The AccName spec (§4.3.2 Step 2F) only formally defines name-from-content
 * for elements whose role's `nameFrom` includes `"content"`. However,
 * intermediate wrapper elements (e.g., `<span>` inside `<button>`) may
 * have roles that do NOT include `nameFrom: ["content"]`, yet their text
 * must still be collected for the parent's name computation to work.
 *
 * This function provides that "transparent traversal": when `computeFn`
 * returns no name for a child element, this function recursively collects
 * the child's text content regardless of its role settings.
 *
 * Hidden elements (per `resolver.isHidden`) are excluded.
 */
function collectTextContent(
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
): string {
	if (resolver.isHidden(el)) {
		return '';
	}
	const parts: string[] = [];
	for (const child of el.childNodes) {
		if (child.nodeType === TEXT_NODE) {
			parts.push(child.textContent ?? '');
		} else if (child.nodeType === ELEMENT_NODE) {
			const childEl = child as AccnameElement;
			if (resolver.isEmbeddedControl(childEl)) {
				parts.push(getEmbeddedControlValue(childEl));
			} else {
				const result = computeFn(childEl, resolver, inLabelledbyTraversal, visited);
				if (result.name) {
					parts.push(result.name);
				} else {
					parts.push(collectTextContent(childEl, resolver, visited, computeFn, inLabelledbyTraversal));
				}
			}
		}
	}
	return parts.join(' ');
}

/**
 * Implements AccName 1.2 §4.3.2 Step 2C embedded control value resolution:
 * - **Range controls** (slider/spinbutton/input[range]):
 *   aria-valuetext → aria-valuenow → value attr → textContent
 * - **Textbox/combobox/searchbox** (input[text-like]/textarea):
 *   value attr → textContent
 * - **Listbox** (select): selected option text (static analysis approximation)
 *
 * @see https://www.w3.org/TR/accname-1.2/#comp_embedded_control — AccName 1.2 §4.3.2 Step 2C
 */
function getEmbeddedControlValue(el: AccnameElement): string {
	const role = el.getAttribute('role')?.trim().split(/\s+/)[0];

	// Range controls: slider, spinbutton, input[type=range]
	if (role === 'slider' || role === 'spinbutton' || (el.localName === 'input' && getInputType(el) === 'range')) {
		const valuetext = el.getAttribute('aria-valuetext');
		if (valuetext?.trim()) {
			return valuetext;
		}
		const valuenow = el.getAttribute('aria-valuenow');
		if (valuenow?.trim()) {
			return valuenow;
		}
		const value = el.getAttribute('value');
		if (value?.trim()) {
			return value;
		}
		return el.textContent ?? '';
	}

	// Textbox/combobox: value attr -> textContent
	if (
		role === 'textbox' ||
		role === 'combobox' ||
		role === 'searchbox' ||
		el.localName === 'textarea' ||
		(el.localName === 'input' && isTextLikeInput(el))
	) {
		const value = el.getAttribute('value');
		if (value != null) {
			return value;
		}
		return el.textContent ?? '';
	}

	// Listbox/select: selected option text
	if (el.localName === 'select') {
		return getSelectedOptionText(el);
	}
	return el.textContent ?? '';
}

/**
 * Gets the text content of the selected `<option>` elements within a `<select>`.
 *
 * AccName 1.2 §4.3.2 Step 2C specifies that a listbox should return the
 * text of the **selected** option(s). Since this is static analysis, we
 * approximate by checking the `selected` attribute on `<option>` elements.
 * If no option has `selected`, the first non-disabled option is used
 * (matching the HTML spec's default selection behavior for non-`multiple` selects).
 *
 * For `<select multiple>` with multiple `selected` options, texts are
 * joined with a space separator.
 *
 * **Future work (#2069 — customizable `<select>` / `<selectedcontent>`):**
 *
 * When customizable `<select>` is supported:
 * 1. `collectOptions` must skip non-`<option>` children that the new content
 *    model allows (e.g., `<button>`, `<datalist>`, `<selectedcontent>`, `<div>`).
 * 2. Consider whether `<selectedcontent>` (which clones the selected option's
 *    content into the button area) affects name computation, or whether we
 *    should continue to resolve from `<option>` elements directly.
 * 3. Parse5 must support the new `<select>` content model first.
 *
 * @see https://github.com/markuplint/markuplint/issues/2069 — `<select>` and `<selectedcontent>` support
 */
function getSelectedOptionText(el: AccnameElement): string {
	const options = collectOptions(el);
	const selected = options.filter(opt => opt.hasAttribute('selected'));

	if (selected.length > 0) {
		return selected.map(opt => opt.textContent?.trim() ?? '').join(' ');
	}

	// No explicit selected attr: HTML spec says first non-disabled option is selected
	// (only for non-multiple selects, but we approximate for all)
	const first = options.find(opt => !opt.hasAttribute('disabled'));
	return first?.textContent?.trim() ?? '';
}

/**
 * **Note (#2069):** Customizable `<select>` allows non-option children
 * (e.g., `<button>`, `<datalist>`, `<div>`). This function currently only
 * recognizes `<option>` and `<optgroup>` — it will need updating when the
 * new content model is supported.
 *
 * @see https://github.com/markuplint/markuplint/issues/2069
 */
function collectOptions(el: AccnameElement): AccnameElement[] {
	const result: AccnameElement[] = [];
	for (const child of el.children) {
		if (child.localName === 'option') {
			result.push(child);
		} else if (child.localName === 'optgroup') {
			for (const grandchild of child.children) {
				if (grandchild.localName === 'option') {
					result.push(grandchild);
				}
			}
		}
	}
	return result;
}

function isTextLikeInput(el: AccnameElement): boolean {
	return TEXT_LIKE_INPUT_TYPES.has(getInputType(el));
}

export function findChildByLocalName(el: AccnameElement, localName: string): AccnameElement | null {
	for (const child of el.children) {
		if (child.localName === localName) {
			return child;
		}
	}
	return null;
}

export function findAncestorLabel(el: AccnameElement): AccnameElement | null {
	let current = el.parentElement;
	while (current) {
		if (current.localName === 'label') {
			return current;
		}
		current = current.parentElement;
	}
	return null;
}

export function resolveLabel(el: AccnameElement, resolver: AccnameResolver): readonly AccnameElement[] {
	const id = el.id;
	if (id) {
		const explicitLabels = resolver.getLabelsForId(id);
		if (explicitLabels.length > 0) {
			return explicitLabels;
		}
	}
	const implicitLabel = findAncestorLabel(el);
	if (implicitLabel) {
		return [implicitLabel];
	}
	return [];
}

export function getInputType(el: AccnameElement): string {
	if (el.localName !== 'input') {
		return '';
	}
	return (el.getAttribute('type') ?? 'text').toLowerCase();
}

export function isSvgElement(el: AccnameElement): boolean {
	return el.namespaceURI === SVG_NAMESPACE;
}

/**
 * Escapes a string for safe use inside a CSS selector.
 *
 * @param value - The raw string value (typically an element ID)
 * @returns The escaped string with CSS special characters backslash-escaped
 */
export function escapeCSS(value: string): string {
	return value.replaceAll(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}
