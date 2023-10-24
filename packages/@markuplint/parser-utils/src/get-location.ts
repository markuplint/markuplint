export function getLine(html: string, startOffset: number) {
	return html.slice(0, startOffset).split(/\n/).length;
}

export function getCol(html: string, startOffset: number) {
	const lines = html.slice(0, startOffset).split(/\n/);
	return (lines.at(-1) ?? '').length + 1;
}

export function getEndLine(html: string, line: number) {
	return html.split(/\r?\n/).length - 1 + line;
}

export function getEndCol(html: string, col: number) {
	const lines = html.split(/\r?\n/);
	const lineCount = lines.length;
	const lastLine = lines.pop()!;
	return lineCount > 1 ? lastLine.length + 1 : col + html.length;
}

export function sliceFragment(rawHtml: string, start: number, end: number) {
	const raw = rawHtml.slice(start, end);
	return {
		startOffset: start,
		endOffset: end,
		startLine: getLine(rawHtml, start),
		endLine: getLine(rawHtml, end),
		startCol: getCol(rawHtml, start),
		endCol: getCol(rawHtml, end),
		raw,
	};
}
