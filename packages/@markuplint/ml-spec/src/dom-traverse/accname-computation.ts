// @ts-ignore
import { computeAccessibleName } from 'dom-accessibility-api';

export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): string {
	// Check if element is hidden from accessibility tree
	if (isHiddenFromAccessibility(el)) {
		return '';
	}

	// HTML-AAM §4.1: Elements with explicit ARIA roles should use the accname library
	// for complete computation as they may have complex ARIA relationships
	if (el.hasAttribute('role')) {
		return computeAccessibleName(el);
	}

	// For elements without explicit roles, follow HTML-AAM pattern:
	// 1. Check aria-labelledby first
	// 2. Check aria-label second  
	// 3. Element-specific computation third
	// 4. title attribute as final fallback (for most elements)

	// Step 1: aria-labelledby
	if (el.hasAttribute('aria-labelledby')) {
		const result = computeAccessibleName(el);
		if (result.trim()) {
			return result.trim();
		}
	}

	// Step 2: aria-label
	if (el.hasAttribute('aria-label')) {
		const label = el.getAttribute('aria-label');
		if (label && label.trim()) {
			return label.trim();
		}
	}

	// Step 3: Element-specific accessible name computation based on HTML-AAM §4.1
	return getHtmlAamElementSpecificAccessibleName(el);
}

