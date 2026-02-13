import * as VueESLintParser from 'vue-eslint-parser';

/** The top-level AST produced by vue-eslint-parser, containing template body and comments. */
export type VueTokens = VueESLintParser.AST.ESLintProgram;

/**
 * Parses a Vue SFC template string into a vue-eslint-parser AST.
 *
 * @param vueTemplate - The raw Vue template source code
 * @returns The parsed AST program node containing the template body
 */
export function vueParse(vueTemplate: string): VueTokens {
	const ast = VueESLintParser.parse(vueTemplate, { parser: false });
	return ast;
}

export type VElement = VueESLintParser.AST.VElement;
export type VText = VueESLintParser.AST.VText;
export type VExpressionContainer = VueESLintParser.AST.VExpressionContainer;

/** Union of AST node types that can appear as children in a Vue template. */
export type ASTNode = VElement | VText | VExpressionContainer;

/** Represents a comment token in the Vue template AST with location information. */
export type ASTComment = VueESLintParser.AST.Token & VueESLintParser.AST.HasLocation;
