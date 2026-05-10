import type { Node } from './astro-parser.js';
import type { MLASTParentNode, MLASTNodeTreeItem } from '@markuplint/ml-ast';
import type { ChildToken, Token } from '@markuplint/parser-utils';

import { AttrState, Parser, ParserError } from '@markuplint/parser-utils';

import { astroParse } from './astro-parser.js';
import { extractSpreadAttribute } from './spread-attr.js';

type State = {
	scopeNS: string;
};

/**
 * Parser implementation for Astro component templates.
 * Extends the base Parser to handle Astro-specific syntax including frontmatter blocks,
 * expression containers (`{}`), component/element/fragment types, Astro directives
 * (e.g., `class:list`, `set:html`), shorthand attributes, and namespace-aware
 * element resolution (XHTML vs SVG).
 */
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

	/**
	 * Converts an Astro AST node into markuplint node tree items.
	 * Handles frontmatter, doctype, text, comment, component/element/fragment,
	 * and expression nodes. Manages namespace scoping for SVG elements.
	 *
	 * @param originNode - The Astro AST node to convert
	 * @param parentNode - The parent node in the markuplint tree, or null for root nodes
	 * @param depth - The nesting depth of the node
	 * @returns An array of markuplint node tree items
	 */
	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Node,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		if (!originNode.position) {
			throw new TypeError("Node doesn't have position");
		}

		const startOffset = originNode.position.start.offset;
		const endOffset = originNode.position.end?.offset;
		const token = this.sliceFragment(startOffset, endOffset);

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
				let startExpressionStartLine = token.startLine;
				let startExpressionStartCol = token.startCol;

				const nodes: MLASTNodeTreeItem[] = [];

				if (firstChild && lastChild && firstChild !== lastChild) {
					const startExpressionEndOffset = firstChild.position?.end?.offset ?? endOffset ?? startOffset;
					const startExpressionLocation = this.sliceFragment(startOffset, startExpressionEndOffset);

					startExpressionRaw = startExpressionLocation.raw;
					startExpressionStartLine = startExpressionLocation.startLine;
					startExpressionStartCol = startExpressionLocation.startCol;

					const closeExpressionLocation = this.sliceFragment(
						lastChild.position?.start.offset ?? startOffset,
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
							startOffset,
							startLine: startExpressionStartLine,
							startCol: startExpressionStartCol,
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

	/**
	 * Visits an element token by first parsing the raw HTML fragment to extract
	 * the start tag, then delegating to the base visitElement with Astro-specific
	 * options including namespace scoping and nameless fragment support.
	 *
	 * @param token - The child token representing the element
	 * @param childNodes - The child Astro AST nodes within the element
	 * @returns An array of markuplint node tree items
	 */
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

	/**
	 * Visits child nodes and verifies that no sibling nodes with differing
	 * hierarchy levels are produced. Throws a ParserError if unexpected
	 * sibling nodes are discovered.
	 *
	 * @param children - The child Astro AST nodes to visit
	 * @param parentNode - The parent node in the markuplint tree
	 * @returns An empty array (all children are attached via the visitor)
	 */
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

	/**
	 * Visits an attribute token, handling Astro-specific syntax including
	 * curly-brace expression values, shorthand attributes (`{name}`),
	 * spread attributes (`{...expr}`, including TypeScript and nested
	 * expressions, see #3824), and template directives (e.g., `class:list`,
	 * `set:html`).
	 *
	 * @param token - The token representing the attribute
	 * @returns The parsed attribute node with Astro-specific metadata
	 */
	visitAttr(token: Token) {
		const spreadHit = extractSpreadAttribute(token.raw);
		if (spreadHit) {
			let spreadStartLine = token.startLine;
			let spreadStartCol = token.startCol;
			for (const c of spreadHit.leadingSpace) {
				if (c === '\n') {
					spreadStartLine++;
					spreadStartCol = 1;
				} else {
					spreadStartCol++;
				}
			}
			const spread = super.visitSpreadAttr({
				raw: spreadHit.spreadRaw,
				startOffset: token.startOffset + spreadHit.leadingSpace.length,
				startLine: spreadStartLine,
				startCol: spreadStartCol,
			});
			// `extractSpreadAttribute` already validates the `{...EXPR}` shape
			// so `super.visitSpreadAttr` is expected to return a node here.
			// Falling through to the generic attr path is a defensive safeguard
			// against future shape changes in the parent class.
			if (spread) {
				return spreadHit.leftover ? { ...spread, __rightText: spreadHit.leftover } : spread;
			}
		}

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

	/**
	 * Updates the namespace scope based on the current node type.
	 * Switches to SVG namespace when entering an `<svg>` element
	 * and back to XHTML when entering a `<foreignObject>`.
	 *
	 * @param originNode - The Astro AST node being processed
	 * @param parentNode - The parent node in the markuplint tree
	 */
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
