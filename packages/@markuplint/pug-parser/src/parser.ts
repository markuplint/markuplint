import type { ASTNode } from './types.js';
import type {
	MLASTAttr,
	MLASTBlockBehavior,
	MLASTElement,
	MLASTNodeTreeItem,
	MLASTParentNode,
} from '@markuplint/ml-ast';
import type { ChildToken, ParseOptions, Token } from '@markuplint/parser-utils';

import { HtmlParser } from '@markuplint/html-parser';
import { ParserError, Parser, AttrState, scriptParser, getNamespace } from '@markuplint/parser-utils';

import { pugParse } from './pug-parser/index.js';

class HtmlInPugParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				/**
				 * Tag Interpolation
				 *
				 * @see https://pugjs.org/language/interpolation.html#tag-interpolation
				 */
				{
					type: 'tag-interpolation',
					start: '#[',
					end: ']',
				},
			],
		});
	}
}

class PugParser extends Parser<ASTNode> {
	constructor() {
		super({
			endTagType: 'never',
		});
	}

	tokenize(options?: ParseOptions) {
		const offsetOffset = options?.offsetOffset ?? 0;
		const ast = pugParse(this.rawCode, offsetOffset >= 1).nodes;
		return {
			ast: [...ast],
			isFragment: true,
		};
	}

