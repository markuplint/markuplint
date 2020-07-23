import { MLASTNode, MLASTNodeType, MLToken, Walker } from './types';
import { v4 as uuid4 } from 'uuid';

export function uuid() {
	return uuid4();
}

export function tokenizer(raw: string | null, line: number, col: number, startOffset: number): MLToken {
	raw = raw || '';
	return {
		uuid: uuid(),
		raw,
		startLine: line,
		endLine: getEndLine(raw, line),
		startCol: col,
		endCol: getEndCol(raw, col),
		startOffset,
		endOffset: startOffset + raw.length,
	};
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

export function getLine(html: string, startOffset: number) {
	return html.slice(0, startOffset).split(/\n/g).length;
}

export function getCol(html: string, startOffset: number) {
	const lines = html.slice(0, startOffset).split(/\n/g);
	return lines[lines.length - 1].length + 1;
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

export function walk(nodeList: MLASTNode[], walker: Walker, depth = 0) {
	for (const node of nodeList) {
		walker(node, depth);
		if ('childNodes' in node) {
			if (node.type === MLASTNodeType.EndTag) {
				continue;
			}
			if (node.childNodes && node.childNodes.length) {
				walk(node.childNodes, walker, depth + 1);
			}
			if ('pearNode' in node && node.pearNode) {
				walker(node.pearNode, depth);
			}
		}
	}
}

export function nodeListToDebugMaps(nodeList: MLASTNode[]) {
	return nodeList.map(n => {
		if (!n.isGhost) {
			return `[${n.startLine}:${n.startCol}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${
				n.nodeName
			}: ${visibleWhiteSpace(n.raw)}`;
		} else {
			return `[N/A]>[N/A](N/A)${n.nodeName}: ${visibleWhiteSpace(n.raw)}`;
		}
	});
}

function visibleWhiteSpace(chars: string) {
	return chars.replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣');
}
