import { MLASTElement, MLASTNode } from '@markuplint/ml-ast';

export type Walker = (node: MLASTNode) => void;

export function walk(nodeList: MLASTNode[], walker: Walker) {
	for (const node of nodeList) {
		walker(node);
		const tag = node as MLASTElement;
		if (tag.childNodes && tag.childNodes.length) {
			walk(tag.childNodes, walker);
		}
		if (tag.pearNode) {
			walker(tag.pearNode);
		}
	}
}
