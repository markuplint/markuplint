import type { AST } from 'svelte/compiler';

import { parse } from 'svelte/compiler';

export type SvelteNode = AST.Text | AST.Comment | AST.Tag | AST.ElementLike | AST.Block;

export type SvelteIfBlock = AST.IfBlock;

export type SvelteEachBlock = AST.EachBlock;

export type SvelteAwaitBlock = AST.AwaitBlock;

/**
 * The `modern: true` option opts into Svelte 5's modern AST format,
 * which is required to receive Svelte 5 node types such as
 * `SnippetBlock`, `RenderTag`, and `SvelteBoundary`.
 */
export function svelteParse(template: string): SvelteNode[] {
	const ast = parse(template, { modern: true });
	return ast.fragment.nodes ?? [];
}

/**
 * What the source is read in order as, so that a `<style` is a `<style>` block only where one can start: a
 * comment (`<!-- … -->`) and a `<script>` block are consumed whole, and a `<style` in their text is not
 * one. A `<style>` block runs from `<style` to the first `</style>`, or to the end of the source when it
 * is not closed; the name ends there (`<style-guide>` is a custom element).
 *
 * It does not read an attribute value or an expression (`{…}`), so a `<style` in one is still taken as
 * a block.
 */
const SOURCE_BLOCK =
	/<!--[\s\S]*?(?:-->|$)|<script(?=[\s/>])[\s\S]+?(?:<\/script>|$)|<style(?=[\s/>])[\s\S]+?(?:<\/style>|$)/g;

/**
 * Replaces each `<style>` block of the source with what `replacer` returns, and leaves everything else.
 *
 * @param template - The source of the component
 * @param replacer - Gives the replacement of a `<style>` block, from the block and its offset in `template`
 * @returns The source with the replaced blocks
 */
function replaceStyleBlocks(template: string, replacer: (block: string, offset: number) => string): string {
	return template.replaceAll(SOURCE_BLOCK, (block: string, offset: number) =>
		block.startsWith('<style') ? replacer(block, offset) : block,
	);
}

/**
 * The shortest block that a comment (`<!---->`) can mask. A shorter one is `<style` cut off by the end of
 * the source, which no comment of the same length can stand for.
 */
const MIN_MASKABLE_LENGTH = '<!---->'.length;

/**
 * Replaces a `<style>` block with a comment (`<!---…--->`) of the same length and line breaks, so that
 * every offset in the source stays the offset in the result. A block that is too short to be a comment
 * is left as it is, so that Svelte reports the syntax error of the source, not one of a mask.
 *
 * @param block - A `<style>` block
 * @returns The comment
 */
function maskStyleBlock(block: string): string {
	if (block.length < MIN_MASKABLE_LENGTH) {
		return block;
	}
	return '<!' + block.slice(2, -1).replaceAll(/[^\n]/g, '-') + '>';
}

/**
 * Parses a component, keeping the top-level `<style>` out of Svelte's CSS parser and the nested one in
 * the markup.
 *
 * > There can only be one top-level <style> tag per component.
 * >
 * > However, it is possible to have a <style> tag nested inside other elements or logic blocks.
 * >
 * > In that case, the <style> tag will be inserted as-is into the DOM; no scoping or processing will
 * > be done on the <style> tag.
 *
 * The top-level one is the CSS of the component, and Svelte reads it as CSS (`lang="scss"` is not CSS and
 * fails: "Expected a valid CSS identifier"), so it is masked. The nested one is an element whose content
 * is text, which Svelte reads without parsing it. What is top-level cannot be told from the source by a
 * pattern, so the source is parsed with every `<style>` masked first, and the ones that are children of
 * the fragment are the top-level ones. Without a nested one that parse is the result.
 *
 * @see https://svelte.dev/docs/svelte/nested-style-elements
 * @param template - The source of the component
 * @returns The nodes, and the offsets in `template` where a top-level `<style>` starts: the nodes have
 * a comment (`Comment`) there, and the positions of every node are positions in `template`
 */
export function svelteParseComponent(template: string): {
	readonly nodes: SvelteNode[];
	readonly topLevelStyleStarts: ReadonlySet<number>;
} {
	const blocks: { readonly start: number; readonly end: number }[] = [];
	const everyStyleMasked = replaceStyleBlocks(template, (block, offset) => {
		blocks.push({ start: offset, end: offset + block.length });
		return maskStyleBlock(block);
	});

	if (blocks.length === 0) {
		return { nodes: svelteParse(template), topLevelStyleStarts: new Set() };
	}

	const topLevelStyleStarts = new Set<number>();
	const nodesOfEveryMasked = svelteParse(everyStyleMasked);
	for (const node of nodesOfEveryMasked) {
		if (node.type === 'Comment' && blocks.some(block => block.start === node.start && block.end === node.end)) {
			topLevelStyleStarts.add(node.start);
		}
	}

	if (topLevelStyleStarts.size === blocks.length) {
		return { nodes: nodesOfEveryMasked, topLevelStyleStarts };
	}

	const onlyTopLevelMasked = replaceStyleBlocks(template, (block, offset) =>
		topLevelStyleStarts.has(offset) ? maskStyleBlock(block) : block,
	);

	return { nodes: svelteParse(onlyTopLevelMasked), topLevelStyleStarts };
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
