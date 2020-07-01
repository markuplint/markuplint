// @ts-ignore
import lexer from 'pug-lexer';
// @ts-ignore
import parser from 'pug-parser';

export function pugParse(pug: string) {
	const lexOrigin = lexer(pug);
	const lex: PugLexToken[] = JSON.parse(JSON.stringify(lexOrigin));
	const originAst: PugAST<PugASTNode> = parser(lexOrigin);
	// console.log(lex);
	// console.log(JSON.stringify(originAst, null, 2));
	const ast = optimizeAST(originAst, lex, pug);
	return ast;
}

function getOffsetsFromlines(pug: string): number[] {
	const lines = pug.split(/\n/g);
	let chars = 0;
	const result = lines.map(line => {
		chars += line.length + 1;
		return chars;
	});
	return result;
}

/**
 *
 * @param originalAST
 * @param tokens Lexed token list
 * @param pug Raw code
 */
function optimizeAST(originalAST: PugAST<PugASTNode>, tokens: PugLexToken[], pug: string): ASTBlock {
	const nodes: ASTNode[] = [];

	for (const node of originalAST.nodes) {
		const line = node.line;
		const column = node.column;
		const offsets = getOffsetsFromlines(pug);
		const lineOffset = Math.max(offsets[line - 2], 0) || 0;
		const offset = lineOffset + column - 1;

		const { endLine, endColumn, endOffset } = getLocationFromToken(offset, line, column, tokens);
		const raw = pug.slice(offset, endOffset);

		switch (node.type) {
			case 'Tag': {
				const attrs = getAttrs(node.attrs, tokens, offsets, pug);

				const { endOffset, endLine, endColumn } = getEndAttributeLocation(
					node.name,
					offset,
					line,
					column,
					tokens,
					offsets,
				);

				const raw = pug.slice(offset, endOffset);
				const block = optimizeAST(node.block, tokens, pug);

				const tagNode: ASTTagNode = {
					type: 'Tag',
					name: node.name,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					block,
					attrs,
				};

				nodes.push(tagNode);
				continue;
			}
			case 'Conditional': {
				const block = optimizeAST(node.consequent, tokens, pug);

				const condNode: ASTConditionalNode = {
					type: node.type,
					raw,
					test: node.test,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					block,
				};

				nodes.push(condNode);

				const altNodes = optimizeASTOfConditionalNode(node, tokens, pug, offsets, 0);
				nodes.push(...altNodes);
				continue;
			}
			case 'Each': {
				const block = optimizeAST(node.block, tokens, pug);

				const eachNode: ASTEachNode = {
					type: node.type,
					val: node.val,
					obj: node.obj,
					key: node.key,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					block,
				};
				nodes.push(eachNode);
				continue;
			}
			case 'Include': {
				const block = optimizeAST(node.block, tokens, pug);

				const includeNode: ASTIncludeNode = {
					type: node.type,
					file: node.file,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					block,
				};

				nodes.push(includeNode);
				continue;
			}
			case 'Mixin': {
				// TODO: Attributes when call mixin
				// const attrs = getAttrs(node.attrs, tokens, offsets, pug);
				const attrs: ASTAttr[] = [];

				const { endLine, endColumn, endOffset } = getLocationFromToken(offset, line, column, tokens, [
					'mixin',
					'call',
				]);
				const raw = pug.slice(offset, endOffset);

				const block = node.block && optimizeAST(node.block, tokens, pug);

				const mixinNode: ASTMixinNode = {
					type: 'Mixin',
					name: node.name,
					args: node.args,
					call: node.call,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					block,
					attrs,
				};

				nodes.push(mixinNode);
				continue;
			}
			case 'MixinBlock': {
				const mixinNode: ASTMixinSlotNode = {
					type: 'MixinBlock',
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
				};

				nodes.push(mixinNode);
				continue;
			}
			case 'Comment': {
				const commentNode: ASTComment = {
					type: node.type,
					val: node.val,
					buffer: node.buffer,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
				};
				nodes.push(commentNode);
				continue;
			}
			case 'Code': {
				const newNode: ASTCodeNode = {
					type: node.type,
					raw,
					val: node.val,
					buffer: node.buffer,
					mustEscape: node.mustEscape,
					isInline: node.isInline,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
				};

				nodes.push(newNode);
				continue;
			}
			case 'Text': {
				const { endOffset, endLine, endColumn } = getEndHTMLText(
					node.val,
					offset,
					line,
					column,
					tokens,
					offsets,
				);
				const raw = pug.slice(offset, endOffset);

				const textNode: ASTTextNode = {
					type: node.type,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
				};
				nodes.push(textNode);
				continue;
			}
			case 'Doctype': {
				const commentNode: ASTDoctype = {
					type: node.type,
					val: node.val,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
				};
				nodes.push(commentNode);
				continue;
			}
			case 'Case':
			case 'When': {
				const block = optimizeAST(node.block, tokens, pug);

				const caseNode: ASTCaseNode | ASTCaseWhenNode = {
					type: node.type,
					expr: node.expr,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					block,
				};
				nodes.push(caseNode);
				continue;
			}
			default: {
				// @ts-ignore
				throw new Error(`Unsupported syntax: The "${node.type}" node\n${JSON.stringify(node, null, 2)}`);
			}
		}
	}

	return {
		type: 'Block',
		nodes,
		line: originalAST.line,
	};
}

