import type { SvelteParser } from './parser.js';
import type { ChildToken, Token } from '@markuplint/parser-utils';
import type { Block } from 'svelte/compiler';

export function parseBlock(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parser: SvelteParser,
	token: ChildToken,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originBlockNode: Block,
) {
	const range = token.raw;

	/**
	 * `{#xxx}...{:xxx}...{/xxx}`
	 *             find___^
	 */
	// eslint-disable-next-line regexp/strict
	const eachCloseStartIndex = range.match(/{\s*\/[a-z]+\s*}$/)?.index;
	if (eachCloseStartIndex == null) {
		throw new SyntaxError('Block close tag not found');
	}

	/**
	 * `{/xxx}`
	 */
	const closeToken = parser.sliceFragment(token.startOffset + eachCloseStartIndex, originBlockNode.end);

	const fragment =
		originBlockNode.type === 'IfBlock'
			? originBlockNode.consequent.nodes
			: originBlockNode.type === 'AwaitBlock'
				? originBlockNode.pending?.nodes
				: originBlockNode.type === 'KeyBlock'
					? originBlockNode.fragment.nodes
					: originBlockNode.body.nodes;

	const fragStart = fragment?.at(0)?.start;
	const fragEnd = fragment?.at(-1)?.end;

	/**
	 * This token does not guarantee an open tag.
	 * For example, it might include `:then` or `:else`.
	 * Therefore, this variable is not used in
	 * `EachBlock` or `AwaitBlock`.
	 * It is only used in `KeyBlock` and `SnippetBlock`.
	 */
	let openToken: Token;
	if (fragStart != null && fragEnd != null) {
		openToken = parser.sliceFragment(token.startOffset, fragStart);
	} else {
		openToken = parser.sliceFragment(token.startOffset, eachCloseStartIndex);
	}

	return {
		openToken,
		closeToken,
	};
}
