import type { Node } from './astro-parser.js';
import type { MLASTParentNode, MLASTNodeTreeItem } from '@markuplint/ml-ast';
import type { ChildToken, Token } from '@markuplint/parser-utils';

import { AttrState, Parser, ParserError } from '@markuplint/parser-utils';

import { astroParse } from './astro-parser.js';

type State = {
	scopeNS: string;
};

class AstroParser extends Parser<Node, State> {
	constructor() {
		super(
			{
				endTagType: 'xml',
				selfCloseType: 'html+xml',
				tagNameCaseSensitive: true,
			},
			{
				scopeNS: 'http://www.w3.org/1999/xhtml',
			},
		);
	}

	tokenize() {
		return {
			ast: astroParse(this.rawCode).children,
			isFragment: true,
		};
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Node,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		if (!originNode.position) {
			throw new TypeError("Node doesn't have position");
		}

		const offset = originNode.position.start.offset;
		const endOffset = originNode.position.end?.offset;
		const token = this.sliceFragment(offset, endOffset);

		this.#updateScopeNS(originNode, parentNode);

		switch (originNode.type) {
			case 'frontmatter': {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: 'Frontmatter',
					isFragment: false,
				});
			}
			case 'doctype': {
				return this.visitDoctype({
					...token,
					depth,
					parentNode,
					name: originNode.value,
					publicId: '',
					systemId: '',
				});
			}
			case 'text': {
				if (parentNode?.type === 'psblock') {
					return [];
				}
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			case 'comment': {
				return this.visitComment({
					...token,
					depth,
					parentNode,
				});
			}
			case 'component':
			case 'custom-element':
			case 'fragment':
			case 'element': {
				const tagToken = token.raw ? token : this.sliceFragment(0);
				return this.visitElement(
					{
						...tagToken,
						depth,
						parentNode,
					},
					originNode.children,
				);
			}
			case 'expression': {
				const firstChild = originNode.children.at(0);
				const lastChild = originNode.children.at(-1);

				let startExpressionRaw = token.raw;
				let startExpressionStartLine = token.line;
				let startExpressionStartCol = token.col;

				const nodes: MLASTNodeTreeItem[] = [];

				if (firstChild && lastChild && firstChild !== lastChild) {
					const startExpressionEndOffset = firstChild.position?.end?.offset ?? endOffset ?? offset;
					const startExpressionLocation = this.sliceFragment(offset, startExpressionEndOffset);

					startExpressionRaw = startExpressionLocation.raw;
					startExpressionStartLine = startExpressionLocation.line;
					startExpressionStartCol = startExpressionLocation.col;

					const closeExpressionLocation = this.sliceFragment(
						lastChild.position?.start.offset ?? offset,
						endOffset,
					);

					nodes.push(
						...this.visitPsBlock({
							...closeExpressionLocation,
							depth,
							parentNode,
							nodeName: 'MustacheTag',
							isFragment: false,
						}),
					);
				}

				nodes.push(
					...this.visitPsBlock(
						{
							raw: startExpressionRaw,
							offset,
							line: startExpressionStartLine,
							col: startExpressionStartCol,
							depth,
							parentNode,
							nodeName: 'MustacheTag',
							isFragment: true,
						},
						originNode.children,
					),
				);

				return nodes;
			}
			default: {
				return [];
			}
		}
	}

	afterFlattenNodes(nodeList: readonly MLASTNodeTreeItem[]) {
		return super.afterFlattenNodes(nodeList, {
			exposeInvalidNode: false,
		});
	}

	visitElement(
		token: ChildToken,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		childNodes: readonly Node[],
	): readonly MLASTNodeTreeItem[] {
		const parsedNodes = this.parseCodeFragment(token, {
			// https://docs.astro.build/en/basics/astro-syntax/#fragments
			namelessFragment: true,
		});

		const startTagNode = parsedNodes.at(0);

		if (!startTagNode || startTagNode.type !== 'starttag') {
			throw new ParserError('Not found start tag', startTagNode ?? token);
		}

		return super.visitElement(startTagNode, childNodes, {
			// https://docs.astro.build/en/basics/astro-syntax/#fragments
			namelessFragment: true,
			overwriteProps: {
				namespace: this.state.scopeNS,
			},
			createEndTagToken: () => {
				if (startTagNode.selfClosingSolidus?.raw === '/') {
					return null;
				}

				const endTagNode = parsedNodes.at(-1);

				if (endTagNode?.type !== 'endtag') {
					return null;
				}

				return endTagNode ?? null;
			},
		});
	}

	visitChildren(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		children: readonly Node[],
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

		const isDynamicValue = attr.startQuote.raw === '{' || undefined;

		let potentialName: string | undefined;
		let isDirective: true | undefined;

		if (isDynamicValue && attr.name.raw === '') {
			potentialName = attr.value.raw;
		}

		/**
		 * Detects Template Directive
		 *
		 * @see https://docs.astro.build/en/reference/directives-reference/
		 */
		const [, directive] = attr.name.raw.match(/^([^:]+):([^:]+)$/) ?? [];
		if (directive) {
			const lowerCaseDirectiveName = directive.toLowerCase();
			switch (lowerCaseDirectiveName) {
				case 'class': {
					potentialName = lowerCaseDirectiveName;
					break;
				}
				default: {
					isDirective = true;
				}
			}
		}

		return {
			...attr,
			isDynamicValue,
			isDirective,
			potentialName,
		};
	}

	/**
	 * > Variable names must be capitalized. For example, use `Element`, not `element`.
	 * > Otherwise, Astro will try to render your variable name as a literal HTML tag.
	 *
	 * @see https://docs.astro.build/en/basics/astro-syntax/#dynamic-html
	 * @param nodeName
	 * @param defaultPattern
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, /^[A-Z]/);
	}

	#updateScopeNS(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Node,
		parentNode: MLASTParentNode | null,
	) {
		const parentNS = this.state.scopeNS;

		if (
			parentNS === 'http://www.w3.org/1999/xhtml' &&
			originNode.type === 'element' &&
			originNode.name?.toLowerCase() === 'svg'
		) {
			this.state.scopeNS = 'http://www.w3.org/2000/svg';
		} else if (parentNS === 'http://www.w3.org/2000/svg' && parentNode && parentNode.nodeName === 'foreignObject') {
			this.state.scopeNS = 'http://www.w3.org/1999/xhtml';
		}
	}
}

export const parser = new AstroParser();