function optimizeASTOfConditionalNode(
	node: PugASTConditionalNode<PugAST<PugASTNode>>,
	tokens: PugLexToken[],
	pug: string,
	offsets: number[],
	depth: number,
) {
	const altNodes: ASTNode[] = [];

	let tokenOfCurrentNode: PugLexToken | null = null;
	for (const token of tokens) {
		if (token.type === 'else-if' && token.loc.start.line === node.consequent.line - 1) {
			tokenOfCurrentNode = token;
			break;
		}
	}

	if (tokenOfCurrentNode) {
		// console.log(JSON.stringify(node, null, 2));
		const lineOffset = Math.max(offsets[node.line - 2], 0) || 0;
		const offset = lineOffset + node.column - 1;

		const length = tokenOfCurrentNode.loc.end.column - tokenOfCurrentNode.loc.start.column;
		const endOffset = offset + length;
		const raw = pug.slice(offset, endOffset);
		const block = optimizeAST(node.consequent, tokens, pug);

		altNodes.push({
			type: 'Conditional',
			raw,
			test: node.test,
			offset,
			endOffset,
			line: tokenOfCurrentNode.loc.start.line,
			endLine: tokenOfCurrentNode.loc.end.line,
			column: tokenOfCurrentNode.loc.start.column,
			endColumn: tokenOfCurrentNode.loc.end.column,
			block,
		});
	}

	if ('alternate' in node && node.alternate) {
		const lineOffset = Math.max(offsets[node.line - 2], 0) || 0;
		const offset = lineOffset + node.column - 1;

		switch (node.alternate.type) {
			case 'Block': {
				let tokenOfCurrentNode: PugLexToken | null = null;
				for (const token of tokens) {
					if (token.type === 'else' && token.loc.start.line === node.alternate.line - 1) {
						tokenOfCurrentNode = token;
						break;
					}
				}

				if (!tokenOfCurrentNode) {
					return [];
				}

				const lineOffset = Math.max(offsets[tokenOfCurrentNode.loc.start.line - 2], 0) || 0;
				const offset = lineOffset + tokenOfCurrentNode.loc.start.column - 1;
				const length = tokenOfCurrentNode.loc.end.column - tokenOfCurrentNode.loc.start.column;
				const endOffset = offset + length;
				const raw = pug.slice(offset, endOffset);
				const block = optimizeAST(node.alternate, tokens, pug);

				altNodes.push({
					type: 'Conditional',
					raw,
					test: node.test,
					offset,
					endOffset,
					line: tokenOfCurrentNode.loc.start.line,
					endLine: tokenOfCurrentNode.loc.end.line,
					column: tokenOfCurrentNode.loc.start.column,
					endColumn: tokenOfCurrentNode.loc.end.column,
					block,
				});
				break;
			}
			case 'Conditional': {
				const nodes = optimizeASTOfConditionalNode(node.alternate, tokens, pug, offsets, depth + 1);
				altNodes.push(...nodes);
			}
		}
	}

	return altNodes;
}

