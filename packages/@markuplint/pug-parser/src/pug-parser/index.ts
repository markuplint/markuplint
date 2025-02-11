import lexer from 'pug-lexer';
// @ts-ignore
import parser from 'pug-parser';

import { getOffsetFromLineAndCol } from '../utils/get-offset-from-line-and-col.js';
import { getOffsetsFromCode } from '@markuplint/parser-utils/location';
import type {
	ASTAttr,
	ASTBlock,
	ASTBlockComment,
	ASTCase,
	ASTCode,
	ASTComment,
	ASTConditional,
	ASTDoctype,
	ASTEach,
	ASTFilter,
	ASTInclude,
	ASTMixin,
	ASTMixinBlock,
	ASTNamedBlock,
	ASTNode,
	ASTRawInclude,
	ASTTag,
	ASTText,
	ASTWhen,
	PugAST,
} from '../types.js';

export function pugParse(pug: string, useOffset = false) {
	let lexOrigin = lexer(pug);

	/**
	 * Exclude indent and outdent tokens when offset is received to avoid indentation errors
	 */
	if (useOffset) {
		const newLexOrigin: lexer.Token[] = [];
		for (const token of lexOrigin) {
			if (token.type === 'indent' || token.type === 'outdent') {
				continue;
			}
			newLexOrigin.push(token);
		}
		lexOrigin = newLexOrigin;
	}

	const lex: lexer.Token[] = structuredClone(lexOrigin);
	const originAst = parser(lexOrigin);
	const ast = optimizeAST(originAst, lex, pug);
	return ast;
}

function getOffsetsFromLines(pug: string): number[] {
	const lines = pug.split(/\n/);
	let chars = 0;
	const result = lines.map(line => {
		chars += line.length + 1;
		return chars;
	});
	return result;
}

function mergeTextNode(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodes: readonly ASTNode[],
	pug: string,
): readonly ASTNode[] {
	const baseNodes: ASTNode[] = [];
	for (const node of nodes) {
		const prevNode: ASTNode | null = baseNodes.at(-1) ?? null;
		if (prevNode && prevNode.type === 'Text' && node.type === 'Text') {
			prevNode.raw = pug.slice(prevNode.offset, node.endOffset);
			prevNode.endColumn = node.endColumn;
			prevNode.endLine = node.endLine;
			prevNode.endOffset = node.endOffset;
			continue;
		}
		baseNodes.push(node);
	}
	return baseNodes;
}

/**
 *
 * @param originalAST
 * @param tokens Lexed token list
 * @param pug Raw code
 */
