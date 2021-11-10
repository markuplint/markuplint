import type { MLASTNode, Walker } from '@markuplint/ml-ast';

export function walk(nodeList: MLASTNode[], walker: Walker, depth = 0) {
	for (const node of nodeList) {
		walker(node, depth);
		if ('childNodes' in node) {
			if (node.type === 'endtag') {
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
