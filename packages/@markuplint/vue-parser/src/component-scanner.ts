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

function extractVueScriptSetup(source: string): ComponentScanScriptSource | null {
	const re = /<script\s[^>]*?\bsetup\b[^>]*>/i;
	const match = re.exec(source);
	if (!match) {
		return null;
	}

	const startTag = match[0];
	const contentStart = match.index + startTag.length;

	const endTagRe = /<\/script\s*>/i;
	const remaining = source.slice(contentStart);
	const endMatch = endTagRe.exec(remaining);
	if (!endMatch) {
		return null;
	}

	return {
		content: remaining.slice(0, endMatch.index),
		offset: contentStart,
	};
}

/**
 * Component scanner for Vue SFC files.
 *
 * Parses a Vue component using markuplint's Vue parser, extracts the root
 * element at depth=0, detects static attributes, slot usage, and the
 * `<script setup>` block for import analysis.
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
		const scriptSource = extractVueScriptSetup(sourceCode) ?? undefined;

		return { ...info, hasSlots, scriptSource };
	},

	extractScriptSource(sourceCode: string): ComponentScanScriptSource | null {
		return extractVueScriptSetup(sourceCode);
	},
};
