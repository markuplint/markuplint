/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameResolver, AccnameResult } from './types.js';

import {
	DEFAULT_IMAGE_LABEL,
	DEFAULT_RESET_LABEL,
	DEFAULT_SUBMIT_LABEL,
	TEXT_INPUT_TYPES,
} from '../../../const/index.js';
import { findChildByLocalName, getInputType, isSvgElement, makeResult, resolveNameFromContent } from './helpers.js';
import { resolveLabelText } from './label-steps.js';

/**
 * Implements AccName 1.2 §4.3.2 Step 2E: for elements that have a native
 * host language text alternative, use that alternative. The specific rules
 * for each HTML element are defined in HTML-AAM §4.1.
 *
 * Returns null if no element-specific rule applies, letting the caller
 * fall through to name-from-content (Step 2F) or title fallback (Step 2I).
 *
 * @see https://www.w3.org/TR/accname-1.2/#computation-steps — AccName 1.2 §4.3.2 Step 2E
 * @see https://www.w3.org/TR/html-aam-1.0/#accessible-name-and-description-computation — HTML-AAM §4.1
 */
export function getElementSpecificName(
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
	if (isSvgElement(el)) {
		return handleSvgElement(el);
	}

	const { localName } = el;

	switch (localName) {
		case 'input': {
			return handleInput(el, resolver, visited, computeFn, inLabelledbyTraversal);
		}
		case 'textarea':
		case 'select':
		case 'meter':
		case 'progress':
		case 'output': {
			return handleLabelableWithTitle(el, resolver, visited, computeFn, inLabelledbyTraversal);
		}
		case 'button': {
			return handleButton(el, resolver, visited, computeFn, inLabelledbyTraversal);
		}
		case 'fieldset': {
			return handleFieldset(el, resolver, visited, computeFn, inLabelledbyTraversal);
		}
		case 'table': {
			return handleTable(el, resolver, visited, computeFn, inLabelledbyTraversal);
		}
		case 'img': {
			return handleImg(el);
		}
		case 'area': {
			return handleArea(el);
		}
		case 'figure': {
			return handleFigure(el);
		}
		case 'summary': {
			return handleSummary(el, resolver, visited, computeFn, inLabelledbyTraversal);
		}
		case 'a': {
			if (el.hasAttribute('href')) {
				return handleAnchor(el, resolver, visited, computeFn, inLabelledbyTraversal);
			}
			return null;
		}
		case 'iframe': {
			return handleTitleOnly(el);
		}
		default: {
			// All other elements (tr, td, th, section, div, span, p, h1-h6, etc.)
			// only get name from title (handled by caller's title fallback)
			return null;
		}
	}
}

/**
 * HTML-AAM §4.1 (input[text-like], textarea, select, meter, progress, output).
 * Name sources: label → title → placeholder.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-input-text
 */
