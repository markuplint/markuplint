import type { Node } from './astro-parser.js';
import type { MLASTNodeTreeItem, MLASTParentNode } from '@markuplint/ml-ast';
import type { ChildToken, Token } from '@markuplint/parser-utils';

import { AttrState, Parser, ParserError } from '@markuplint/parser-utils';

import { astroParse } from './astro-parser.js';
import { detectBlockBehavior } from './detect-block-behavior.js';
import { extractSpreadAttribute } from './spread-attr.js';

/**
 * Parser implementation for Astro component templates.
 * Extends the base Parser to handle Astro-specific syntax including frontmatter blocks,
 * expression containers (`{}`), component/element/fragment types, Astro directives
 * (e.g., `class:list`, `set:html`), and shorthand attributes.
 *
 * When forward-porting a fix from the `v4` branch, beware the `Token` field
 * rename: v4 uses `startOffset` / `startLine` / `startCol` where this branch
 * uses `offset` / `line` / `col` (also in AST properties asserted in spec
 * files). The build surfaces mismatches as `TS2339`.
 */
class AstroParser extends Parser<Node> {
	constructor() {
		super({
			// Astro requires explicit closing tags like XML.
			endTagType: 'xml',
			// Accepts both HTML void elements and XML-style self-closing (`<Component />`).
			selfCloseType: 'html+xml',
			// Distinguishes components (`<MyComp>`) from HTML elements (`<div>`).
			tagNameCaseSensitive: true,
		});
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
	 * and expression nodes.
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

		const offset = originNode.position.start.offset;
		const endOffset = originNode.position.end?.offset;
		const token = this.sliceFragment(offset, endOffset);

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

				let closeExpressionLocation: Token | null = null;

				if (firstChild && lastChild && firstChild !== lastChild) {
					const startExpressionEndOffset = firstChild.position?.end?.offset ?? endOffset ?? offset;
					const startExpressionLocation = this.sliceFragment(offset, startExpressionEndOffset);

					startExpressionRaw = startExpressionLocation.raw;
					startExpressionStartLine = startExpressionLocation.line;
					startExpressionStartCol = startExpressionLocation.col;

					closeExpressionLocation = this.sliceFragment(lastChild.position?.start.offset ?? offset, endOffset);
				}

				const blockBehavior = detectBlockBehavior(startExpressionRaw);

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
						blockBehavior,
					),
					...(closeExpressionLocation
						? this.visitPsBlock(
								{
									...closeExpressionLocation,
									depth,
									parentNode,
									nodeName: 'MustacheTag',
									isFragment: false,
								},
								[],
								blockBehavior
									? {
											type: 'end',
											expression: closeExpressionLocation.raw,
										}
									: undefined,
							)
						: []),
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
	 * options including nameless fragment support.
	 *
	 * This hands the entire element source (including body and end tag) to
	 * `parseCodeFragment()`. Raw-text safety for `<script>` and `<style>`
	 * bodies is owned by parser-utils' `parseCodeFragment()` (its
	 * `rawTextElements` handling per HTML LS 13.2.5.1); without it, HTML-like
	 * substrings in a script body (e.g. a regex matching a `<br>` tag) would
	 * be re-tokenized as tags and throw `Invalid tag syntax` (#3825). If that
	 * regression reappears, the fix belongs in parser-utils, not here.
	 *
	 * @see https://github.com/markuplint/markuplint/issues/3825
	 * @see https://html.spec.whatwg.org/multipage/syntax.html#cdata-rcdata-restrictions
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

		return super.visitElement({ ...startTagNode, parentNode: startTagNode.parentNode ?? null }, childNodes, {
			// https://docs.astro.build/en/basics/astro-syntax/#fragments
			namelessFragment: true,
			createEndTagToken: () => {
				if (startTagNode.tagCloseChar.startsWith('/')) {
					return null;
				}

				const endTagNode = parsedNodes.at(-1);

				if (endTagNode?.type !== 'endtag') {
					return null;
				}

				return { ...endTagNode, parentNode: endTagNode.parentNode ?? null };
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
	 * expressions, see #3856; root cause originally reported as #3824),
	 * and template directives (e.g., `class:list`, `set:html`).
	 *
	 * @param token - The token representing the attribute
	 * @returns The parsed attribute node with Astro-specific metadata
	 */
	visitAttr(token: Token) {
		// The spread pre-pass MUST run before `super.visitAttr()`: falling
		// through to the base path routes the token through the espree-based
		// `safeScriptParser`, which reproduces the truncation and
		// `Invalid tag syntax` failures of #3824 / #3856.
		const spreadHit = extractSpreadAttribute(token.raw);
		if (spreadHit) {
			let spreadLine = token.line;
			let spreadCol = token.col;
			for (const c of spreadHit.leadingSpace) {
				if (c === '\n') {
					spreadLine++;
					spreadCol = 1;
				} else {
					spreadCol++;
				}
			}
			const spread = super.visitSpreadAttr({
				raw: spreadHit.spreadRaw,
				offset: token.offset + spreadHit.leadingSpace.length,
				line: spreadLine,
				col: spreadCol,
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
		 * `class:` is special-cased with `potentialName: 'class'` so markuplint
		 * rules for the standard `class` attribute still apply to `class:list`.
		 * Every other `prefix:name` pattern gets `isDirective: true`, which
		 * tells markuplint it is framework-specific and must not be validated
		 * as a standard HTML attribute.
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
}

export const parser = new AstroParser();
