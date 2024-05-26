import type { Directive, TemplateNode, Attribute, SpreadAttribute } from 'svelte/compiler';

import { parse } from 'svelte/compiler';

export type SvelteNode = TemplateNode;

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
