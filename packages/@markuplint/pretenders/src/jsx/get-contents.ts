import type { Root } from './collect-roots.js';
import type { PropResolver } from './resolve-prop.js';
import type { ContentEntry, SlotInfo } from '../contents.js';
import type { PretenderContent, Slot } from '@markuplint/ml-config';
import type { JsxChild, JsxElement, JsxOpeningElement, JsxTagNameExpression, Node, SourceFile } from 'typescript';

import ts from 'typescript';

import { isTrivialContents, resolveTextEntries } from '../contents.js';

import { getAttributes, toPretenderAttrs } from './get-attributes.js';

const {
	forEachChild,
	isIdentifier,
	isJsxAttributes,
	isJsxElement,
	isJsxExpression,
	isJsxFragment,
	isJsxSelfClosingElement,
	isJsxText,
} = ts;

/**
 * Finds the element that directly wraps each `{children}` / `props.children` in the
 * root and describes what surrounds it.
 *
 * Returns `undefined` when the pretender cannot express the component: a fragment
 * with several roots whose children are rendered inside one of the roots.
 *
 * `resolveProp` is for the attributes of the wrappers and the contents (see `getAttributes`).
 */
export function getSlotInfo(
	root: Root,
	sourceFile: SourceFile,
	isFragmentTag: (tag: string) => boolean,
	resolveProp?: PropResolver,
): SlotInfo | undefined {
	if (root.type === 'element' && isJsxSelfClosingElement(root.element)) {
		return { slots: null, contents: [] };
	}

	const rootElement = root.type === 'element' ? (root.element as JsxOpeningElement) : undefined;
	const children = root.type === 'element' ? (root.element.parent as JsxElement).children : root.children;

	const wrappers = findWrappers(children, sourceFile, isFragmentTag);
	const others = [...wrappers].filter((wrapper): wrapper is JsxOpeningElement => wrapper !== null);

	if (wrappers.size === 0) {
		return { slots: null, contents: toContents(children, sourceFile, isFragmentTag, resolveProp) };
	}

	if (others.length === 0) {
		return { slots: true, contents: toContents(children, sourceFile, isFragmentTag, resolveProp) };
	}

	if (!rootElement) {
		return undefined;
	}

	const slots = [
		...(wrappers.has(null) ? [toSlot(rootElement, sourceFile, isFragmentTag, resolveProp)] : []),
		...others.map(wrapper => toSlot(wrapper, sourceFile, isFragmentTag, resolveProp)),
	];
	return { slots, contents: [] };
}

/**
 * `null` stands for the root; anything else is the opening element that
 * directly contains the reference. A provider (`asFragment`) is not a wrapper.
 * The attributes of an element are not content, so `data-ref={children}` is not a slot.
 */
function findWrappers(
	children: readonly JsxChild[],
	sourceFile: SourceFile,
	isFragmentTag: (tag: string) => boolean,
): Set<JsxOpeningElement | null> {
	const wrappers = new Set<JsxOpeningElement | null>();

	const walk = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		node: Node,
		wrapper: JsxOpeningElement | null,
	) => {
		if (isJsxAttributes(node) || isJsxSelfClosingElement(node)) {
			return;
		}
		if (isJsxElement(node)) {
			const next = isFragmentTag(node.openingElement.tagName.getText(sourceFile)) ? wrapper : node.openingElement;
			for (const child of node.children) {
				walk(child, next);
			}
			return;
		}
		if (isChildrenReference(node)) {
			wrappers.add(wrapper);
			return;
		}
		forEachChild(node, child => walk(child, wrapper));
	};

	for (const child of children) {
		walk(child, null);
	}
	return wrappers;
}

function isChildrenReference(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
) {
	return isIdentifier(node) && node.text === 'children';
}

function containsChildrenReference(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
): boolean {
	if (isChildrenReference(node)) {
		return true;
	}
	return forEachChild(node, child => (containsChildrenReference(child) ? true : undefined)) ?? false;
}

/**
 * Converts the direct children of the element that wraps the slot.
 *
 * - A native element is itself; its own content is not tracked.
 * - `{children}` (or any expression that uses `children`) is the slot position.
 * - Any other expression, and a component, is unknown content: `{ dynamic: true }`.
 * - Text and a provider (`asFragment`) do not appear (a provider's children stand for it).
 */
function toContents(
	children: readonly JsxChild[],
	sourceFile: SourceFile,
	isFragmentTag: (tag: string) => boolean,
	resolveProp: PropResolver | undefined,
): PretenderContent[] {
	return resolveTextEntries(collectContents(children, sourceFile, isFragmentTag, resolveProp));
}

function collectContents(
	children: readonly JsxChild[],
	sourceFile: SourceFile,
	isFragmentTag: (tag: string) => boolean,
	resolveProp: PropResolver | undefined,
): ContentEntry[] {
	const contents: ContentEntry[] = [];

	for (const child of children) {
		if (isJsxText(child)) {
			if (!child.containsOnlyTriviaWhiteSpaces) {
				contents.push({ text: true });
			}
			continue;
		}

		if (isJsxExpression(child)) {
			if (child.expression) {
				contents.push(containsChildrenReference(child.expression) ? { slot: true } : { dynamic: true });
			}
			continue;
		}

		if (isJsxFragment(child)) {
			contents.push(...collectContents(child.children, sourceFile, isFragmentTag, resolveProp));
			continue;
		}

		const opening = isJsxElement(child) ? child.openingElement : child;

		if (isJsxElement(child) && isFragmentTag(opening.tagName.getText(sourceFile))) {
			contents.push(...collectContents(child.children, sourceFile, isFragmentTag, resolveProp));
			continue;
		}

		if (!isIntrinsicTag(opening.tagName)) {
			contents.push({ dynamic: true });
			continue;
		}

		const attrs = toPretenderAttrs(getAttributes(opening, sourceFile, resolveProp));
		contents.push({
			element: opening.tagName.getText(sourceFile),
			...(attrs.length > 0 ? { attrs } : {}),
		});
	}

	return contents;
}

/**
 * A native slot wrapper is described with its attributes and content. A component
 * has neither: what it renders is unknown here, so it stays a name that no spec knows.
 */
function toSlot(
	opening: JsxOpeningElement,
	sourceFile: SourceFile,
	isFragmentTag: (tag: string) => boolean,
	resolveProp: PropResolver | undefined,
): Slot {
	const element = opening.tagName.getText(sourceFile);
	if (!isIntrinsicTag(opening.tagName)) {
		return { element };
	}

	const attrs = toPretenderAttrs(getAttributes(opening, sourceFile, resolveProp));
	const contents = toContents((opening.parent as JsxElement).children, sourceFile, isFragmentTag, resolveProp);
	return {
		element,
		...(attrs.length > 0 ? { attrs } : {}),
		...(isTrivialContents(contents) ? {} : { contents }),
	};
}

/**
 * Only a lowercase identifier is a native (or custom) element;
 * `Foo`, `Foo.Bar`, and `ns:tag` are components.
 */
function isIntrinsicTag(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tagName: JsxTagNameExpression,
) {
	return isIdentifier(tagName) && /^[a-z]/.test(tagName.text);
}
