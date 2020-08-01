import * as VueESLintParser from 'vue-eslint-parser';

export default function vueParse(vueTemplate: string): VueESLintParser.AST.ESLintProgram {
	const ast = VueESLintParser.parse(vueTemplate, { parser: false });
	return ast;
}

export type ASTNode =
	| VueESLintParser.AST.VElement
	| VueESLintParser.AST.VText
	| VueESLintParser.AST.VExpressionContainer;
