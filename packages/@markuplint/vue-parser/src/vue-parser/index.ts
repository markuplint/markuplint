import * as VueESLintParser from 'vue-eslint-parser';

export type VueTokens = VueESLintParser.AST.ESLintProgram;

/**
 * The `parser: false` option makes vue-eslint-parser skip parsing the
 * `<script>` block, because only the `<template>` block is relevant for
 * markuplint. vue-eslint-parser accepts both Vue 2 and Vue 3 template
 * syntax and produces the same node types for both, so the parser does not
 * need to distinguish Vue versions at the AST level.
 */
export function vueParse(vueTemplate: string): VueTokens {
	const ast = VueESLintParser.parse(vueTemplate, { parser: false });
	return ast;
}

export type VElement = VueESLintParser.AST.VElement;
export type VText = VueESLintParser.AST.VText;
export type VExpressionContainer = VueESLintParser.AST.VExpressionContainer;

export type ASTNode = VElement | VText | VExpressionContainer;

export type ASTComment = VueESLintParser.AST.Token & VueESLintParser.AST.HasLocation;
