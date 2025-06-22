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

	// HTML-AAM §4.1: Use accname library for elements with aria-label, aria-labelledby, or explicit roles
	if (hasAriaNameAttributes(el)) {
		return computeAccessibleName(el);
	}

	// Element-specific accessible name computation based on HTML-AAM §4.1
	return getElementSpecificAccessibleName(el);
}

function hasAriaNameAttributes(el: Element): boolean {
	return el.hasAttribute('aria-label') || 
	       el.hasAttribute('aria-labelledby') ||
	       el.hasAttribute('role') || // Elements with explicit roles should use accname library
	       el.hasAttribute('style'); // Elements with style attributes should use accname library for visibility handling
}

function getElementSpecificAccessibleName(el: Element): string {
	const tagName = el.tagName.toLowerCase();

	switch (tagName) {
		case 'img': {
			// Use alt attribute, fallback to title
			const alt = el.getAttribute('alt');
			if (alt !== null) {
				return alt.trim();
			}
			const title = el.getAttribute('title');
			return title?.trim() ?? '';
		}

		case 'input': {
			// Get name from associated label elements or aria-labelledby
			const inputElement = el as HTMLInputElement;
			
			// Try to find associated label by 'for' attribute
			if (inputElement.id) {
				// First try to find the root element to search from
				let root = el;
				while (root.parentElement) {
					root = root.parentElement;
				}
				
				let label = root.querySelector(`label[for="${inputElement.id}"]`);
				
				// If not found in root, try searching in the owner document
				if (!label && el.ownerDocument) {
					label = el.ownerDocument.querySelector(`label[for="${inputElement.id}"]`);
				}
				
				if (label) {
					return getTextContent(label);
				}
			}
			
			// Try to find parent label
			const parentLabel = el.closest('label');
			if (parentLabel) {
				return getTextContent(parentLabel);
			}
			
			// Fallback to placeholder for INPUT (existing behavior)
			const placeholder = el.getAttribute('placeholder');
			return placeholder?.trim() ?? '';
		}

		case 'button': {
			// Use element's text content
			return getTextContent(el);
		}

		case 'a': {
			// Links derive accessible name from content
			return getTextContent(el);
		}

		case 'textarea':
		case 'select': {
			// Get name from associated label elements (similar to input)
			const formElement = el as HTMLFormElement;
			
			// Try to find associated label by 'for' attribute
			if (formElement.id) {
				// First try to find the root element to search from
				let root = el;
				while (root.parentElement) {
					root = root.parentElement;
				}
				
				let label = root.querySelector(`label[for="${formElement.id}"]`);
				
				// If not found in root, try searching in the owner document
				if (!label && el.ownerDocument) {
					label = el.ownerDocument.querySelector(`label[for="${formElement.id}"]`);
				}
				
				if (label) {
					return getTextContent(label);
				}
			}
			
			// Try to find parent label
			const parentLabel = el.closest('label');
			if (parentLabel) {
				return getTextContent(parentLabel);
			}
			
			return '';
		}

		case 'table': {
			// Use caption element
			const caption = el.querySelector('caption');
			return caption ? getTextContent(caption) : '';
		}
		
		case 'fieldset': {
			// Use legend element
			const legend = el.querySelector('legend');
			return legend ? getTextContent(legend) : '';
		}

		case 'h1':
		case 'h2':
		case 'h3':
		case 'h4':
		case 'h5':
		case 'h6': {
			// Headings derive accessible name from content
			return getTextContent(el);
		}

		default: {
			// For elements without specific naming rules, return empty string
			// unless they have aria-label or aria-labelledby (handled above)
			return '';
		}
	}
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
	return el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden');
}
