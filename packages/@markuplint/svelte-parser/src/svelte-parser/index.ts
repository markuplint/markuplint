import type { AST } from 'svelte/compiler';

import { isFatalError } from '@markuplint/shared';
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
 * a block. `svelteParseComponent` tries Svelte first so that case is handled without this mask; only the
 * last fallback still uses `SOURCE_BLOCK`.
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
 * `afterCssError` must not treat markup or script errors as a failed top-level style block: only Svelte's
 * own CSS parse step (`css_*`) qualifies.
 */
function isSvelteCssParseError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof (error as { readonly code?: unknown }).code === 'string' &&
		((error as { readonly code: string }).code as string).startsWith('css_')
	);
}

const STYLE_OPENER = /<style(?=[\s/>])/g;

/**
 * The `<style>` block that contains `index`. When a `<style` in an attribute value or an expression opens
 * a spurious range to the next `</style>`, the real block is the one that starts last among the openers
 * before `index`.
 *
 * @param template - The source of the component
 * @param index - A character offset in `template`
 * @returns The block span, if any
 */
function styleBlockAroundIndex(
	template: string,
	index: number,
): { readonly start: number; readonly end: number } | null {
	let best: { readonly start: number; readonly end: number } | null = null;
	for (const match of template.matchAll(STYLE_OPENER)) {
		if (match.index === undefined) {
			continue;
		}
		const start = match.index;
		const close = template.indexOf('</style>', start);
		const end = close === -1 ? template.length : close + '</style>'.length;
		if (index >= start && index < end && (best === null || start > best.start)) {
			best = { start, end };
		}
	}
	return best;
}

/**
 * Masks the top-level `<style>` that made Svelte throw `css_*`, then parses again with
 * {@link svelteParseComponentDirect}.
 *
 * @param template - The source of the component
 * @param error - The error from the first `parse` of `template`
 * @returns The nodes when masking one block is enough, otherwise `null`
 */
function svelteParseComponentAfterCssError(
	template: string,
	error: unknown,
): {
	readonly nodes: SvelteNode[];
	readonly topLevelStyleStarts: ReadonlySet<number>;
} | null {
	if (!isSvelteCssParseError(error) || !('start' in (error as object))) {
		return null;
	}
	const { character } = (error as { readonly start: { readonly character: number } }).start;
	const block = styleBlockAroundIndex(template, character);
	if (!block) {
		return null;
	}
	const masked =
		template.slice(0, block.start) +
		maskStyleBlock(template.slice(block.start, block.end)) +
		template.slice(block.end);
	const parsed = svelteParseComponentDirect(masked);
	if (!parsed) {
		return null;
	}
	return {
		nodes: parsed.nodes,
		topLevelStyleStarts: new Set([...parsed.topLevelStyleStarts, block.start]),
	};
}

/**
 * Builds nodes from an already-parsed component. The top-level `<style>` is `ast.css`, not in
 * `ast.fragment`, so a `Comment` at the same span stands in for `SvelteParser` `nodeize`.
 *
 * @param ast - The component root from `svelte/compiler` `parse`
 * @returns The fragment nodes and top-level style offsets in the source
 */
function nodesFromParsedComponent(ast: ReturnType<typeof parse>): {
	readonly nodes: SvelteNode[];
	readonly topLevelStyleStarts: ReadonlySet<number>;
} {
	const topLevelStyleStarts = new Set<number>();
	let nodes = ast.fragment.nodes ?? [];
	if (ast.css) {
		topLevelStyleStarts.add(ast.css.start);
		const styleNode: AST.Comment = {
			type: 'Comment',
			start: ast.css.start,
			end: ast.css.end,
			data: '',
		};
		const index = nodes.findIndex((node: SvelteNode) => node.start > ast.css!.start);
		if (index === -1) {
			nodes = [...nodes, styleNode];
		} else {
			nodes = [...nodes.slice(0, index), styleNode, ...nodes.slice(index)];
		}
	}
	return { nodes, topLevelStyleStarts };
}

/**
 * Parses `template` with Svelte when the source is valid markup and CSS.
 *
 * @param template - The source of the component
 * @returns The nodes and offsets, or `null` when `parse` fails and the failure is not fatal
 */
function svelteParseComponentDirect(template: string): {
	readonly nodes: SvelteNode[];
	readonly topLevelStyleStarts: ReadonlySet<number>;
} | null {
	try {
		return nodesFromParsedComponent(parse(template, { modern: true }));
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return null;
	}
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
 * pattern. The source is tried with Svelte as-is first (`ast.css` for the top-level one). When CSS parsing
 * fails (`css_*`), only that style block is masked and parsing is retried. When that is still not enough,
 * every `<style>` is masked and the ones that are children of the fragment are the top-level ones.
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
	let caught: unknown;
	try {
		return nodesFromParsedComponent(parse(template, { modern: true }));
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		caught = error;
	}

	const afterCssError = svelteParseComponentAfterCssError(template, caught);
	if (afterCssError) {
		return afterCssError;
	}

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
