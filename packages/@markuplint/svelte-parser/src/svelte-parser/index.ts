import type { AST } from 'svelte/compiler';

import { parse } from 'svelte/compiler';

export type SvelteNode = AST.Text | Tag | ElementLike | AST.Comment | SvelteBlock;
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

type Tag = AST.ExpressionTag | AST.HtmlTag | AST.ConstTag | AST.DebugTag | AST.RenderTag;

type Directive =
	| AST.AnimateDirective
	| AST.BindDirective
	| AST.ClassDirective
	| AST.LetDirective
	| AST.OnDirective
	| AST.StyleDirective
	| AST.TransitionDirective
	| AST.UseDirective;

type ElementLike =
	| AST.Component
	| AST.TitleElement
	| AST.SlotElement
	| AST.RegularElement
	| AST.SvelteBody
	| AST.SvelteComponent
	| AST.SvelteDocument
	| AST.SvelteElement
	| AST.SvelteFragment
	| AST.SvelteHead
	| AST.SvelteOptionsRaw
	| AST.SvelteSelf
	| AST.SvelteWindow;
