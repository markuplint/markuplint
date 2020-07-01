import { MLASTNode } from '@markuplint/ml-ast';

/**
 *
 * @disruptive
 * @param nodeOrders [Disruptive change]
 */
export function removeDeprecatedNode(nodeOrders: MLASTNode[]) {
	/**
	 * sorting
	 */
	nodeOrders.sort((a, b) => {
		if (a.isGhost || b.isGhost) {
			return 0;
		}
		return a.startOffset - b.startOffset;
	});

	/**
	 * remove duplicated node
	 */
	const stack: { [pos: string]: number } = {};
	const removeIndexes: number[] = [];
	nodeOrders.forEach((node, i) => {
		if (node.isGhost) {
			return;
		}
		const id = `${node.startLine}:${node.startCol}:${node.endLine}:${node.endCol}`;
		if (stack[id] != null) {
			removeIndexes.push(i);
		}
		stack[id] = i;
	});
	let r = nodeOrders.length;
	while (r--) {
		if (removeIndexes.includes(r)) {
			nodeOrders.splice(r, 1);
		}
	}
}
