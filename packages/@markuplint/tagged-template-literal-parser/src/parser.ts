import type { MLASTDocument } from '@markuplint/ml-ast';
import type { ParseOptions } from '@markuplint/parser-utils';

import { HtmlParser } from '@markuplint/html-parser';
import { ParserError } from '@markuplint/parser-utils';

import { findTemplateLiterals } from './find-template-literals.js';

/**
 * Parser for tagged template literals containing HTML.
 * Extracts HTML content from tagged template expressions (e.g., `html\`<div>...</div>\``)
 * and delegates HTML parsing to the standard HtmlParser with `${...}` expressions
 * masked as preprocessor-specific blocks.
 */
export class TaggedTemplateLiteralParser extends HtmlParser {
	readonly #tagNames: readonly string[];

	/**
	 * Creates a new parser for tagged template literals.
	 *
	 * @param tagNames - Tag function names to recognize as HTML templates (default: `['html']`).
	 *   For example, `['html', 'svg']` would match both `html\`...\`` and `svg\`...\``.
	 *   Member expressions are resolved to their property name, so `LitElement.html\`...\``
	 *   matches the tag name `'html'`.
	 */
	constructor(tagNames: readonly string[] = ['html']) {
		super({
			ignoreTags: [
				{
					type: 'ttl-expression',
					start: '${',
					end: '}',
				},
			],
		});
		this.#tagNames = tagNames;
	}

	/**
	 * Parses a TypeScript/JavaScript source file, extracts tagged template literals
	 * matching the configured tag names, and parses their HTML content.
	 * Each `${...}` expression within the template is preserved as a
	 * `#ps:ttl-expression` preprocessor-specific block in the resulting AST.
	 *
	 * @param rawCode - The full TypeScript/JavaScript source code
	 * @param options - Parse options forwarded to the underlying HTML parser
	 * @returns The parsed AST document containing nodes from all matched template literals
	 */
	parse(rawCode: string, options?: ParseOptions): MLASTDocument {
		let templateLiterals;
		try {
			templateLiterals = findTemplateLiterals(rawCode, this.#tagNames);
		} catch (error) {
			if (error instanceof Error && 'location' in error) {
				const loc = error.location as { start?: { line: number; column: number } };
				if (loc.start) {
					throw new ParserError(error.message, {
						line: loc.start.line,
						col: loc.start.column,
					});
				}
			}
			throw error;
		}

		if (templateLiterals.length === 0) {
			return {
				raw: rawCode,
				nodeList: [],
				isFragment: true,
			};
		}

		// Parse all matched template literals and merge their node lists.
		const allNodeLists: MLASTDocument['nodeList'][number][] = [];

		for (const tpl of templateLiterals) {
			const { line: offsetLine, col: offsetColumn } = getLineAndColumn(rawCode, tpl.contentStart);

			const doc = super.parse(tpl.htmlContent, {
				...options,
				offsetOffset: tpl.contentStart,
				offsetLine,
				offsetColumn,
			});

			allNodeLists.push(...doc.nodeList);
		}

		return {
			raw: rawCode,
			nodeList: allNodeLists,
			isFragment: true,
		};
	}
}

/**
 * Computes the 1-based line number and 1-based column for a given offset in a string.
 *
 * @param source - The source string
 * @param offset - The character offset (0-based)
 * @returns An object with 1-based `line` and `col` values
 */
function getLineAndColumn(source: string, offset: number): { line: number; col: number } {
	let line = 1;
	let col = 1;
	for (let i = 0; i < offset; i++) {
		if (source[i] === '\n') {
			line++;
			col = 1;
		} else {
			col++;
		}
	}
	return { line, col };
}

/**
 * Default singleton parser instance configured to match the `html` tag name.
 */
export const parser = new TaggedTemplateLiteralParser();
