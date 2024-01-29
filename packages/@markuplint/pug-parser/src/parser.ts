import type { ASTNode } from './pug-parser/index.js';
import type { MLASTAttr, MLASTElement, MLASTNodeTreeItem, MLASTParentNode } from '@markuplint/ml-ast';
import type { ChildToken, Token } from '@markuplint/parser-utils';

import { getNamespace, parser as htmlParser } from '@markuplint/html-parser';
import { ParserError, Parser, AttrState, removeQuote, scriptParser } from '@markuplint/parser-utils';

import { pugParse } from './pug-parser/index.js';

class PugParser extends Parser<ASTNode> {
	constructor() {
		super({
			endTagType: 'never',
		});
	}

	tokenize() {
		return {
			ast: pugParse(this.rawCode).nodes,
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
		const parentNamespace =
			parentNode && 'namespace' in parentNode ? parentNode.namespace : 'http://www.w3.org/1999/xhtml';

		const token = this.sliceFragment(originNode.offset, originNode.endOffset);

		switch (originNode.type) {
			case 'Doctype': {
				return this.visitDoctype({
					...token,
					depth,
					parentNode,
					name: originNode.val ?? '',
					publicId: '',
					systemId: '',
				});
			}
			case 'Text': {
				if (originNode.raw.trim() === '') {
					return [];
				}

				const htmlDoc = htmlParser.parse(originNode.raw, {
					offsetOffset: originNode.offset,
					offsetLine: originNode.line,
					offsetColumn: originNode.column,
					depth,
				});

				return htmlDoc.nodeList;
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
			case 'Tag': {
				const namespace = getNamespace(originNode.name, parentNamespace);

				return this.visitElement(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.name,
						namespace,
					},
					originNode.block.nodes,
					{
						overwriteProps: {
							attributes: originNode.attrs.map(attr => {
								const token = this.sliceFragment(attr.offset, attr.endOffset);
								return this.visitAttr(token);
							}),
						},
					},
				);
			}
			default: {
				return this.visitPsBlock(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.type,
					},
					'block' in originNode && originNode.block ? originNode.block.nodes : [],
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
			readonly namespace: string;
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
			childNodes: [],
			pairNode: null,
			tagOpenChar: '',
			tagCloseChar: '',
			isGhost: false,
		};

		const siblings = this.visitChildren(childNodes, startTag);

		return [startTag, ...siblings];
	}

	visitAttr(token: Token): MLASTAttr {
		if (token.raw[0] === '#' || token.raw[0] === '.') {
			const attr = super.visitAttr(token, {
				startState: AttrState.BeforeValue,
				quoteSet: [],
				quoteInValueChars: [],
				endOfUnquotedValueChars: [],
			});

			if (attr.type === 'spread') {
				return attr;
			}

			this.updateAttr(attr, {
				potentialName: token.raw[0] === '#' ? 'id' : 'class',
				potentialValue: attr.value.raw.slice(1),
				isDuplicatable: attr.potentialName === 'class',
			});

			return attr;
		}

		const attr = super.visitAttr(token, {
			quoteSet: [],
			quoteInValueChars: [],
			endOfUnquotedValueChars: [],
		});

		if (attr.type === 'spread') {
			return attr;
		}

		if (attr.name.raw.toLowerCase() === 'class') {
			this.updateAttr(attr, { isDuplicatable: true });
		}

		const valueCodeTokens = scriptParser(attr.value.raw.trim());

		if (valueCodeTokens.length === 1) {
			const token = valueCodeTokens[0]!;
			switch (token.type) {
				case 'Numeric': {
					return {
						...attr,
						potentialValue: token.value,
						valueType: 'number',
					};
				}
				case 'Boolean': {
					return {
						...attr,
						potentialValue: token.value,
						valueType: 'boolean',
					};
				}
				case 'String':
				case 'Template': {
					const value = super.visitAttr(attr.value, {
						startState: AttrState.BeforeValue,
						quoteSet: [
							{ start: '"', end: '"' },
							{ start: "'", end: "'" },
							{ start: '`', end: '`' },
						],
						quoteInValueChars: [
							{ start: '"', end: '"' },
							{ start: "'", end: "'" },
							{ start: '`', end: '`' },
							{ start: '${', end: '}' },
						],
					});

					if (value.type === 'spread') {
						throw new ParserError('Unexpected attribute value', value);
					}

					return {
						...attr,
						startQuote: value.startQuote,
						value: value.value,
						endQuote: value.endQuote,
						potentialValue: value.value.raw,
						valueType: 'string',
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
