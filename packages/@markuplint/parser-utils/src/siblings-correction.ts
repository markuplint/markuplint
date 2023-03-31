import type { MLASTNode } from '@markuplint/ml-ast';

/**
 * Correct the references to prevNode and nextNode in the order listed.
 *
 * @param nodeList
 * @affects nodeList[].prevNode
 * @affects nodeList[].nextNode
 */
export function siblingsCorrection(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: MLASTNode[],
) {
	for (let i = 0; i < nodeList.length; i++) {
		const prevNode = nodeList[i - 1] ?? null;
		const node = nodeList[i];
		if (!node) {
			continue;
		}
		const nextNode = nodeList[i + 1] ?? null;
		node.prevNode = prevNode;
		node.nextNode = nextNode;
	}
}
