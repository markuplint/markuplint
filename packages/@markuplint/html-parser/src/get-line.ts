export default function getLine(html: string, line: number) {
	return html.split(/\r?\n/).length - 1 + line;
}
