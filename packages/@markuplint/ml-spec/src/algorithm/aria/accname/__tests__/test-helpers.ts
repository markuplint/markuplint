/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement, AccnameNode, AccnameResolver } from '../types.js';

import {
	ELEMENT_NODE,
	TEXT_NODE,
	XHTML_NAMESPACE,
	EMBEDDED_CONTROL_ROLES,
	isNativeEmbeddedControl,
} from '../../../../const/index.js';

interface ElementOptions {
	readonly attrs?: Record<string, string>;
	readonly children?: readonly (AccnameElement | AccnameNode)[];
	readonly parentElement?: AccnameElement | null;
	readonly namespaceURI?: string | null;
}

/**
 * Creates a test AccnameElement (plain object).
 *
 * **Note:** `textContent` is computed eagerly at creation time from the initial
 * `children`. Adding children after creation will NOT update `textContent`.
 * Build the full child tree before calling this function.
 *
 * @param localName - The local tag name of the element
 * @param options - Configuration for attributes, children, parent, and namespace
 * @returns A plain object implementing the AccnameElement interface
 */
export function element(localName: string, options: ElementOptions = {}): AccnameElement {
	const attrs = options.attrs ?? {};
	const childNodes = options.children ?? [];
	const elementChildren: AccnameElement[] = [];
	for (const child of childNodes) {
		if (child.nodeType === ELEMENT_NODE) {
			elementChildren.push(child as AccnameElement);
		}
	}

	const el: AccnameElement = {
		nodeType: ELEMENT_NODE,
		localName,
		id: attrs['id'] ?? '',
		namespaceURI: options.namespaceURI ?? XHTML_NAMESPACE,
		textContent: computeTextContent(childNodes),
		parentElement: options.parentElement ?? null,
		children: elementChildren,
		childNodes,
		getAttribute(name: string): string | null {
			return attrs[name] ?? null;
		},
		hasAttribute(name: string): boolean {
			return name in attrs;
		},
	};

	return el;
}

/**
 * Creates a test text node.
 *
 * @param text - The text content of the node
 * @returns A plain object implementing the AccnameNode interface
 */
export function textNode(text: string): AccnameNode {
	return {
		nodeType: TEXT_NODE,
		textContent: text,
	};
}

function computeTextContent(childNodes: readonly (AccnameElement | AccnameNode)[]): string {
	return childNodes
		.map(child => {
			if (child.nodeType === TEXT_NODE) {
				return child.textContent ?? '';
			}
			if (child.nodeType === ELEMENT_NODE) {
				return (child as AccnameElement).textContent ?? '';
			}
			return '';
		})
		.join('');
}

interface ResolverOptions {
	readonly elements?: Map<string, AccnameElement>;
	readonly labels?: Map<string, readonly AccnameElement[]>;
	readonly nameFromContent?: Set<string>;
	readonly hiddenIds?: Set<string>;
	readonly allowsNameFromContentFn?: (el: AccnameElement) => boolean;
	readonly isHiddenFn?: (el: AccnameElement) => boolean;
	readonly embeddedControlRoles?: Set<string>;
	readonly isEmbeddedControlFn?: (el: AccnameElement) => boolean;
	readonly getPrecomputedNameFn?: (el: AccnameElement) => string | null;
}

/**
 * Creates a test AccnameResolver.
 *
 * @param options - Configuration for element lookups, label associations, and behavior overrides
 * @returns A resolver implementing the AccnameResolver interface for testing
 */
export function createTestResolver(options: ResolverOptions = {}): AccnameResolver {
	const elements = options.elements ?? new Map<string, AccnameElement>();
	const labels = options.labels ?? new Map<string, readonly AccnameElement[]>();
	const nameFromContent = options.nameFromContent ?? new Set<string>();
	const hiddenIds = options.hiddenIds ?? new Set<string>();
	const embeddedControlRoles = options.embeddedControlRoles ?? EMBEDDED_CONTROL_ROLES;

	return {
		getElementById(id: string): AccnameElement | null {
			return elements.get(id) ?? null;
		},
		getLabelsForId(id: string): readonly AccnameElement[] {
			return labels.get(id) ?? [];
		},
		allowsNameFromContent(el: AccnameElement): boolean {
			if (options.allowsNameFromContentFn) {
				return options.allowsNameFromContentFn(el);
			}
			return nameFromContent.has(el.localName);
		},
		isHidden(el: AccnameElement): boolean {
			if (options.isHiddenFn) {
				return options.isHiddenFn(el);
			}
			if (hiddenIds.has(el.id)) {
				return true;
			}
			if (el.getAttribute('aria-hidden') === 'true') {
				return true;
			}
			if (el.hasAttribute('hidden')) {
				return true;
			}
			return false;
		},
		isEmbeddedControl(el: AccnameElement): boolean {
			if (options.isEmbeddedControlFn) {
				return options.isEmbeddedControlFn(el);
			}
			// Check explicit role
			const role = el.getAttribute('role')?.trim().split(/\s+/)[0];
			if (role && embeddedControlRoles.has(role)) {
				return true;
			}
			// Check native HTML elements
			return isNativeEmbeddedControl(el);
		},
		...(options.getPrecomputedNameFn ? { getPrecomputedName: options.getPrecomputedNameFn } : {}),
	};
}
