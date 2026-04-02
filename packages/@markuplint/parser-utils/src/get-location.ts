export { getPosition } from '@markuplint/shared';

const LINE_BREAK = '\n';

export function getEndLine(rawCodeFragment: string, startLine: number) {
	return rawCodeFragment.split(LINE_BREAK).length - 1 + startLine;
}

export function getEndCol(rawCodeFragment: string, startCol: number) {
	const lines = rawCodeFragment.split(LINE_BREAK);
	const lineCount = lines.length;
	const lastLine = lines.pop()!;
	return lineCount > 1 ? lastLine.length + 1 : startCol + rawCodeFragment.length;
}

/**
 * Computes the end position of a code fragment given its start position.
 *
 * @param rawCodeFragment - The raw source text of the fragment
 * @param startOffset - The zero-based byte offset where the fragment starts
 * @param startLine - The one-based line number where the fragment starts
 * @param startCol - The one-based column number where the fragment starts
 * @returns An object containing `endOffset`, `endLine`, and `endCol`
 */
export function getEndPosition(rawCodeFragment: string, startOffset: number, startLine: number, startCol: number) {
	return {
		endOffset: startOffset + rawCodeFragment.length,
		endLine: getEndLine(rawCodeFragment, startLine),
		endCol: getEndCol(rawCodeFragment, startCol),
	};
}

/**
 * Converts line/column ranges to byte offsets within a code string.
 *
 * @param rawCode - The full raw source text
 * @param startLine - The one-based start line number
 * @param startCol - The one-based start column number
 * @param endLine - The one-based end line number
 * @param endCol - The one-based end column number
 * @returns An object containing zero-based `offset` and `endOffset`
 */
export function getOffsetsFromCode(
	rawCode: string,
	startLine: number,
	startCol: number,
	endLine: number,
	endCol: number,
) {
	const lines = rawCode.split('\n');
	let offset = 0;
	let endOffset = 0;

	for (let i = 0; i < startLine - 1; i++) {
		const line = lines[i];
		if (line == null) {
			continue;
		}
		offset += line.length + 1;
	}

	offset += startCol - 1;

	for (let i = 0; i < endLine - 1; i++) {
		const line = lines[i];
		if (line == null) {
			continue;
		}
		endOffset += line.length + 1;
	}

	endOffset += endCol - 1;

	return { offset, endOffset };
}
