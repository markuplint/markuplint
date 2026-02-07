import type { AST } from 'svelte/compiler';

import { parse } from 'svelte/compiler';

/** Union of Svelte AST node types that can appear as children in a Svelte template fragment. */
export type SvelteNode = AST.Text | AST.Comment | AST.Tag | AST.ElementLike | AST.Block;

/** Represents a Svelte `{#if}` block with consequent, alternate, and elseif branches. */
export type SvelteIfBlock = AST.IfBlock;

/** Represents a Svelte `{#each}` block with iteration body and optional fallback. */
export type SvelteEachBlock = AST.EachBlock;

/** Represents a Svelte `{#await}` block with pending, then, and catch branches. */
export type SvelteAwaitBlock = AST.AwaitBlock;

/**
 * Parses a Svelte template string into an array of top-level AST nodes
 * using the Svelte compiler's modern parser mode.
 *
 * @param template - The raw Svelte template source code
 * @returns An array of top-level Svelte AST nodes from the template fragment
 */
export function svelteParse(template: string): SvelteNode[] {
	const ast = parse(template, { modern: true });
	return ast.fragment.nodes ?? [];
}

/** Union of all Svelte directive and attribute types that can appear on elements. */
export type SvelteDirective = Directive | AST.Attribute | AST.SpreadAttribute;

/** Union of all Svelte block types that have opening/closing tag syntax. */
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
