import type { JSXNode } from './jsx.js';
import type { MLASTNode, MLASTParentNode, ParserOptions } from '@markuplint/ml-ast';

import { nodeize } from './nodeize.js';

export function traverse(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	astNodes: readonly JSXNode[],
	parentNode: MLASTParentNode | null = null,
	rawHtml: string,
	options?: ParserOptions,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	let prevNode: MLASTNode | null = null;
	for (const astNode of astNodes) {
		const nodes = nodeize(astNode, prevNode, parentNode, rawHtml, options);
		if (!nodes || (Array.isArray(nodes) && nodes.length === 0)) {
			continue;
		}

		let node: MLASTNode;
		if (Array.isArray(nodes)) {
			const lastNode = nodes.at(-1);
			if (!lastNode) {
				continue;
			}
			node = lastNode;
		} else {
			node = nodes;
		}

		if (prevNode) {
			if (node.type !== 'endtag') {
				prevNode.nextNode = node;
			}
			node.prevNode = prevNode;
		}
		prevNode = node;

		if (Array.isArray(nodes)) {
			nodeList.push(...nodes);
		} else {
			nodeList.push(nodes);
		}
	}

	return nodeList;
}
