import type { MLASTDocument, MLASTElement } from '@markuplint/ml-ast';

import { parser } from './parser.js';

/**
 * Result of scanning a single component file for its root element information.
 */
export interface ComponentScanResult {
	readonly rootElement: string | null;
	readonly attrs: readonly ComponentScanAttr[];
	readonly hasSlots: boolean;
	readonly scriptSource?: ComponentScanScriptSource;
	readonly namespace?: 'svg';
	readonly line?: number;
	readonly col?: number;
}

/**
 * A static attribute extracted from a component's root element.
 */
export interface ComponentScanAttr {
	readonly name: string;
	readonly value?: string;
}

/**
 * A script/ESM source block extracted from a component file.
 */
export interface ComponentScanScriptSource {
	readonly content: string;
	readonly offset: number;
}

function extractComponentInfo(doc: MLASTDocument): Omit<ComponentScanResult, 'hasSlots' | 'scriptSource'> | null {
	const root = doc.nodeList.find((n): n is MLASTElement => n.type === 'starttag' && n.depth === 0 && !n.isFragment);
	if (!root) {
		return null;
	}

	const attrs: ComponentScanAttr[] = [];
	for (const attr of root.attributes) {
		if (attr.type !== 'attr') {
			continue;
		}
		const value = attr.value.raw;
		if (value === '') {
			attrs.push({ name: attr.nodeName });
		} else {
			attrs.push({ name: attr.nodeName, value });
		}
	}

	return {
		rootElement: root.nodeName,
		attrs,
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
function detectSlots(doc: MLASTDocument): boolean {
	return doc.nodeList.some(
		n =>
			(n.type === 'starttag' && n.nodeName === 'slot') ||
			(n.type === 'psblock' && (n.nodeName === '#ps:SlotElement' || n.nodeName === '#ps:RenderTag')),
	);
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

		return { ...info, hasSlots, scriptSource };
	},

	extractScriptSource(sourceCode: string): ComponentScanScriptSource | null {
		return extractSvelteScript(sourceCode);
	},
};
