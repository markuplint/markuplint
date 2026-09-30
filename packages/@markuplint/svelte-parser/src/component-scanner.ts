import type { MLASTChildNode, MLASTDocument, MLASTElement } from '@markuplint/ml-ast';

import { parser } from './parser.js';

/**
 * Result of scanning a single component file for its root element information.
 */
export interface ComponentScanResult {
	readonly rootElement: string | null;
	readonly attrs: readonly ComponentScanAttr[];
	readonly hasSlots: boolean;
	readonly slotWrappers?: readonly ComponentScanSlotWrapper[];
	readonly rootContents?: readonly ComponentScanContent[];
	readonly scriptSource?: ComponentScanScriptSource;
	readonly namespace?: 'svg';
	readonly line?: number;
	readonly col?: number;
}

/**
 * An attribute extracted from an element of a component: a static one with its value, or
 * a `dynamic` one whose value is an expression.
 */
export interface ComponentScanAttr {
	readonly name: string;
	readonly value?: string;
	/** The attribute is present and its value is an expression, unknown at scan time. `value` is omitted. */
	readonly dynamic?: true;
}

/**
 * A direct child of an element that wraps a slot. A native element is itself
 * (its own content is not tracked), the slot is its position, and anything
 * else (an expression, a block, a component) is unknown content.
 */
export type ComponentScanContent =
	| { readonly element: string; readonly attrs?: readonly ComponentScanAttr[] }
	| { readonly slot: true }
	| { readonly dynamic: true };

/**
 * An element that directly wraps a slot. A component has no `attrs` and no
 * `contents`: what it renders is unknown.
 */
export interface ComponentScanSlotWrapper {
	readonly element: string;
	readonly isRoot: boolean;
	readonly attrs: readonly ComponentScanAttr[];
	readonly contents: readonly ComponentScanContent[];
}

/**
 * A script/ESM source block extracted from a component file.
 */
export interface ComponentScanScriptSource {
	readonly content: string;
	readonly offset: number;
}

function extractComponentInfo(
	doc: MLASTDocument,
): Omit<ComponentScanResult, 'hasSlots' | 'slotWrappers' | 'rootContents' | 'scriptSource'> | null {
	const root = findRoot(doc);
	if (!root) {
		return null;
	}

	return {
		rootElement: root.nodeName,
		attrs: extractAttrs(root),
		namespace: root.namespace === 'http://www.w3.org/2000/svg' ? 'svg' : undefined,
		line: root.line,
		col: root.col,
	};
}

/**
 * Slot usage can take several forms whose mapping to psblock node names is
 * not derivable from this code:
 * - Svelte 4: `<slot>` element (parsed as psblock `#ps:SlotElement`)
 * - Svelte 5: `{@render children()}` (parsed as psblock `#ps:RenderTag`)
 * - Standard `<slot>` elements
 */
function isSlotNode(n: MLASTChildNode): boolean {
	return (
		(n.type === 'starttag' && n.nodeName === 'slot') ||
		(n.type === 'psblock' && (n.nodeName === '#ps:SlotElement' || n.nodeName === '#ps:RenderTag'))
	);
}

function detectSlots(doc: MLASTDocument): boolean {
	return doc.nodeList.some(n => n.type !== 'doctype' && isSlotNode(n));
}

function findRoot(doc: MLASTDocument): MLASTElement | undefined {
	return doc.nodeList.find((n): n is MLASTElement => n.type === 'starttag' && n.depth === 0 && !n.isFragment);
}

function isElement(n: MLASTChildNode): n is MLASTElement {
	return n.type === 'starttag';
}

/**
 * An attribute whose value is an expression (`type={kind}`, the shorthand `{type}`, `bind:value`,
 * or `{}` inside a quoted value) is an attribute the element has, and it is `dynamic`. The other
 * directives (`on:`, `class:`, `use:`, and so on) are not attributes by name and are left out.
 */
const INTERPOLATION = /\{[^}]*\}/;
const BINDING_WITHOUT_NAME = new Set(['group', 'this']);

function extractAttrs(el: MLASTElement): ComponentScanAttr[] {
	const attrs: ComponentScanAttr[] = [];
	for (const attr of el.attributes) {
		if (attr.type !== 'attr') {
			continue;
		}
		if (attr.name.raw === '') {
			if (attr.potentialName) {
				attrs.push({ name: attr.potentialName, dynamic: true });
			}
			continue;
		}
		const directive = /^([a-z]+):(.+)$/i.exec(attr.nodeName);
		if (directive) {
			const [, prefix, name] = directive;
			if (prefix === 'bind' && name && !BINDING_WITHOUT_NAME.has(name)) {
				attrs.push({ name: name.toLowerCase(), dynamic: true });
			}
			continue;
		}
		const value = attr.value.raw;
		if (attr.isDynamicValue || INTERPOLATION.test(value)) {
			attrs.push({ name: attr.nodeName, dynamic: true });
		} else if (value === '') {
			attrs.push({ name: attr.nodeName });
		} else {
			attrs.push({ name: attr.nodeName, value });
		}
	}
	return attrs;
}

function containsSlot(n: MLASTChildNode): boolean {
	return isSlotNode(n) || ('childNodes' in n && n.childNodes.some(child => containsSlot(child)));
}

/**
 * The nearest element above the node. Blocks, fragments and `<template>` are
 * looked through: they are not elements the component renders.
 */
