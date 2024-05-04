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
