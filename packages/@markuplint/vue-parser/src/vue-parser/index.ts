import * as VueESLintParser from 'vue-eslint-parser';

export type VueTokens = VueESLintParser.AST.ESLintProgram;

export default function vueParse(vueTemplate: string): VueTokens {
	const ast = VueESLintParser.parse(vueTemplate, { parser: false });
	return ast;
}

export type ASTNode =
	| VueESLintParser.AST.VElement
	| VueESLintParser.AST.VText
	| VueESLintParser.AST.VExpressionContainer;

export type ASTComment = VueESLintParser.AST.Token & VueESLintParser.AST.HasLocation;