function findWrapper(n: MLASTChildNode, nodes: ReadonlyMap<string, MLASTChildNode>): MLASTElement | null {
	let current = n.parentNodeUuid ? nodes.get(n.parentNodeUuid) : undefined;
	while (current) {
		if (isElement(current) && !current.isFragment && current.nodeName !== 'template') {
			return current;
		}
		current = current.parentNodeUuid ? nodes.get(current.parentNodeUuid) : undefined;
	}
	return null;
}

function isWithin(n: MLASTChildNode, root: MLASTElement, nodes: ReadonlyMap<string, MLASTChildNode>): boolean {
	let current: MLASTChildNode | undefined = n;
	while (current) {
		if (current.uuid === root.uuid) {
			return true;
		}
		current = current.parentNodeUuid ? nodes.get(current.parentNodeUuid) : undefined;
	}
	return false;
}

function extractContents(el: MLASTElement): ComponentScanContent[] {
	const entries: (ComponentScanContent | { readonly text: true })[] = [];
	for (const child of el.childNodes) {
		if (child.type === 'endtag' || child.type === 'comment') {
			continue;
		}
		if (child.type === 'text') {
			if (child.raw.trim() !== '') {
				entries.push({ text: true });
			}
			continue;
		}
		if (containsSlot(child)) {
			entries.push({ slot: true });
			continue;
		}
		if (child.type === 'psblock') {
			// Closing tags of blocks (`{/if}`) render nothing
			if (!child.nodeName.startsWith('#ps:/')) {
				entries.push({ dynamic: true });
			}
			continue;
		}
		if (isElement(child) && child.elementType === 'html' && child.nodeName !== 'template') {
			const attrs = extractAttrs(child);
			entries.push({ element: child.nodeName, ...(attrs.length > 0 ? { attrs } : {}) });
			continue;
		}
		entries.push({ dynamic: true });
	}
	// Text beside elements can still satisfy a content model (`<ruby>漢<rt>kan</rt></ruby>`),
	// so it is unknown content there. Text alone cannot be what a required child needs.
	const hasElement = entries.some(entry => 'element' in entry);
	const contents: ComponentScanContent[] = [];
	for (const entry of entries) {
		if (!('text' in entry)) {
			contents.push(entry);
			continue;
		}
		const last = contents.at(-1);
		if (hasElement && !(last && 'dynamic' in last)) {
			contents.push({ dynamic: true });
		}
	}
	return contents;
}

/**
 * Finds the element that directly wraps each slot inside the root element and
 * what surrounds the slots: the direct children of the root.
 */
function scanSlotContent(doc: MLASTDocument): Pick<ComponentScanResult, 'slotWrappers' | 'rootContents'> {
	const root = findRoot(doc);
	if (!root) {
		return {};
	}

	const nodes = new Map<string, MLASTChildNode>(
		doc.nodeList.filter((n): n is MLASTChildNode => n.type !== 'doctype').map(n => [n.uuid, n]),
	);
	const wrappers = new Map<string, MLASTElement>();
	for (const n of nodes.values()) {
		if (!isSlotNode(n)) {
			continue;
		}
		const wrapper = findWrapper(n, nodes);
		if (wrapper && isWithin(wrapper, root, nodes)) {
			wrappers.set(wrapper.uuid, wrapper);
		}
	}

	return {
		slotWrappers: [...wrappers.values()].map(wrapper => {
			const isNative = wrapper.elementType === 'html';
			return {
				element: wrapper.nodeName,
				isRoot: wrapper.uuid === root.uuid,
				attrs: isNative ? extractAttrs(wrapper) : [],
				contents: isNative ? extractContents(wrapper) : [],
			};
		}),
		rootContents: extractContents(root),
	};
}

/**
 * Prefers the instance script over `<script context="module">`.
 */
function extractSvelteScript(source: string): ComponentScanScriptSource | null {
	const re = /<script(?:\s[^>]*)?>/gi;
	let match: RegExpExecArray | null;
	let moduleBlock: ComponentScanScriptSource | null = null;

	while ((match = re.exec(source)) !== null) {
		const startTag = match[0];
		const isModule = /\bcontext\s*=\s*["']module["']/i.test(startTag);
		const contentStart = match.index + startTag.length;

		const endTagRe = /<\/script\s*>/i;
		const remaining = source.slice(contentStart);
		const endMatch = endTagRe.exec(remaining);
		if (!endMatch) {
			continue;
		}

		const block: ComponentScanScriptSource = {
			content: remaining.slice(0, endMatch.index),
			offset: contentStart,
		};

		if (!isModule) {
			return block;
		}

		moduleBlock ??= block;
	}

	return moduleBlock;
}

/**
 * Component scanner for Svelte component files.
 *
 * Parses a Svelte component using markuplint's Svelte parser, extracts the root
 * element at depth=0, detects static attributes, slot/render usage, and the
 * `<script>` block for import analysis.
 */
export const componentScanner = {
	scanComponent(sourceCode: string): ComponentScanResult | null {
		let doc: MLASTDocument;
		try {
			doc = parser.parse(sourceCode);
		} catch (error: unknown) {
			if (error instanceof SyntaxError || (error instanceof Error && error.constructor.name === 'ParserError')) {
				return null;
			}
			throw error;
		}

		const info = extractComponentInfo(doc);
		if (!info) {
			return null;
		}

		const hasSlots = detectSlots(doc);
		const scriptSource = extractSvelteScript(sourceCode) ?? undefined;

		return { ...info, hasSlots, ...scanSlotContent(doc), scriptSource };
	},

	extractScriptSource(sourceCode: string): ComponentScanScriptSource | null {
		return extractSvelteScript(sourceCode);
	},
};