function getLocationFromToken(
	offset: number,
	line: number,
	column: number,
	tokens: PugLexToken[],
	tokenType: string | string[] = '',
) {
	let tokenOfCurrentNode: PugLexToken | null = null;
	for (const token of tokens) {
		if (
			(tokenType
				? Array.isArray(tokenType)
					? tokenType.includes(token.type)
					: tokenType === token.type
				: true) &&
			token.loc.start.line === line &&
			token.loc.start.column === column
		) {
			tokenOfCurrentNode = token;
			break;
		}
	}

	if (!tokenOfCurrentNode) {
		throw new Error('Parse error: Not found pair of token and AST node.');
	}

	const length = tokenOfCurrentNode.loc.end.column - tokenOfCurrentNode.loc.start.column;

	return {
		endLine: tokenOfCurrentNode.loc.end.line,
		endColumn: tokenOfCurrentNode.loc.end.column,
		endOffset: offset + length,
		length,
	};
}

function getAttrs(originalAttrs: PugASTAttr[], tokens: PugLexToken[], offsets: number[], pug: string) {
	const attrs: ASTAttr[] = [];

	for (const attr of originalAttrs) {
		const attrLineOffset = offsets[attr.line - 2] || 0;
		const attrOffset = attrLineOffset + attr.column - 1;

		let tokenOfCurrentAttr: PugLexToken | null = null;
		for (const token of tokens) {
			if (token.loc.start.line === attr.line && token.loc.start.column === attr.column) {
				tokenOfCurrentAttr = token;
				break;
			}
		}

		if (!tokenOfCurrentAttr) {
			throw new Error('Parse error');
		}

		const length = tokenOfCurrentAttr.loc.end.column - tokenOfCurrentAttr.loc.start.column;
		const attrEndOffset = attrOffset + length;
		const raw = pug.slice(attrOffset, attrEndOffset);

		attrs.push({
			name: attr.name,
			val: attr.val,
			mustEscape: attr.mustEscape,
			offset: attrOffset,
			endOffset: attrEndOffset,
			line: attr.line,
			endLine: tokenOfCurrentAttr.loc.end.line,
			column: attr.column,
			endColumn: tokenOfCurrentAttr.loc.end.column,
			raw,
		});
	}

	return attrs;
}

function getEndAttributeLocation(
	nodeName: string,
	offset: number,
	line: number,
	column: number,
	tokens: PugLexToken[],
	offsets: number[],
) {
	let beforeNewlineToken: PugLexToken | null = null;
	for (const token of tokens) {
		// Searching token after the tag node.
		if (
			beforeNewlineToken &&
			(token.loc.start.line > line || (token.loc.start.line >= line && token.loc.start.column > column)) &&
			token.type !== 'attribute' &&
			token.type !== 'start-attributes' &&
			token.type !== 'end-attributes' &&
			token.type !== 'id' &&
			token.type !== 'class'
		) {
			const endAttrlineOffset = Math.max(offsets[beforeNewlineToken.loc.end.line - 2], 0) || 0;
			const endAttrOffset = endAttrlineOffset + beforeNewlineToken.loc.end.column - 1;
			return {
				endOffset: endAttrOffset,
				endLine: beforeNewlineToken.loc.end.line,
				endColumn: beforeNewlineToken.loc.end.column,
			};
		}
		beforeNewlineToken = token;
	}
	return {
		endOffset: offset + nodeName.length,
		endLine: line,
		endColumn: column + nodeName.length,
	};
}

function getEndHTMLText(
	val: string,
	offset: number,
	line: number,
	column: number,
	tokens: PugLexToken[],
	offsets: number[],
) {
	let beforeNewlineToken: PugLexToken | null = null;
	for (const token of tokens) {
		// Searching token after the text.
		if (
			beforeNewlineToken &&
			token.loc.start.line > line &&
			token.type !== 'text' &&
			token.type !== 'text-html' &&
			token.type !== 'indent' &&
			token.type !== 'outdent'
		) {
			const endAttrlineOffset = Math.max(offsets[beforeNewlineToken.loc.end.line - 2], 0) || 0;
			const endAttrOffset = endAttrlineOffset + beforeNewlineToken.loc.end.column - 1;
			return {
				endOffset: endAttrOffset,
				endLine: beforeNewlineToken.loc.end.line,
				endColumn: beforeNewlineToken.loc.end.column,
			};
		}
		beforeNewlineToken = token;
	}
	return {
		endOffset: offset + val.length,
		endLine: line,
		endColumn: column + val.length,
	};
}

