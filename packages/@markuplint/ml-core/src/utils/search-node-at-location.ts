/**
 * A source range: from its start, included, to its end, excluded (the end is
 * where the next token starts). Without an end, it holds only its start.
 */
export interface LocatedToken {
	readonly startLine: number;
	readonly startCol: number;
	readonly endLine?: number;
	readonly endCol?: number;
}

/**
 * A node with its source range. The range of an element is its start tag; its
 * end tag, which is not in a document's node list, is `closeTag`.
 */
export interface LocatedNode extends LocatedToken {
	readonly closeTag?: LocatedToken | null;
}

/**
 * Finds the node of `nodeList` at the source location `line`:`col` (both 1-based).
 *
 * The node is the one whose range holds the position, or whose end tag does: a
 * document's node list has no attribute nodes and no end tags, so a position at
 * an attribute, inside its value or in an end tag is the element that has it. Of
 * several such nodes the last in the list is taken: the innermost. A block
 * (`#ml-block`) holds the elements nested in it, and an omitted element
 * (`<tbody>` with an empty source) starts where its first child does.
 *
 * The list is in document order, as the parser sorts its nodes by offset, so the
 * search stops at the first node that starts after the position. It works on the
 * structural `LocatedNode` so that it reads the node list of any version of the
 * engine: the language server searches the document of the markuplint the user
 * installed, and the suppressions search a node list cast to their own type.
 *
 * @param nodeList - The nodes of a document, in document order.
 * @param line - The 1-based line number to search at.
 * @param col - The 1-based column number to search at.
 * @returns The node at the location, or `null` if there is none.
 */
export function searchNodeAtLocation<N extends LocatedNode>(
	nodeList: Iterable<N>,
	line: number,
	col: number,
): N | null {
	let found: N | null = null;
	for (const node of nodeList) {
		if (isBefore(line, col, node)) {
			break;
		}
		if (holdsLocation(node, line, col) || (node.closeTag != null && holdsLocation(node.closeTag, line, col))) {
			found = node;
		}
	}
	return found;
}

/** Whether `line`:`col` comes before the start of `token`. */
function isBefore(line: number, col: number, token: LocatedToken): boolean {
	return line < token.startLine || (line === token.startLine && col < token.startCol);
}

/**
 * Whether `line`:`col` is the start of `token` or in its range. The start is
 * compared first: the end of an `MLNode` is computed from its source on every read.
 */
function holdsLocation(token: LocatedToken, line: number, col: number): boolean {
	if (isBefore(line, col, token)) {
		return false;
	}
	if (line === token.startLine && col === token.startCol) {
		return true;
	}
	if (token.endLine === undefined || token.endCol === undefined) {
		return false;
	}
	return line < token.endLine || (line === token.endLine && col < token.endCol);
}
