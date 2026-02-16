import type { TSESTree } from '@typescript-eslint/types';

import { AST_NODE_TYPES, parse } from '@typescript-eslint/typescript-estree';

/** Length of the `${` expression start delimiter */
const EXPR_START_LEN = 2;
/** Length of the `}` expression end delimiter */
const EXPR_END_LEN = 1;

/**
 * Represents a template literal expression (`${...}`) within a tagged template.
 */
export interface TemplateExpression {
	/** The raw source text of the expression including `${` and `}` */
	readonly raw: string;
	/** Start offset in the original source */
	readonly start: number;
	/** End offset in the original source */
	readonly end: number;
}

/**
 * Represents a tagged template literal found in the source code.
 */
export interface TemplateLiteralInfo {
	/** The tag name (e.g., 'html') */
	readonly tagName: string;
	/** The full raw content between the backticks (excluding the backticks themselves) */
	readonly htmlContent: string;
	/** Start offset of the content (after the opening backtick) */
	readonly contentStart: number;
	/** End offset of the content (before the closing backtick) */
	readonly contentEnd: number;
	/** The expressions (`${...}`) found within the template literal */
	readonly expressions: readonly TemplateExpression[];
}

/**
 * Resolves the tag name from a TaggedTemplateExpression's tag node.
 * For identifiers (e.g., `html`), returns the name directly.
 * For member expressions (e.g., `LitElement.html`), returns the property name.
 * Returns an empty string for unrecognized tag forms.
 *
 * @param tag - The AST node representing the tag expression
 * @returns The resolved tag name, or an empty string if unresolvable
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function resolveTagName(tag: TSESTree.Expression): string {
	switch (tag.type) {
		case AST_NODE_TYPES.Identifier: {
			return tag.name;
		}
		case AST_NODE_TYPES.MemberExpression: {
			if (tag.property.type === AST_NODE_TYPES.Identifier) {
				return tag.property.name;
			}
			return '';
		}
		default: {
			return '';
		}
	}
}

/**
 * Recursively searches an AST for TaggedTemplateExpression nodes matching
 * the specified tag names.
 *
 * @param node - The AST node to search
 * @param tagNames - Set of tag names to match (e.g., `html`, `svg`)
 * @param results - Accumulator for found template literals
 * @param sourceCode - The original source code string
 */
function searchTaggedTemplates(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: TSESTree.Node,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tagNames: ReadonlySet<string>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	results: TemplateLiteralInfo[],
	sourceCode: string,
) {
	if (node.type === AST_NODE_TYPES.TaggedTemplateExpression) {
		const tagName = resolveTagName(node.tag);
		if (tagNames.has(tagName)) {
			const quasi = node.quasi;
			const contentStart = quasi.range[0] + 1; // skip opening backtick
			const contentEnd = quasi.range[1] - 1; // skip closing backtick
			const htmlContent = sourceCode.slice(contentStart, contentEnd);

			const expressions: TemplateExpression[] = quasi.expressions.map(expr => ({
				raw: sourceCode.slice(expr.range[0] - EXPR_START_LEN, expr.range[1] + EXPR_END_LEN),
				start: expr.range[0] - EXPR_START_LEN,
				end: expr.range[1] + EXPR_END_LEN,
			}));

			results.push({
				tagName,
				htmlContent,
				contentStart,
				contentEnd,
				expressions,
			});
		}
	}

	// Manual AST traversal via Object.keys instead of typescript-estree's simpleTraverse,
	// because simpleTraverse does not expose enough control over which nodes are visited
	// and would add an additional import dependency for minimal benefit.
	for (const key of Object.keys(node)) {
		if (key === 'parent') {
			continue;
		}
		const value = (node as unknown as Record<string, unknown>)[key];
		if (value && typeof value === 'object') {
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item && typeof item === 'object' && 'type' in item) {
						searchTaggedTemplates(item as TSESTree.Node, tagNames, results, sourceCode);
					}
				}
			} else if ('type' in value) {
				searchTaggedTemplates(value as TSESTree.Node, tagNames, results, sourceCode);
			}
		}
	}
}

/**
 * Finds all tagged template literals in a TypeScript/JavaScript source file
 * that match the given tag names. Uses `@typescript-eslint/typescript-estree`
 * to parse the source and recursively searches the AST for
 * `TaggedTemplateExpression` nodes whose tag resolves to one of the specified names.
 *
 * @param sourceCode - The raw TypeScript/JavaScript source code to search
 * @param tagNames - Array of tag function names to match (default: `['html']`)
 * @returns Array of template literal information objects, ordered by their position in the source
 */
export function findTemplateLiterals(
	sourceCode: string,
	tagNames: readonly string[] = ['html'],
): readonly TemplateLiteralInfo[] {
	const ast = parse(sourceCode, {
		comment: false,
		errorOnUnknownASTType: false,
		jsx: false,
		loc: true,
		range: true,
		tokens: false,
	});

	const tagNameSet = new Set(tagNames);
	const results: TemplateLiteralInfo[] = [];

	for (const statement of ast.body) {
		searchTaggedTemplates(statement, tagNameSet, results, sourceCode);
	}

	return results;
}
