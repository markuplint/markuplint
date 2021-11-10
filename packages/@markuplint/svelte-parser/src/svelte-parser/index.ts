import type { Directive, TemplateNode } from 'svelte/types/compiler/interfaces';

import { parse } from 'svelte/compiler';

export type SvelteNode = TemplateNode;

export default function svelteParse(template: string) {
	const ast = parse(template, { customElement: true });

	const start = ast.html.start;
	const children = ast.html.children || [];
	if (children[0] && children[0].end === start) {
		children.shift();
	}

	return children;
}

export type SvelteDirective = Directive;
