import type { Token } from '@markuplint/parser-utils';
import type { MLASTNodeTreeItem, MLASTPreprocessorSpecificBlock } from '@markuplint/ml-ast';

import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Alpine.js templates that extends the standard HTML parser.
 *
 * Recognizes Alpine.js directives such as `x-data`, `x-bind`, `x-on`, and
 * `x-transition`, and classifies them as either directives (opaque to linting)
 * or attribute bindings (with potential standard attribute names for validation).
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

	/**
	 * Visits an attribute token and applies Alpine.js-specific classification.
	 *
	 * Determines whether the attribute is an Alpine.js directive, a dynamic
	 * binding (e.g., `:class`, `x-bind:href`), or an event listener shorthand
	 * (e.g., `@click`, `x-on:submit`), and returns the attribute with
	 * appropriate metadata such as `potentialName`, `isDirective`, and
	 * `isDynamicValue`.
	 *
	 * @param token - The raw attribute token containing text and position information
	 * @param options - Controls quoting behavior, value types, and the initial parser state
	 * @returns The attribute AST node enriched with Alpine.js directive metadata
	 */
	visitAttr(token: Token, options: Parameters<HtmlParser['visitAttr']>[1]) {
		const attr = super.visitAttr(token, options);

		if (attr.type === 'spread') {
			return attr;
		}

		const name = attr.name.raw;

		switch (name) {
			/**
			 * @see https://alpinejs.dev/directives/data
			 */
			case 'x-data': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/init
			 */
			case 'x-init': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/show
			 */
			case 'x-show': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/text
			 */
			case 'x-text': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/html
			 */
			case 'x-html': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/model
			 */
			case 'x-model': {
				return attr;
			}
			/**
			 * @see https://alpinejs.dev/directives/modelable
			 */
			case 'x-modelable': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/for
			 */
			case 'x-for': {
				return attr;
			}
			/**
			 * @see https://alpinejs.dev/directives/effect
			 */
			case 'x-effect': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/ignore
			 */
			case 'x-ignore': {
				return {
					...attr,
					valueType: 'boolean' as const,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/ref
			 */
			case 'x-ref': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/cloak
			 */
			case 'x-cloak': {
				return {
					...attr,
					valueType: 'boolean' as const,
					isDirective: true as const,
				};
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/teleport
			 */
			case 'x-teleport': {
				return attr;
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/if
			 */
			case 'x-if': {
				return attr;
			}
			/**
			 * @see https://alpinejs.dev/directives/id
			 */
			case 'x-id': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
		}

		/**
		 * @see https://alpinejs.dev/directives/bind
		 */
		if (name.startsWith('x-bind:') || name.startsWith(':')) {
			const potentialName = (attr.name.raw.match(/^(x-bind:|:)([^.]+)(?:\.([^.]+))?$/i) ?? [])[2];

			if (!potentialName) {
				return attr;
			}

			return {
				...attr,
				potentialName,
				valueType: 'code' as const,
				isDuplicatable: ['class', 'style'].includes(potentialName),
				isDynamicValue: true as const,
			};
		}

		/**
		 * @see https://alpinejs.dev/directives/on
		 */
		if (name.startsWith('x-on:') || name.startsWith('@')) {
			const potentialName = (attr.name.raw.match(/^(x-on:|@)([^.]+)(\..+)?$/i) ?? [])[2];

			if (!potentialName) {
				return attr;
			}

			return {
				...attr,
				potentialName: `on${potentialName.toLowerCase()}`,
				// TODO: Postpone due to inability to distinguish between custom and native events
				isDirective: true as const,
				isDynamicValue: true as const,
			};
		}

		/**
		 * @see https://alpinejs.dev/directives/transition
		 */
		if (/^x-transition(?:$|:|\.)/.test(name)) {
			return {
				...attr,
				isDirective: true as const,
			};
		}

		return attr;
	}
}

/**
 * Singleton Alpine.js parser instance for use by the markuplint engine.
 */
export const parser = new AlpineParser();