export type ASTBlock = PugAST<ASTNode>;

export type ASTNode =
	| ASTTagNode
	| ASTTextNode
	| ASTCodeNode
	| ASTComment
	| ASTDoctype
	| ASTIncludeNode
	| ASTMixinNode
	| ASTMixinSlotNode
	| ASTEachNode
	| ASTConditionalNode
	| ASTCaseNode
	| ASTCaseWhenNode;

export type ASTTagNode = Omit<PugASTTagNode<ASTAttr, ASTBlock>, 'attributeBlocks' | 'selfClosing' | 'isInline'> &
	AddtionalASTData;

export type ASTTextNode = Omit<PugASTTextNode, 'val'> & AddtionalASTData;

export type ASTCodeNode = PugASTCodeNode & AddtionalASTData;

export type ASTComment = PugASTCommentNode & AddtionalASTData;

export type ASTDoctype = PugASTDoctypeNode & AddtionalASTData;

export type ASTIncludeNode = PugASTIncludeNode<ASTBlock> & AddtionalASTData;

export type ASTMixinNode = Omit<PugASTMixinNode<ASTAttr, ASTBlock>, 'attributeBlocks'> & AddtionalASTData;

export type ASTMixinSlotNode = PugASTMixinSlotNode & AddtionalASTData;

export type ASTEachNode = PugASTEachNode<ASTBlock> & AddtionalASTData;

export type ASTConditionalNode = Omit<PugASTConditionalNode<ASTBlock>, 'consequent' | 'alternate'> & {
	block: ASTBlock;
} & AddtionalASTData;

export type ASTCaseNode = PugASTCaseNode<ASTBlock> & AddtionalASTData;

export type ASTCaseWhenNode = PugASTCaseWhenNode<ASTBlock> & AddtionalASTData;

export type ASTAttr = PugASTAttr & AddtionalASTData;

type AddtionalASTData = {
	raw: string;
	offset: number;
	endOffset: number;
	endLine: number;
	endColumn: number;
};

interface PugAST<N> {
	type: 'Block';
	nodes: N[];
	line: number;
}

type PugASTNode =
	| PugASTTagNode<PugASTAttr, PugAST<PugASTNode>>
	| PugASTTextNode
	| PugASTCodeNode
	| PugASTCommentNode
	| PugASTDoctypeNode
	| PugASTIncludeNode<PugAST<PugASTNode>>
	| PugASTMixinNode<PugASTAttr, PugAST<PugASTNode>>
	| PugASTMixinSlotNode
	| PugASTEachNode<PugAST<PugASTNode>>
	| PugASTConditionalNode<PugAST<PugASTNode>>
	| PugASTCaseNode<PugAST<PugASTNode>>
	| PugASTCaseWhenNode<PugAST<PugASTNode>>;

type PugASTTagNode<A, B> = {
	type: 'Tag';
	name: string;
	selfClosing: boolean;
	attrs: A[];
	attributeBlocks: never[];
	isInline: boolean;
	line: number;
	column: number;
	block: B;
};

type PugASTTextNode = {
	type: 'Text';
	val: string;
	isHtml?: true;
	line: number;
	column: number;
};

type PugASTCodeNode = {
	type: 'Code';
	val: string;
	buffer: boolean;
	mustEscape: boolean;
	isInline: boolean;
	line: number;
	column: number;
};

type PugASTCommentNode = {
	type: 'Comment';
	val: string;
	buffer: boolean;
	line: number;
	column: number;
};

type PugASTDoctypeNode = {
	type: 'Doctype';
	val: string;
	line: number;
	column: number;
};

type PugASTIncludeNode<B> = {
	type: 'Include';
	file: {
		type: 'FileReference';
		path: string;
		line: number;
		column: number;
	};
	block: B;
	line: number;
	column: number;
};

type PugASTEachNode<B> = {
	type: 'Each';
	obj: string;
	val: string;
	key: string | null;
	block: B;
	line: number;
	column: number;
};

type PugASTMixinNode<A, B> = {
	type: 'Mixin';
	name: string;
	args: string;
	call: boolean;
	block: B | null;
	attrs?: A[];
	attributeBlocks: never[];
	line: number;
	column: number;
};

type PugASTMixinSlotNode = {
	type: 'MixinBlock';
	line: number;
	column: number;
};

