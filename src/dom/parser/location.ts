// export function getOffset (token: string, raw: string, offset = 0) {
// 	return raw.indexOf(token) + offset;
// }

export function getLine(token: string, line: number) {
	const hasBr = hasLineBroke(token);
	if (!hasBr) {
		return line;
	}
	// const i = getOffset(token, raw);
	// const before = raw.substr(0, i);
	// const after = raw.substr(0, token.length);
	return token.split(/\r?\n/).length - 1 + line;
}

export function getCol(token: string, col: number) {
	const hasBr = hasLineBroke(token);
	if (!hasBr) {
		return col;
	}
	// const i = getOffset(token, raw);
	// const before = raw.substr(0, i);
	return col;
}

export function getEndLine(token: string, line: number) {
	return token.split(/\r?\n/).length - 1 + line;
}

export function getEndCol(token: string, col: number) {
	const lines = token.split(/\r?\n/);
	const lineCount = lines.length;
	const lastLine = lines.pop()!;
	return lineCount > 1 ? lastLine.length + 1 : col + token.length;
}

function hasLineBroke(token: string) {
	return /\r?\n/.test(token);
}
