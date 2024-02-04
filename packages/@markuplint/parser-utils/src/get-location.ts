const LINE_BREAK = '\n';

export function getLine(rawCodeFragment: string, startOffset: number) {
	return rawCodeFragment.slice(0, startOffset).split(LINE_BREAK).length;
}

export function getCol(rawCodeFragment: string, startOffset: number) {
	const lines = rawCodeFragment.slice(0, startOffset).split(LINE_BREAK);
	return (lines.at(-1) ?? '').length + 1;
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