type PugASTConditionalNode<B> = {
	type: 'Conditional';
	test: string;
	consequent: B;
	alternate?: B | PugASTConditionalNode<B>;
	line: number;
	column: number;
};

type PugASTCaseNode<B> = {
	type: 'Case';
	expr: string;
	block: B;
	line: number;
	column: number;
};

type PugASTCaseWhenNode<B> = {
	type: 'When';
	expr: string;
	block: B;
	line: number;
	column: number;
};

type PugASTAttr = {
	name: string;
	val: string | true;
	mustEscape: boolean;
	line: number;
	column: number;
};

type PugLexToken =
	| PugLexTokenTag
	| PugLexTokenStartAttr
	| PugLexTokenAttr
	| PugLexTokenEndAttr
	| PugLexTokenSpAttr
	| PugLexTokenIndent
	| PugLexTokenText
	| PugLexTokenOutdent
	| PugLexTokenNewline
	| PugLexTokenComment
	| PugLexTokenCode
	| PugLexTokenDefMixin
	| PugLexTokenCallMixin
	| PugLexTokenSlotOfMixin
	| PugLexTokenTextHTML
	| PugLexTokenDot
	| PugLexTokenStartPipelessText
	| PugLexTokenEndPipelessText
	| PugLexTokenIf
	| PugLexTokenElseIf
	| PugLexTokenElse
	| PugLexTokenEOS;

type PugLexTokenTag = {
	type: 'tag';
	loc: PugLexTokenLocation;
	val: string;
};

type PugLexTokenStartAttr = {
	type: 'start-attributes';
	loc: PugLexTokenLocation;
};

type PugLexTokenAttr = {
	type: 'attribute';
	loc: PugLexTokenLocation;
	name: string;
	val: string;
	mustEscape: boolean;
};

type PugLexTokenEndAttr = {
	type: 'end-attributes';
	loc: PugLexTokenLocation;
};

type PugLexTokenSpAttr = {
	type: 'id' | 'class';
	loc: PugLexTokenLocation;
	name: string;
	val: string;
	mustEscape: boolean;
};

type PugLexTokenIndent = {
	type: 'indent';
	loc: PugLexTokenLocation;
	val: number;
};

type PugLexTokenText = {
	type: 'text';
	loc: PugLexTokenLocation;
	val: string;
};

type PugLexTokenOutdent = {
	type: 'outdent';
	loc: PugLexTokenLocation;
};

type PugLexTokenNewline = {
	type: 'newline';
	loc: PugLexTokenLocation;
};

type PugLexTokenComment = {
	type: 'comment';
	loc: PugLexTokenLocation;
	buffer: boolean;
};

type PugLexTokenCode = {
	type: 'code';
	loc: PugLexTokenLocation;
	val: string;
	mustEscape: boolean;
	buffer: boolean;
};

type PugLexTokenDefMixin = {
	type: 'mixin';
	loc: PugLexTokenLocation;
	val: string;
	args: string;
};

type PugLexTokenCallMixin = {
	type: 'call';
	loc: PugLexTokenLocation;
	val: string;
	args: string;
};

type PugLexTokenSlotOfMixin = {
	type: 'mixin-block';
	loc: PugLexTokenLocation;
};

type PugLexTokenTextHTML = {
	type: 'text-html';
	loc: PugLexTokenLocation;
	val: string;
};

type PugLexTokenDot = {
	type: 'dot';
	loc: PugLexTokenLocation;
};

type PugLexTokenStartPipelessText = {
	type: 'start-pipeless-text';
	loc: PugLexTokenLocation;
};

type PugLexTokenEndPipelessText = {
	type: 'end-pipeless-text';
	loc: PugLexTokenLocation;
};

type PugLexTokenIf = {
	type: 'if';
	val: string;
	loc: PugLexTokenLocation;
};

type PugLexTokenElseIf = {
	type: 'else-if';
	val: string;
	loc: PugLexTokenLocation;
};

type PugLexTokenElse = {
	type: 'else';
	loc: PugLexTokenLocation;
};

type PugLexTokenEOS = {
	type: 'eos';
	loc: PugLexTokenLocation;
};

type PugLexTokenLocation = {
	start: {
		line: number;
		column: number;
	};
	end: {
		line: number;
		column: number;
	};
};
