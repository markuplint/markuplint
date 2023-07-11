import type { Directive, TemplateNode, Attribute, SpreadAttribute } from 'svelte/types/compiler/interfaces';

import { parse } from 'svelte/compiler';

export type SvelteNode = TemplateNode;

export default function svelteParse(template: string): SvelteNode[] {
	const ast = parse(template, { customElement: true });

	const start = ast.html.start;
	const children = ast.html.children ?? [];
	if (children[0] && children[0].end === start) {
		children.shift();
	}

	return children;
}

export type SvelteDirective = Directive | Attribute | SpreadAttribute;