function optimizeAST(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originalAST: PugAST.Block | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tokens: readonly lexer.Token[],
	pug: string,
): ASTBlock {
	const nodes: ASTNode[] = [];

	if (!originalAST) {
		return {
			type: 'Block',
			nodes: [],
			line: 0,
		};
	}

	for (const node of originalAST.nodes) {
		const line = node.line;
		const column = node.column ?? 0;
		const offsets = getOffsetsFromLines(pug);
		const lineOffset = Math.max(offsets[line - 2] ?? 0, 0);
		const offset = lineOffset + column - 1;

		const { endLine, endColumn, endOffset } = getLocationFromToken(offset, line, column, tokens);
		const raw = pug.slice(offset, endOffset);

		switch (node.type) {
			case 'Block': {
				const block = optimizeAST(node, tokens, pug);
				nodes.push(...block.nodes);
				continue;
			}
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

				const tagNode: ASTTag = {
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
					attributeBlocks: node.attributeBlocks ?? [],
					selfClosing: node.selfClosing,
					isInline: node.isInline,
					filename: node.filename ?? null,
				};

				nodes.push(tagNode);
				continue;
			}
			case 'Conditional': {
				const block = optimizeAST(node.consequent, tokens, pug);

				const condNode: ASTConditional = {
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
					filename: node.filename ?? null,
				};

				nodes.push(condNode);

				const altNodes = optimizeASTOfConditionalNode(node, tokens, pug, offsets, 0);
				nodes.push(...altNodes);
				continue;
			}
			case 'Each': {
				const block = optimizeAST(node.block, tokens, pug);

				const eachNode: ASTEach = {
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
					filename: node.filename ?? null,
				};
				nodes.push(eachNode);
				continue;
			}
			case 'Include': {
				const block = optimizeAST(node.block, tokens, pug);

				const includeNode: ASTInclude = {
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
					filename: node.filename ?? null,
				};

				nodes.push(includeNode);
				continue;
			}
			case 'RawInclude': {
				const includeNode: ASTRawInclude = {
					type: node.type,
					file: node.file,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					filters: node.filters,
					filename: node.filename ?? null,
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

				const mixinNode: ASTMixin = {
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
					attributeBlocks: node.attributeBlocks ?? [],
					filename: node.filename ?? null,
				};

				nodes.push(mixinNode);
				continue;
			}
			case 'MixinBlock': {
				const mixinNode: ASTMixinBlock = {
					type: 'MixinBlock',
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					filename: node.filename ?? null,
				};

				nodes.push(mixinNode);
				continue;
			}
			case 'NamedBlock': {
				const namedBlockNode: ASTNamedBlock = {
					...node,
					nodes: optimizeAST(
						{
							...node,
							type: 'Block',
						},
						tokens,
						pug,
					).nodes,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
				};

				nodes.push(namedBlockNode);
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
					filename: node.filename ?? null,
				};
				nodes.push(commentNode);
				continue;
			}
			case 'BlockComment': {
				const block = optimizeAST(node.block, tokens, pug);

				const commentNode: ASTBlockComment = {
					type: node.type,
					val: node.val,
					buffer: node.buffer,
					block,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					filename: node.filename ?? null,
				};
				nodes.push(commentNode);
				continue;
			}
			case 'Code': {
				const block = optimizeAST(node.block, tokens, pug);

				const newNode: ASTCode = {
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
					block,
					filename: node.filename ?? null,
				};

				nodes.push(newNode);
				continue;
			}
			case 'Text': {
				const pipelessText = getPipelessText(node, pug, tokens);
				if (pipelessText) {
					const textNode: ASTText = {
						...node,
						...pipelessText,
					};
					nodes.push(textNode);
					break;
				}

				const textNodes = getRawTextAndLocationEnd(node.val, offset, line, column, tokens, pug);

				nodes.push(...textNodes);
				continue;
			}
			case 'Doctype': {
				const commentNode: ASTDoctype = {
					type: node.type,
					raw,
					offset,
					endOffset,
					line,
					endLine,
					column,
					endColumn,
					filename: node.filename ?? null,
				};
				nodes.push(commentNode);
				continue;
			}
			case 'Case':
			case 'When': {
				const block = optimizeAST(node.block, tokens, pug);

				const caseNode: ASTCase | ASTWhen = {
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
					filename: node.filename ?? null,
				};
				nodes.push(caseNode);
				continue;
			}
			case 'Filter': {
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

				const filterNode: ASTFilter = {
					type: node.type,
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
					filename: node.filename ?? null,
				};
				nodes.push(filterNode);
				continue;
			}
			default: {
				// @ts-expect-error
				throw new Error(`Unsupported syntax: The "${node.type}" node\n${JSON.stringify(node, null, 2)}`);
			}
		}
	}

	const mergedNodes = mergeTextNode(nodes, pug);

	return {
		type: 'Block',
		nodes: mergedNodes,
		line: originalAST.line,
	};
}

