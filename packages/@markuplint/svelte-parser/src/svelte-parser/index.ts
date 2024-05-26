import type {
	Attribute,
	Block,
	Comment,
	Directive,
	ElementLike,
	IfBlock,
	SpreadAttribute,
	Tag,
	Text,
} from 'svelte/compiler';

import { parse } from 'svelte/compiler';

export type SvelteNode = Text | Tag | ElementLike | Comment | Block;
export type SvelteIfBlock = IfBlock;

export function svelteParse(template: string): SvelteNode[] {
	const ast = parse(template, { modern: true });
	return ast.fragment.nodes ?? [];
}

export type SvelteDirective = Directive | Attribute | SpreadAttribute;

export const blockOrTags = [
	'IfBlock',
	'EachBlock',
	'AwaitBlock',
	'KeyBlock',
	'SnippetBlock',
	'HtmlTag',
	'DebugTag',
	'ConstTag',
	'RenderTag',
];
