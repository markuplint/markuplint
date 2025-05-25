import type { AST } from 'svelte/compiler';

import { parse } from 'svelte/compiler';

export type SvelteNode = AST.Text | AST.Comment | AST.Tag | AST.ElementLike | AST.Block;
export type SvelteIfBlock = AST.IfBlock;
export type SvelteEachBlock = AST.EachBlock;
export type SvelteAwaitBlock = AST.AwaitBlock;

export function svelteParse(template: string): SvelteNode[] {
	const ast = parse(template, { modern: true });
	return ast.fragment.nodes ?? [];
}

export type SvelteDirective = Directive | AST.Attribute | AST.SpreadAttribute;

export type SvelteBlock =
	| AST.EachBlock
	| AST.IfBlock
	| AST.AwaitBlock
	| AST.KeyBlock
	| AST.SnippetBlock
	| AST.SvelteBoundary;

type Directive =
	| AST.AnimateDirective
	| AST.BindDirective
	| AST.ClassDirective
	| AST.LetDirective
	| AST.OnDirective
	| AST.StyleDirective
	| AST.TransitionDirective
	| AST.UseDirective;