function handleLabelableWithTitle(
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
	const labelResult = resolveLabelText(el, resolver, visited, computeFn, inLabelledbyTraversal);
	if (labelResult) {
		return labelResult;
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	const placeholder = el.getAttribute('placeholder');
	if (placeholder?.trim()) {
		return makeResult(placeholder, 'placeholder');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (input — dispatches by type).
 * Text-like types: label → title → placeholder.
 * Button/submit/reset: label → value → default label.
 * Image: label → alt → title → default label.
 * Hidden: always empty.
 * Checkbox/radio: label → title.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-input-text
 */
function handleInput(
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
	const type = getInputType(el);

	if (TEXT_INPUT_TYPES.has(type)) {
		return handleLabelableWithTitle(el, resolver, visited, computeFn, inLabelledbyTraversal);
	}

	if (type === 'button' || type === 'submit' || type === 'reset') {
		return handleInputButton(el, type, resolver, visited, computeFn, inLabelledbyTraversal);
	}

	if (type === 'image') {
		return handleInputImage(el, resolver, visited, computeFn, inLabelledbyTraversal);
	}

	if (type === 'hidden') {
		return makeResult('', null);
	}

	// checkbox, radio: label -> title
	return handleLabelableWithTitle(el, resolver, visited, computeFn, inLabelledbyTraversal);
}

/**
 * HTML-AAM §4.1 (input[type=button/submit/reset]).
 * Name sources: label → value → title → default label (submit="Submit", reset="Reset").
 * @see https://www.w3.org/TR/html-aam-1.0/#el-input-button
 */
function handleInputButton(
	el: AccnameElement,
	type: string,
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
	const labelResult = resolveLabelText(el, resolver, visited, computeFn, inLabelledbyTraversal);
	if (labelResult) {
		return labelResult;
	}

	const value = el.getAttribute('value');
	if (value?.trim()) {
		return makeResult(value, 'value');
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	// Default label for submit/reset buttons
	if (type === 'submit') {
		return makeResult(DEFAULT_SUBMIT_LABEL, 'default');
	}
	if (type === 'reset') {
		return makeResult(DEFAULT_RESET_LABEL, 'default');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (input[type=image]).
 * Name sources: label → alt → title → default ("Submit Query").
 * @see https://www.w3.org/TR/html-aam-1.0/#el-input-image
 */
function handleInputImage(
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
	const labelResult = resolveLabelText(el, resolver, visited, computeFn, inLabelledbyTraversal);
	if (labelResult) {
		return labelResult;
	}

	const alt = el.getAttribute('alt');
	if (alt?.trim()) {
		return makeResult(alt, 'alt');
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return makeResult(DEFAULT_IMAGE_LABEL, 'default');
}

/**
 * HTML-AAM §4.1 (button).
 * Name sources: label → content → title.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-button
 */
function handleButton(
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
	const labelResult = resolveLabelText(el, resolver, visited, computeFn, inLabelledbyTraversal);
	if (labelResult) {
		return labelResult;
	}

	const content = resolveNameFromContent(el, resolver, visited, computeFn, inLabelledbyTraversal);
	if (content.trim()) {
		return makeResult(content, 'content');
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (fieldset).
 * Name sources: legend (content) → title.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-fieldset
 */
function handleFieldset(
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
	const legend = findChildByLocalName(el, 'legend');
	if (legend) {
		const content = resolveNameFromContent(legend, resolver, visited, computeFn, inLabelledbyTraversal);
		if (content.trim()) {
			return makeResult(content, 'legend');
		}
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (table).
 * Name sources: caption (content) → title.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-table
 */
function handleTable(
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
	const caption = findChildByLocalName(el, 'caption');
	if (caption) {
		const content = resolveNameFromContent(caption, resolver, visited, computeFn, inLabelledbyTraversal);
		if (content.trim()) {
			return makeResult(content, 'caption');
		}
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (img).
 * Name sources: alt → title (only when alt is not specified).
 * When alt="" (empty), returns empty name with null source (decorative image).
 * @see https://www.w3.org/TR/html-aam-1.0/#el-img
 */
function handleImg(el: AccnameElement): AccnameResult | null {
	if (el.hasAttribute('alt')) {
		const alt = el.getAttribute('alt') ?? '';
		return makeResult(alt, alt.trim() ? 'alt' : null);
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (area).
 * Name sources: alt → title.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-area
 */
function handleArea(el: AccnameElement): AccnameResult | null {
	const alt = el.getAttribute('alt');
	if (alt?.trim()) {
		return makeResult(alt, 'alt');
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (figure).
 * Name sources: title only. Note: figcaption provides the accessible
 * *description*, not the name, per HTML-AAM.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-figure
 */
function handleFigure(el: AccnameElement): AccnameResult | null {
	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (summary).
 * Name sources: content → title.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-summary
 */
function handleSummary(
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
	const content = resolveNameFromContent(el, resolver, visited, computeFn, inLabelledbyTraversal);
	if (content.trim()) {
		return makeResult(content, 'content');
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (a[href]).
 * Name sources: content → title.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-a
 */
function handleAnchor(
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
	const content = resolveNameFromContent(el, resolver, visited, computeFn, inLabelledbyTraversal);
	if (content.trim()) {
		return makeResult(content, 'content');
	}

	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * HTML-AAM §4.1 (iframe) — name from title attribute only.
 * @see https://www.w3.org/TR/html-aam-1.0/#el-iframe
 */
function handleTitleOnly(el: AccnameElement): AccnameResult | null {
	const title = el.getAttribute('title');
	if (title?.trim()) {
		return makeResult(title, 'title');
	}

	return null;
}

/**
 * SVG-AAM: SVG elements get name from `<title>` child element.
 * @see https://www.w3.org/TR/svg-aam-1.0/#mapping_additional_nd — SVG-AAM §8.1
 */
function handleSvgElement(el: AccnameElement): AccnameResult | null {
	const titleEl = findChildByLocalName(el, 'title');
	if (titleEl?.textContent?.trim()) {
		return makeResult(titleEl.textContent, 'svg-title');
	}

	return null;
}