function getHtmlAamElementSpecificAccessibleName(el: Element): string {
	const tagName = el.tagName.toLowerCase();
	const inputType = (el as HTMLInputElement).type?.toLowerCase();

	// HTML-AAM §4.1.1: input type="text", input type="password", etc. and textarea Elements
	if (tagName === 'input' && ['text', 'password', 'number', 'search', 'tel', 'email', 'url'].includes(inputType)) {
		return getInputTextTypeAccessibleName(el as HTMLInputElement);
	}
	if (tagName === 'textarea') {
		return getTextareaAccessibleName(el as HTMLTextAreaElement);
	}

	// HTML-AAM §4.1.2: input type="button", input type="submit" and input type="reset" Elements
	if (tagName === 'input' && ['button', 'submit', 'reset'].includes(inputType)) {
		return getInputButtonTypeAccessibleName(el as HTMLInputElement);
	}

	// HTML-AAM §4.1.3: input type="image" Element
	if (tagName === 'input' && inputType === 'image') {
		return getInputImageTypeAccessibleName(el as HTMLInputElement);
	}

	// HTML-AAM §4.1.4: button Element
	if (tagName === 'button') {
		return getButtonAccessibleName(el);
	}

	// HTML-AAM §4.1.5: fieldset Element
	if (tagName === 'fieldset') {
		return getFieldsetAccessibleName(el);
	}

	// HTML-AAM §4.1.6: output Element
	if (tagName === 'output') {
		return getOutputAccessibleName(el);
	}

	// HTML-AAM §4.1.7: Other Form Elements (select, progress, meter)
	if (['select', 'progress', 'meter'].includes(tagName)) {
		return getOtherFormElementAccessibleName(el);
	}

	// HTML-AAM §4.1.8: summary Element
	if (tagName === 'summary') {
		return getSummaryAccessibleName(el);
	}

	// HTML-AAM §4.1.9: figure Element
	if (tagName === 'figure') {
		return getFigureAccessibleName(el);
	}

	// HTML-AAM §4.1.10: img Element
	if (tagName === 'img') {
		return getImgAccessibleName(el);
	}

	// HTML-AAM §4.1.11: table Element
	if (tagName === 'table') {
		return getTableAccessibleName(el);
	}

	// HTML-AAM §4.1.12: tr, td, th Elements
	if (['tr', 'td', 'th'].includes(tagName)) {
		return getTableCellAccessibleName(el);
	}

	// HTML-AAM §4.1.13: a Element
	if (tagName === 'a') {
		return getAnchorAccessibleName(el);
	}

	// HTML-AAM §4.1.14: area Element
	if (tagName === 'area') {
		return getAreaAccessibleName(el);
	}

	// HTML-AAM §4.1.15: iframe Element
	if (tagName === 'iframe') {
		return getIframeAccessibleName(el);
	}

	// HTML-AAM §4.1.16: Section and Grouping Element
	if (['article', 'aside', 'main', 'nav', 'section', 'header', 'footer', 'div', 'blockquote', 'details'].includes(tagName)) {
		return getSectionGroupingAccessibleName(el);
	}

	// HTML-AAM §4.1.17: Text-level Element  
	if (['span', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup', 'code', 'kbd', 'samp', 'var', 'time', 'data', 'abbr', 'dfn', 'q', 'cite', 'ruby', 'rb', 'rt', 'rtc', 'rp', 'bdi', 'bdo', 'wbr', 'i', 'b', 'u', 's'].includes(tagName)) {
		return getTextLevelAccessibleName(el);
	}

	// For heading elements (h1-h6)
	if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
		return getHeadingAccessibleName(el);
	}

	// For other form inputs not covered above
	if (tagName === 'input') {
		return getOtherInputAccessibleName(el as HTMLInputElement);
	}

	// Default: return title attribute or empty string
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.1: input type="text", input type="password", input type="number", 
// input type="search", input type="tel", input type="email", input type="url" and textarea Elements
function getInputTextTypeAccessibleName(el: HTMLInputElement): string {
	// Step 1: associated label elements
	const labelText = getAssociatedLabelText(el);
	if (labelText) {
		return labelText;
	}
	
	// Step 2: placeholder attribute
	const placeholder = el.getAttribute('placeholder');
	if (placeholder && placeholder.trim()) {
		return placeholder.trim();
	}
	
	// Step 3: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

function getTextareaAccessibleName(el: HTMLTextAreaElement): string {
	// Step 1: associated label elements
	const labelText = getAssociatedLabelText(el);
	if (labelText) {
		return labelText;
	}
	
	// Step 2: placeholder attribute
	const placeholder = el.getAttribute('placeholder');
	if (placeholder && placeholder.trim()) {
		return placeholder.trim();
	}
	
	// Step 3: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.2: input type="button", input type="submit" and input type="reset" Elements
function getInputButtonTypeAccessibleName(el: HTMLInputElement): string {
	// Step 1: value attribute
	const value = el.getAttribute('value');
	if (value && value.trim()) {
		return value.trim();
	}
	
	// Step 2: default button text
	if (el.type === 'submit') {
		return 'Submit';
	}
	if (el.type === 'reset') {
		return 'Reset';
	}
	
	// Step 3: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.3: input type="image" Element
function getInputImageTypeAccessibleName(el: HTMLInputElement): string {
	// Step 1: alt attribute
	const alt = el.getAttribute('alt');
	if (alt !== null) {
		return alt.trim();
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	if (title && title.trim()) {
		return title.trim();
	}
	
	// Step 3: value attribute
	const value = el.getAttribute('value');
	if (value && value.trim()) {
		return value.trim();
	}
	
	// Step 4: default "Submit Query"
	return 'Submit Query';
}

// HTML-AAM §4.1.4: button Element
function getButtonAccessibleName(el: Element): string {
	// Step 1: element contents
	const content = getTextContent(el);
	if (content) {
		return content;
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.5: fieldset Element
function getFieldsetAccessibleName(el: Element): string {
	// Step 1: legend element
	const legend = el.querySelector('legend');
	if (legend) {
		const legendText = getTextContent(legend);
		if (legendText) {
			return legendText;
		}
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.6: output Element
function getOutputAccessibleName(el: Element): string {
	// Step 1: associated label elements
	const labelText = getAssociatedLabelText(el as HTMLElement);
	if (labelText) {
		return labelText;
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.7: Other Form Elements (select, progress, meter)
function getOtherFormElementAccessibleName(el: Element): string {
	// Step 1: associated label elements
	const labelText = getAssociatedLabelText(el as HTMLElement);
	if (labelText) {
		return labelText;
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.8: summary Element
function getSummaryAccessibleName(el: Element): string {
	// Step 1: element contents
	const content = getTextContent(el);
	if (content) {
		return content;
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.9: figure Element
function getFigureAccessibleName(el: Element): string {
	// Step 1: figcaption element
	const figcaption = el.querySelector('figcaption');
	if (figcaption) {
		const captionText = getTextContent(figcaption);
		if (captionText) {
			return captionText;
		}
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.10: img Element
function getImgAccessibleName(el: Element): string {
	// Step 1: alt attribute
	const alt = el.getAttribute('alt');
	if (alt !== null) {
		return alt.trim();
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.11: table Element
function getTableAccessibleName(el: Element): string {
	// Step 1: caption element
	const caption = el.querySelector('caption');
	if (caption) {
		const captionText = getTextContent(caption);
		if (captionText) {
			return captionText;
		}
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.12: tr, td, th Elements
function getTableCellAccessibleName(el: Element): string {
	// Step 1: title attribute (these elements typically don't have accessible names unless explicitly provided)
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.13: a Element
function getAnchorAccessibleName(el: Element): string {
	// Step 1: element contents
	const content = getTextContent(el);
	if (content) {
		return content;
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.14: area Element
function getAreaAccessibleName(el: Element): string {
	// Step 1: alt attribute
	const alt = el.getAttribute('alt');
	if (alt !== null) {
		return alt.trim();
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.15: iframe Element
function getIframeAccessibleName(el: Element): string {
	// Step 1: title attribute
	const title = el.getAttribute('title');
	if (title && title.trim()) {
		return title.trim();
	}
	
	// Step 2: name attribute (for iframe's name)
	const name = el.getAttribute('name');
	return name?.trim() ?? '';
}

// HTML-AAM §4.1.16: Section and Grouping Element
function getSectionGroupingAccessibleName(el: Element): string {
	// Step 1: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// HTML-AAM §4.1.17: Text-level Element
function getTextLevelAccessibleName(el: Element): string {
	// Step 1: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// For heading elements (not explicitly covered in HTML-AAM but common pattern)
function getHeadingAccessibleName(el: Element): string {
	// Step 1: element contents
	const content = getTextContent(el);
	if (content) {
		return content;
	}
	
	// Step 2: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// For other input types not covered in specific sections
function getOtherInputAccessibleName(el: HTMLInputElement): string {
	// Step 1: associated label elements
	const labelText = getAssociatedLabelText(el);
	if (labelText) {
		return labelText;
	}
	
	// Step 2: value attribute (for some input types)
	const value = el.getAttribute('value');
	if (value && value.trim()) {
		return value.trim();
	}
	
	// Step 3: placeholder attribute
	const placeholder = el.getAttribute('placeholder');
	if (placeholder && placeholder.trim()) {
		return placeholder.trim();
	}
	
	// Step 4: title attribute
	const title = el.getAttribute('title');
	return title?.trim() ?? '';
}

// Generic API for label detection - can be used by both accname computation and rule validation

/**
 * Finds an associated label element by 'for' attribute
 */
export function findAssociatedLabelElement(el: Element): Element | null {
	if (!el.id) {
		return null;
	}
	
	// First try to find the root element to search from
	let root: Element = el;
	while (root.parentElement) {
		root = root.parentElement;
	}
	
	let label = root.querySelector(`label[for="${el.id}"]`);
	
	// If not found in root, try searching in the owner document
	if (!label && el.ownerDocument) {
		label = el.ownerDocument.querySelector(`label[for="${el.id}"]`);
	}
	
	return label;
}

/**
 * Finds a parent label element
 */
export function findParentLabelElement(el: Element): Element | null {
	return el.closest('label');
}

/**
 * Checks if element has an associated label by 'for' attribute
 */
export function hasAssociatedLabelElement(el: Element): boolean {
	return findAssociatedLabelElement(el) !== null;
}

/**
 * Checks if element has a parent label element
 */
export function hasParentLabelElement(el: Element): boolean {
	return findParentLabelElement(el) !== null;
}

// Helper function to get associated label text
function getAssociatedLabelText(el: HTMLElement): string {
	// Try to find associated label by 'for' attribute
	const associatedLabel = findAssociatedLabelElement(el);
	if (associatedLabel) {
		const labelText = getTextContent(associatedLabel);
		if (labelText) {
			return labelText;
		}
	}
	
	// Try to find parent label
	const parentLabel = findParentLabelElement(el);
	if (parentLabel) {
		const labelText = getTextContent(parentLabel);
		if (labelText) {
			return labelText;
		}
	}
	
	return '';
}

function getTextContent(el: Element): string {
	// Get text content while excluding hidden elements
	let text = '';
	
	for (const node of el.childNodes) {
		if (node.nodeType === 3) { // TEXT_NODE
			text += node.textContent ?? '';
		} else if (node.nodeType === 1) { // ELEMENT_NODE
			const element = node as Element;
			// Skip elements that are hidden from accessibility tree
			if (!isHiddenFromAccessibility(element)) {
				text += getTextContent(element);
			}
		}
	}
	
	return text.trim();
}

function isHiddenFromAccessibility(el: Element): boolean {
	// Check for aria-hidden="true"
	if (el.getAttribute('aria-hidden') === 'true') {
		return true;
	}
	
	// Check for hidden attribute
	if (el.hasAttribute('hidden')) {
		return true;
	}
	
	// Check for display: none in style attribute
	const style = el.getAttribute('style');
	if (style && /display\s*:\s*none/i.test(style)) {
		return true;
	}
	
	return false;
}
