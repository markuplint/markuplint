export default function getEndLine(html: string, line: number) {
	return html.split(/\r?\n/).length - 1 + line;
}
