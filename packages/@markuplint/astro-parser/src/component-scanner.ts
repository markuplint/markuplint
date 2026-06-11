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

function detectSlots(doc: MLASTDocument): boolean {
	return doc.nodeList.some(n => n.type === 'starttag' && n.nodeName === 'slot');
}

function extractAstroFrontmatter(source: string): ComponentScanScriptSource | null {
	const re = /^(?:\s*\n)?---\r?\n/;
	const startMatch = re.exec(source);
	if (!startMatch) {
		return null;
	}

	const contentStart = startMatch[0].length;
	const afterStart = source.slice(contentStart);
	const endRe = /\r?\n---\r?\n/;
	const endMatch = endRe.exec(afterStart);
	if (!endMatch) {
		return null;
	}

	return {
		content: afterStart.slice(0, endMatch.index),
		offset: contentStart,
	};
}

/**
 * Component scanner for Astro component files.
 *
 * Parses an Astro component using markuplint's Astro parser, extracts the root
 * element at depth=0, detects static attributes, slot usage, and the
 * frontmatter block for import analysis.
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
		const scriptSource = extractAstroFrontmatter(sourceCode) ?? undefined;

		return { ...info, hasSlots, scriptSource };
	},

	extractScriptSource(sourceCode: string): ComponentScanScriptSource | null {
		return extractAstroFrontmatter(sourceCode);
	},
};
