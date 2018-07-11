import { MLASTNode } from '@markuplint/ml-ast/src';

export default function(nodeList: MLASTNode[]) {
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
	return chars
		.replace(/\n/g, '⏎')
		.replace(/\t/g, '→')
		.replace(/\s/g, '␣');
}
