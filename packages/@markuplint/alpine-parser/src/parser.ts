import type { MLASTNodeTreeItem, MLASTPreprocessorSpecificBlock } from '@markuplint/ml-ast';

import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Alpine.js templates that extends the standard HTML parser.
 *
 * Converts `<template x-for="...">` and `<template x-if="...">` elements into
 * preprocessor-specific blocks so that markuplint understands the iteration and
 * the condition: Alpine.js renders the content of such a `template` after the
 * `template` element, as siblings of it, so the content is not a tree of its own
 * that stays unrendered.
 *
 * @see https://alpinejs.dev/directives/if
 * @see https://alpinejs.dev/directives/for
 *
 * Attribute-level directive resolution (x-bind, x-on, @, :, etc.) is
 * handled declaratively via `directivePatterns` in `@markuplint/alpine-spec`.
 */
class AlpineParser extends HtmlParser {
	/**
	 * Overrides the base element visitor to convert `<template x-for="...">` elements
	 * into preprocessor-specific blocks with `blockBehavior: { type: 'each' }`, and
	 * `<template x-if="...">` elements with `blockBehavior: { type: 'if' }`.
	 * The matching closing tag receives `{ type: 'end' }`. Non-template elements
	 * and templates with neither directive are passed through unchanged.
	 *
	 * @param token - The element token with tag metadata
	 * @param childNodes - The child AST nodes within the element
	 * @param options - Options forwarded to the base `visitElement`
	 * @returns An array of markuplint node tree items, with `x-for` and `x-if` templates replaced by psblock nodes
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

			const attrs = node.type === 'starttag' ? node.attributes : (node.pairNode?.attributes ?? []);

			const names = new Set(attrs.map(attr => attr.nodeName.toLowerCase()));
			if (!names.has('x-for') && !names.has('x-if')) {
				return node;
			}
			// The HTML parser consumes a template that declares a shadow root: it is not rendered as a loop or a condition
			if (names.has('shadowrootmode')) {
				return node;
			}

			const forBlock: MLASTPreprocessorSpecificBlock = {
				isFragment: false,
				childNodes: [],
				...node,
				type: 'psblock',
				blockBehavior: {
					// A `template` that has both is taken as a loop, the more general of the two
					type: node.type === 'starttag' ? (names.has('x-for') ? 'each' : 'if') : 'end',
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