	parseError(error: any) {
		if (error instanceof Error && 'msg' in error && 'line' in error && 'column' in error && 'src' in error) {
			return new ParserError(error.msg as string, {
				line: error.line as number,
				col: error.column as number,
				raw: error.src as string,
			});
		}
		return super.parseError(error);
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: ASTNode,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		const token = this.sliceFragment(originNode.offset, originNode.endOffset);

		switch (originNode.type) {
			case 'Doctype': {
				return this.visitDoctype({
					...token,
					depth,
					parentNode,
					name: originNode.raw ?? '',
					publicId: '',
					systemId: '',
				});
			}
			case 'Text': {
				if (originNode.raw.trim() === '') {
					return [];
				}

				if (!originNode.raw.includes('<') && !originNode.raw.includes('#[')) {
					return this.visitText({
						...token,
						depth,
						parentNode,
					});
				}

				const htmlDoc = new HtmlInPugParser().parse(originNode.raw, {
					offsetOffset: originNode.offset,
					offsetLine: originNode.line,
					offsetColumn: originNode.column ?? parentNode?.col,
					depth,
				});

				const newNodeList: MLASTNodeTreeItem[] = [];
				for (const node of htmlDoc.nodeList) {
					if (node.nodeName === '#ps:tag-interpolation') {
						// Remove `#[` and `]`
						const raw = node.raw.slice(2, -1);
						const innerNodes = new PugParser().parse(raw, {
							offsetOffset: node.offset + 2,
							offsetLine: node.line,
							offsetColumn: node.col + 2,
							depth: node.depth,
						});
						newNodeList.push(...innerNodes.nodeList);
						continue;
					}

					newNodeList.push(node);
				}

				return newNodeList;
			}
			case 'Comment': {
				return this.visitComment(
					{
						...token,
						depth,
						parentNode,
					},
					{
						isBogus: false,
					},
				);
			}
			case 'BlockComment': {
				const lastBlock = originNode.block?.nodes.at(-1);
				const endOffset = lastBlock ? lastBlock.endOffset : originNode.endOffset;
				const token = this.sliceFragment(originNode.offset, endOffset);
				return this.visitComment(
					{
						...token,
						depth,
						parentNode,
					},
					{
						isBogus: false,
					},
				);
			}
			case 'Tag': {
				const attrs = originNode.attrs.map(attr => {
					// eslint-disable-next-line prefer-const
					let { offset, endOffset } = this.getOffsetsFromCode(
						attr.line,
						attr.column,
						attr.endLine,
						attr.endColumn,
					);

					if (
						(attr.name === 'id' || attr.name === 'class') &&
						attr.offset === attr.endOffset &&
						typeof attr.val === 'string'
					) {
						/**
						 * #value =>
						 * {
						 *   name: 'id',
						 *   val: "'value'",
						 * }
						 * Remove single quotes and add (#|.) prefix
						 */
						endOffset = attr.offset + attr.val.length - 1;
					}

					const token = this.sliceFragment(offset, endOffset);
					return this.visitAttr(token);
				});

				// &attributes(syntax)
				const andAttr = originNode.attributeBlocks.map(block => {
					const blockLength = '&attributes('.length;
					const { offset, endOffset } = this.getOffsetsFromCode(
						block.line,
						block.column + blockLength,
						block.line,
						block.column + blockLength + block.val.length,
					);
					const token = this.sliceFragment(offset, endOffset);
					const node = this.createToken(token.raw, token.offset, token.line, token.col);
					return {
						...node,
						type: 'spread',
						nodeName: '#spread',
					} as const;
				});

				return this.visitElement(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.name,
						isFragment: false,
					},
					originNode.block?.nodes ?? [],
					{
						overwriteProps: {
							attributes: [...attrs, ...andAttr],
						},
					},
				);
			}
			default: {
				let tokenIncludesFile = token;

				if ('file' in originNode && originNode.file.column != null) {
					const interval = originNode.file.column - originNode.endColumn;
					const fileOffset = originNode.endOffset + interval;
					const fileEndOffset = fileOffset + originNode.file.path.length;
					tokenIncludesFile = this.sliceFragment(originNode.offset, fileEndOffset);
				}

				let blockBehavior: MLASTBlockBehavior | null = null;

				switch (originNode.type) {
					case 'Each': {
						blockBehavior = {
							type: 'each',
							expression: originNode.val,
						};
						break;
					}
				}

				return this.visitPsBlock(
					{
						...tokenIncludesFile,
						depth,
						parentNode,
						nodeName: originNode.type,
						isFragment: true,
					},
					'block' in originNode && originNode.block
						? originNode.block.nodes
						: 'nodes' in originNode
							? originNode.nodes
							: [],
					blockBehavior,
				);
			}
		}
	}

	afterFlattenNodes(nodeList: readonly MLASTNodeTreeItem[]) {
		return super.afterFlattenNodes(nodeList, {
			exposeInvalidNode: false,
			exposeWhiteSpace: false,
		});
	}

	visitElement(
		token: ChildToken & {
			readonly nodeName: string;
			readonly isFragment: false;
		},
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		childNodes: readonly ASTNode[],
		options: {
			readonly overwriteProps: {
				readonly attributes: readonly MLASTAttr[];
			};
		},
	) {
		const startTag: MLASTElement = {
			...token,
			...this.createToken(token),
			...options.overwriteProps,
			type: 'starttag',
			elementType: this.detectElementType(token.nodeName),
			namespace: getNamespace(token.nodeName, token.parentNode),
			childNodes: [],
			blockBehavior: null,
			pairNode: null,
			tagOpenChar: '',
			tagCloseChar: '',
			isGhost: false,
		};

		const siblings = this.visitChildren(childNodes, startTag);

		return [startTag, ...siblings];
	}

	visitSpreadAttr(): null {
		return null;
	}

	visitAttr(token: Token): MLASTAttr {
		if (token.raw[0] === '#' || token.raw[0] === '.') {
			const attr = super.visitAttr(token, {
				startState: AttrState.BeforeValue,
				quoteSet: [],
				endOfUnquotedValueChars: [],
			});

			if (attr.type === 'spread') {
				return attr;
			}

			const potentialName = token.raw[0] === '#' ? 'id' : 'class';

			this.updateAttr(attr, {
				potentialName,
				potentialValue: attr.raw.slice(1),
				isDuplicatable: potentialName === 'class',
			});

			return attr;
		}

		const attr = super.visitAttr(token, {
			quoteSet: [],
			noQuoteValueType: 'script',
			endOfUnquotedValueChars: [],
		});

		if (attr.type === 'spread') {
			return attr;
		}

		if (attr.name.raw.toLowerCase() === 'class') {
			this.updateAttr(attr, { isDuplicatable: true });
		}

		if (attr.name.raw.startsWith("'") && attr.name.raw.endsWith("'")) {
			this.updateAttr(attr, {
				potentialName: attr.name.raw.slice(1, -1),
			});
		}

		if (attr.name.raw.endsWith('!')) {
			this.updateAttr(attr, {
				potentialName: attr.name.raw.slice(0, -1),
			});
		}

		const valueCodeTokens = scriptParser(attr.value.raw.trim());

		if (valueCodeTokens.length === 1) {
			const token = valueCodeTokens[0]!;
			switch (token.type) {
				case 'Numeric': {
					return {
						...attr,
						valueType: 'number',
					};
				}
				case 'Boolean': {
					return {
						...attr,
						valueType: 'boolean',
					};
				}
				case 'String':
				case 'Template': {
					const value = super.visitAttr(attr.value, {
						startState: AttrState.BeforeValue,
						noQuoteValueType: 'script',
					});

					if (value.type === 'spread') {
						throw new ParserError('Unexpected attribute value', value);
					}

					return {
						...attr,
						startQuote: value.startQuote,
						value: value.value,
						endQuote: value.endQuote,
						...(attr.name.raw.endsWith('!') ? { valueType: 'code' } : {}),
					};
				}
			}
		}

		return {
			...attr,
			isDynamicValue: true,
			valueType: 'code',
		};
	}
}

export const parser = new PugParser();