function optimizeASTOfConditionalNode(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: PugAST.CodeHelpers.Conditional,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tokens: readonly lexer.Token[],
	pug: string,
	offsets: readonly number[],
	depth: number,
) {
	const altNodes: ASTNode[] = [];

	let tokenOfCurrentNode: lexer.Token | null = null;
	for (const token of tokens) {
		if (token.type === 'else-if' && token.loc.start.line === node.consequent.line - 1) {
			tokenOfCurrentNode = token;
			break;
		}
	}

	if (tokenOfCurrentNode) {
		// console.log(JSON.stringify(node, null, 2));
		const lineOffset = Math.max(offsets[node.line - 2] ?? 0, 0);
		const offset = lineOffset + (node.column ?? 0) - 1;

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
			filename: node.filename ?? null,
		});
	}

	if ('alternate' in node && node.alternate) {
		switch (node.alternate.type) {
			case 'Block': {
				let tokenOfCurrentNode: lexer.Token | null = null;
				for (const token of tokens) {
					if (token.type === 'else' && token.loc.start.line === node.alternate.line - 1) {
						tokenOfCurrentNode = token;
						break;
					}
				}

				if (!tokenOfCurrentNode) {
					return [];
				}

				const lineOffset = Math.max(offsets[tokenOfCurrentNode.loc.start.line - 2] ?? 0, 0);
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
					filename: node.filename ?? null,
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
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tokens: readonly lexer.Token[],
	tokenType?: string | readonly string[],
) {
	const tokenTypes = typeof tokenType === 'string' ? (tokenType === '' ? null : [tokenType]) : (tokenType ?? null);
	let tokenOfCurrentNode: lexer.Token | null = null;
	for (const token of tokens) {
		if (
			(tokenTypes == null || tokenTypes.includes(token.type)) &&
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

function getAttrs(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originalAttrs: readonly PugAST.AbstractNodeTypes.Attribute[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tokens: readonly lexer.Token[],
	offsets: readonly number[],
	pug: string,
) {
	const attrs: ASTAttr[] = [];

	for (const attr of originalAttrs) {
		const attrLineOffset = offsets[attr.line - 2] ?? 0;
		const attrOffset = attrLineOffset + attr.column - 1;

		let tokenOfCurrentAttr: lexer.Token | null = null;
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
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tokens: readonly lexer.Token[],
	offsets: readonly number[],
) {
	let beforeNewlineToken: lexer.Token | null = null;
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
			const endAttrLineOffset = Math.max(offsets[beforeNewlineToken.loc.end.line - 2] ?? 0, 0);
			const endAttrOffset = endAttrLineOffset + beforeNewlineToken.loc.end.column - 1;
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

function getPipelessText(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: PugAST.Text,
	pug: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tokens: readonly lexer.Token[],
) {
	let startPipelessText: lexer.Token | null = null;
	let endPipelessText: lexer.Token | null = null;
	for (const token of tokens) {
		if (token.type === 'start-pipeless-text') {
			startPipelessText = token;
		}
		if (token.type === 'end-pipeless-text') {
			endPipelessText = token;
		}
	}

	if (!(startPipelessText && endPipelessText)) {
		return null;
	}

	if (startPipelessText.loc.start.line < node.line && node.line < endPipelessText.loc.start.line) {
		const { line, column } = startPipelessText.loc.start;
		const { line: endLine, column: endColumn } = endPipelessText.loc.end;
		const offset = getOffsetFromLineAndCol(pug, line, column);
		const endOffset = getOffsetFromLineAndCol(pug, endLine, endColumn);
		const raw = pug.slice(offset, endOffset);
		return {
			raw,
			offset,
			endOffset,
			line,
			endLine,
			column,
			endColumn,
		};
	}

	return null;
}

function getRawTextAndLocationEnd(
	val: string,
	offset: number,
	line: number,
	column: number,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tokens: readonly lexer.Token[],
	pug: string,
): ASTText[] {
	if (val.trim() === '') {
		return [];
	}

	let depth = 0;
	let endLine = line;
	let endColumn = column;

	const result: ASTText[] = [];

	for (const token of tokens) {
		if (token.loc.start.line < line || (token.loc.start.line === line && token.loc.start.column < column)) {
			continue;
		}

		switch (token.type) {
			case 'text':
			case 'text-html': {
				endLine = token.loc.end.line;
				endColumn = token.loc.end.column;
				break;
			}
			case 'indent': {
				depth++;
				break;
			}
			case 'outdent': {
				depth--;
				break;
			}
			case 'newline': {
				break;
			}
			default: {
				depth = -1;
				break;
			}
		}

		const rawLoc = getOffsetsFromCode(pug, line, column, endLine, endColumn);
		const raw = pug.slice(offset, rawLoc.endOffset);

		if (raw.trim().startsWith('|')) {
			// It is a piped text
			break;
		}

		if (raw !== '') {
			result.push({
				type: 'Text',
				raw,
				val: raw,
				offset,
				endOffset: rawLoc.endOffset,
				line,
				endLine,
				column,
				endColumn,
				filename: null,
			});
		}

		offset = rawLoc.endOffset;
		line = endLine;
		column = endColumn;

		if (depth <= -1) {
			break;
		}
	}

	return result;
}
