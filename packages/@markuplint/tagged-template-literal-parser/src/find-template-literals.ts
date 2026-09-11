import type { TSESTree } from '@typescript-eslint/types';

import { AST_NODE_TYPES, parse } from '@typescript-eslint/typescript-estree';

const EXPR_START_LEN = 2;
const EXPR_END_LEN = 1;

export interface TemplateExpression {
	readonly raw: string;
	readonly start: number;
	readonly end: number;
}

export interface TemplateLiteralInfo {
	readonly tagName: string;
	readonly htmlContent: string;
	readonly contentStart: number;
	readonly contentEnd: number;
	/**
	 * Not consumed by the parser yet — these precise AST-derived positions are
	 * intended to eventually replace the delimiter-based `ignoreTags` masking
	 * in `TaggedTemplateLiteralParser`, which may incorrectly split expressions
	 * containing nested `}` characters.
	 */
	readonly expressions: readonly TemplateExpression[];
}

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

export function findTemplateLiterals(
	sourceCode: string,
	tagNames: readonly string[] = ['html'],
): readonly TemplateLiteralInfo[] {
	const ast = parse(sourceCode, {
		comment: false,
		errorOnUnknownASTType: false,
		// Intentionally disabled: JSX/TSX files are out of scope for this package
		// and are handled by `@markuplint/jsx-parser` instead.
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
