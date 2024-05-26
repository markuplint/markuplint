import type { SvelteIfBlock, SvelteNode } from './svelte-parser/index.js';
import type {
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTPreprocessorSpecificBlockConditionalType,
} from '@markuplint/ml-ast';
import type { ChildToken, ParseOptions, Token } from '@markuplint/parser-utils';

import { getNamespace } from '@markuplint/html-parser';
import { ParserError, Parser, AttrState } from '@markuplint/parser-utils';

import { blockOrTags, svelteParse } from './svelte-parser/index.js';

class SvelteParser extends Parser<SvelteNode> {
	readonly specificBindDirective: ReadonlySet<string> = new Set(['group', 'this']);

	constructor() {
		super({
			endTagType: 'xml',
			tagNameCaseSensitive: true,
			ignoreTags: [
				{
					type: 'Script',
					start: '<script',
					end: '</script>',
				},
				{
					type: 'Style',
					start: '<style',
					end: '</style>',
				},
			],
			maskChar: '-',
		});
	}

	tokenize() {
		return {
			ast: svelteParse(this.rawCode),
			isFragment: true,
		};
	}

	parse(raw: string, options?: ParseOptions) {
		return super.parse(raw, {
			...options,
			ignoreFrontMatter: false,
		});
	}

	parseError(error: any) {
		if (error instanceof Error && 'start' in error && 'end' in error && 'frame' in error) {
			// @ts-ignore
			const token = this.sliceFragment(error.start.character, error.end.character);
			throw new ParserError(error.message + '\n' + error.frame, token);
		}

		return super.parseError(error);
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: SvelteNode,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		let token = this.sliceFragment(originNode.start, originNode.end);
		const parentNamespace =
			parentNode && 'namespace' in parentNode ? parentNode.namespace : 'http://www.w3.org/1999/xhtml';

		/**
		 * Temporarily correct location shift issue with the new parser.
		 */
		if (blockOrTags.includes(originNode.type) && !token.raw.startsWith('{')) {
			let start = token.startOffset;
			while (this.rawCode[start] !== '{') {
				start--;
			}
			token = {
				...token,
				...this.sliceFragment(start, originNode.end),
			};
		}

		switch (originNode.type) {
			case 'Text': {
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			case 'Comment': {
				return this.visitComment({
					...token,
					depth,
					parentNode,
				});
			}
			case 'ExpressionTag': {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: 'ExpressionTag',
				});
			}
			case 'Component':
			case 'RegularElement': {
				const children = originNode.fragment.nodes ?? [];
				const reEndTag = new RegExp(`</${originNode.name}\\s*>$`, 'i');
				const startTagEndOffset =
					children.length > 0
						? children[0]?.start ?? 0
						: token.raw.replace(reEndTag, '').length + token.startOffset;
				const startTagLocation = this.sliceFragment(token.startOffset, startTagEndOffset);

				return this.visitElement(
					{
						...startTagLocation,
						depth,
						parentNode,
						nodeName: originNode.name,
						namespace: getNamespace(originNode.name, parentNamespace),
					},
					originNode.fragment.nodes,
					{
						createEndTagToken: () => {
							if (!reEndTag.test(token.raw)) {
								return null;
							}
							const endTagRawMatched = token.raw.match(reEndTag);
							if (!endTagRawMatched) {
								throw new Error('Parse error');
							}
							const endTagRaw = endTagRawMatched[0];
							const endTagStartOffset = token.startOffset + token.raw.lastIndexOf(endTagRaw);
							const endTagEndOffset = endTagStartOffset + endTagRaw.length;
							const endTagLocation = this.sliceFragment(endTagStartOffset, endTagEndOffset);

							return {
								...endTagLocation,
								depth,
								parentNode,
							};
						},
					},
				);
			}
			case 'IfBlock': {
				const expressions: MLASTPreprocessorSpecificBlock[] = [];
				const ifElseBlocks = this.#traverseIfBlock(originNode, token.startOffset);
				for (const ifElseBlock of ifElseBlocks) {
					const expression = this.visitPsBlock(
						{
							...ifElseBlock,
							depth,
							parentNode,
							nodeName: ifElseBlock.type,
						},
						ifElseBlock.children,
						(
							{
								if: 'if',
								elseif: 'if:elseif',
								else: 'if:else',
								'/if': 'end',
							} as const
						)[ifElseBlock.type],
					)[0];
					expressions.push(expression);
				}
				return expressions;
			}
			default: {
				return this.visitExpression(
					{
						...token,
						depth,
						parentNode,
					},
					originNode,
				);
			}
		}
	}

	visitPsBlock(
		token: ChildToken & {
			readonly nodeName: string;
		},
		childNodes: readonly SvelteNode[] = [],
		conditionalType: MLASTPreprocessorSpecificBlockConditionalType = null,
	): readonly [MLASTPreprocessorSpecificBlock] {
		const nodes = super.visitPsBlock(token, childNodes, conditionalType);
		const block = nodes.at(0);

		if (!block || block.type !== 'psblock') {
			throw new ParserError('Parse error', token);
		}

		if (nodes.length > 1) {
			throw new ParserError('Parse error', nodes.at(1)!);
		}

		return [block];
	}

	visitChildren(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		children: readonly SvelteNode[],
		parentNode: MLASTParentNode | null,
	): never[] {
		const siblings = super.visitChildren(children, parentNode);
		if (siblings.length > 0) {
			throw new ParserError('Discovered child nodes with differing hierarchy levels', siblings[0]!);
		}
		return [];
	}

	visitAttr(token: Token) {
		const attr = super.visitAttr(token, {
			quoteSet: [
				{ start: '"', end: '"', type: 'string' },
				{ start: "'", end: "'", type: 'string' },
				{ start: '{', end: '}', type: 'script' },
			],
			startState:
				// is shorthand attribute
				token.raw.trim().startsWith('{') ? AttrState.BeforeValue : AttrState.BeforeName,
		});

		if (attr.type === 'spread') {
			return attr;
		}

		let isDynamicValue = attr.startQuote.raw === '{' || undefined;

		let potentialName: string | undefined;
		let isDirective: true | undefined;
		let isDuplicatable = false;

		if (isDynamicValue && attr.name.raw === '') {
			potentialName = attr.value.raw;
		}

		const [baseName, subName] = attr.name.raw.split(':');

		if (subName) {
			isDirective = true;

			if (baseName === 'bind' && !this.specificBindDirective.has(subName)) {
				potentialName = subName;
				isDirective = undefined;
				isDynamicValue = true;
			}
		}

		if (baseName?.toLowerCase() === 'class') {
			isDuplicatable = true;

			if (subName) {
				potentialName = 'class';
				isDynamicValue = true;
			}
		}

		if (attr.startQuote.raw === '{' && attr.endQuote.raw === '}') {
			isDynamicValue = true;
		}

		return {
			...attr,
			isDynamicValue,
			isDirective,
			isDuplicatable,
			potentialName,
		};
	}

	/**
	 * > A lowercase tag, like `<div>`, denotes a regular HTML element.
	 * A capitalised tag, such as `<Widget>` or `<Namespace.Widget>`, indicates a component.
	 *
	 * @see https://svelte.io/docs/basic-markup#tags
	 * @param nodeName
	 * @returns
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, /^[A-Z]|\./);
	}

	#traverseIfBlock(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originBlockNode: SvelteIfBlock,
		start: number,
		type: 'if' | 'elseif' | 'else' = 'if',
	) {
		const result: (Token & { children: SvelteNode[]; type: 'if' | 'elseif' | 'else' | '/if' })[] = [];

		const end = originBlockNode.consequent.nodes?.[0]?.start ?? originBlockNode.end;
		const tag = this.sliceFragment(start, end);
		const children = originBlockNode.consequent.nodes;

		result.push({ ...tag, children, type });

		if (originBlockNode.alternate) {
			if (originBlockNode.alternate.nodes?.[0]?.type === 'IfBlock') {
				const elseif = this.#traverseIfBlock(
					originBlockNode.alternate.nodes[0],
					children.at(-1)?.end ?? start,
					'elseif',
				);
				result.push(...elseif);
			} else {
				const start = children.at(-1)?.end ?? originBlockNode.end;
				const end = originBlockNode.alternate.nodes?.[0]?.start;
				const tag = this.sliceFragment(start, end);
				result.push({
					...tag,
					children: originBlockNode.alternate.nodes,
					type: 'else',
				});
			}
		}

		{
			const start = result.at(-1)?.children.at(-1)?.end ?? originBlockNode.end;
			const end = originBlockNode.end;
			const tag = this.sliceFragment(start, end);
			if (tag.raw) {
				result.push({ ...tag, children: [], type: '/if' });
			}
		}

		return result;
	}

	visitExpression(
		token: ChildToken,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originBlockNode: SvelteNode,
	) {
		const props = ['', 'else', 'pending', 'then', 'catch'];
		const expressions: MLASTPreprocessorSpecificBlock[] = [];

		if (originBlockNode.type === 'IfBlock') {
			const ifElseBlocks = this.#traverseIfBlock(originBlockNode);
			for (const ifElseBlock of ifElseBlocks) {
				const expression = this.visitPsBlock(
					{
						...ifElseBlock,
						depth: token.depth,
						parentNode: token.parentNode,
						nodeName: ifElseBlock.nodeName,
					},
					ifElseBlock.children,
					(
						{
							if: 'if',
							elseif: 'if:elseif',
							else: 'if:else',
							'/if': 'end',
						} as const
					)[ifElseBlock.nodeName],
				)[0];
				expressions.push(expression);
			}
			return expressions;
		}

		const blockType = originBlockNode.type.toLowerCase().replace('block', '');

		const nodeList = new Map<SvelteNode, MLASTPreprocessorSpecificBlockConditionalType>();

		for (const prop of props) {
			let node: SvelteNode | null = (originBlockNode[prop] ?? originBlockNode) as SvelteNode;

			if (nodeList.has(node)) {
				continue;
			}

			if (node.type === 'ElseBlock' && node.children?.[0]?.elseif) {
				node = node.children[0];

				while (node != null) {
					if (!['IfBlock', 'ElseBlock'].includes(node.type)) {
						break;
					}
					const type: MLASTPreprocessorSpecificBlockConditionalType = node.elseif ? 'if:elseif' : 'if:else';
					nodeList.set(node, type);

					node = node.else ?? node.children?.[0] ?? null;
				}
				continue;
			}

			const typeMap: Record<string, MLASTPreprocessorSpecificBlockConditionalType> = {
				if: 'if',
				else: 'if:else',
				each: 'each',
				pending: 'await',
				then: 'await:then', // eslint-disable-line unicorn/no-thenable
				catch: 'await:catch',
			};

			const type: MLASTPreprocessorSpecificBlockConditionalType = typeMap[prop || blockType] ?? null;

			nodeList.set(node, type);
		}

		let lastChild: SvelteNode | null = null;
		for (const [node, _type] of nodeList.entries()) {
			let type: MLASTPreprocessorSpecificBlockConditionalType = _type;
			let start = node.start;
			let end = node.end;

			if (type === 'await') {
				start = originBlockNode.start;
			}

			end = node.children?.[0]?.start ?? end;

			if (type === 'if:else' && originBlockNode.type === 'EachBlock') {
				type = 'each:empty';
				start = lastChild?.end ?? start;
			}

			if (
				(['if:else', 'if:elseif'] as MLASTPreprocessorSpecificBlockConditionalType[]).includes(type) &&
				originBlockNode.type === 'IfBlock'
			) {
				start = lastChild?.end ?? start;
			}

			const tag = this.sliceFragment(start, end);

			if (type === 'if:else' && node.type === 'ElseBlock' && node.children?.[0]?.type === 'IfBlock') {
				type = 'if:elseif';
			}

			if (node.children && Array.isArray(node.children)) {
				lastChild = node.children.at(-1) ?? null;
			}

			if (tag.raw === '') {
				continue;
			}

			const expression = this.visitPsBlock(
				{
					...tag,
					depth: token.depth,
					parentNode: token.parentNode,
					nodeName: type ?? blockType,
				},
				node.children,
				type,
			)[0];
			expressions.push(expression);
		}

		const lastText = this.sliceFragment(lastChild?.end ?? originBlockNode.end, originBlockNode.end);

		if (lastText.raw) {
			// Cut before whitespace
			const index = lastText.raw.search(/\S/);
			const lastToken = this.sliceFragment(lastText.startOffset + index, originBlockNode.end);

			if (lastToken.raw) {
				const expression = this.visitPsBlock(
					{
						...lastToken,
						depth: token.depth,
						parentNode: token.parentNode,
						nodeName: '/' + blockType,
					},
					[],
					'end',
				)[0];

				expressions.push(expression);
			}
		}

		return expressions;
	}
}

export const parser = new SvelteParser();
