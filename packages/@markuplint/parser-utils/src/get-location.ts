const LINE_BREAK = '\n';

/**
 * @deprecated Use {@link getPosition} instead. Will be removed in v5.0.0.
 */
export function getLine(rawCodeFragment: string, startOffset: number) {
	return rawCodeFragment.slice(0, startOffset).split(LINE_BREAK).length;
}

/**
 * @deprecated Use {@link getPosition} instead. Will be removed in v5.0.0.
 */
export function getCol(rawCodeFragment: string, startOffset: number) {
	const lines = rawCodeFragment.slice(0, startOffset).split(LINE_BREAK);
	return (lines.at(-1) ?? '').length + 1;
}

/**
 * Computes the line and column of a position within a code fragment.
 *
 * @param rawCodeFragment - The full raw source text
 * @param startOffset - The zero-based byte offset to compute the position of
 * @returns An object containing one-based `line` and `column`
 */
export function getPosition(rawCodeFragment: string, startOffset: number) {
	const lines = rawCodeFragment.slice(0, startOffset).split(LINE_BREAK);
	const line = lines.length;
	const column = (lines.at(-1) ?? '').length + 1;
	return { line, column } as const;
}

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
