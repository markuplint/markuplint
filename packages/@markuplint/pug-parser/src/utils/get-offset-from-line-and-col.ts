export function getOffsetFromLineAndCol(str: string, line: number, col: number) {
	const lines = str.split('\n').slice(0, line);
	const lastLine = lines.pop();
	if (lastLine) {
		lines.push([...lastLine].slice(0, col).join(''));
	}
	return lines.join('\n').length;
}
