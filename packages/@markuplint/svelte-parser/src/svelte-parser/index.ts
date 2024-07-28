import type {
	Attribute,
	AwaitBlock,
	Block,
	Comment,
	Directive,
	EachBlock,
	ElementLike,
	IfBlock,
	SpreadAttribute,
	Tag,
	Text,
} from 'svelte/compiler';

import { parse } from 'svelte/compiler';

export type SvelteNode = Text | Tag | ElementLike | Comment | Block;
export type SvelteIfBlock = IfBlock;
export type SvelteEachBlock = EachBlock;
export type SvelteAwaitBlock = AwaitBlock;

export function svelteParse(template: string): SvelteNode[] {
	const ast = parse(template, { modern: true });
	return ast.fragment.nodes ?? [];
}

export type SvelteDirective = Directive | Attribute | SpreadAttribute;
