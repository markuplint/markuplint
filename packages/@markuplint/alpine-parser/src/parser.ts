import type { MLASTNodeTreeItem, MLASTPreprocessorSpecificBlock } from '@markuplint/ml-ast';

import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Alpine.js templates that extends the standard HTML parser.
 *
 * Converts `<template x-for="...">` elements into preprocessor-specific
 * blocks so that markuplint understands the iteration semantics.
 *
 * Attribute-level directive resolution (x-bind, x-on, @, :, etc.) is
 * handled declaratively via `directivePatterns` in `@markuplint/alpine-spec`.
 */
class AlpineParser extends HtmlParser {
	/**
	 * Overrides the base element visitor to convert `<template x-for="...">` elements
	 * into preprocessor-specific blocks with `blockBehavior: { type: 'each' }`.
	 * The matching closing tag receives `{ type: 'end' }`. Non-template elements
	 * and templates without `x-for` are passed through unchanged.
	 *
	 * @param token - The element token with tag metadata
	 * @param childNodes - The child AST nodes within the element
	 * @param options - Options forwarded to the base `visitElement`
	 * @returns An array of markuplint node tree items, with `x-for` templates replaced by psblock nodes
	 */
	visitElement(
		token: Parameters<HtmlParser['visitElement']>[0],
		childNodes: Parameters<HtmlParser['visitElement']>[1] = [],
		options: Parameters<HtmlParser['visitElement']>[2],
	): readonly MLASTNodeTreeItem[] {
		return super.visitElement(token, childNodes, options).map(node => {
			if (node.type !== 'starttag' && node.type !== 'endtag') {
				return node;
			}

			if (node.nodeName.toLowerCase() !== 'template') {
				return node;
			}

			const attrs = node.type === 'starttag' ? node.attributes : node.pairNode.attributes;

			if (!attrs.some(attr => attr.nodeName.toLowerCase() === 'x-for')) {
				return node;
			}

			const forBlock: MLASTPreprocessorSpecificBlock = {
				isFragment: false,
				childNodes: [],
				...node,
				type: 'psblock',
				blockBehavior: {
					type: node.type === 'starttag' ? 'each' : 'end',
					expression: node.raw,
				},
				isBogus: false,
			};

			return forBlock;
		});
	}
}

/**
 * Singleton Alpine.js parser instance for use by the markuplint engine.
 */
export const parser = new AlpineParser();
