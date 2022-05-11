import type { MLNode } from './node';
import type { MappedNode } from './types';
import type { MLASTAbstructNode } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { ParserError } from '@markuplint/parser-utils';

class NodeStore {
	#store = new Map<string, MLNode<any, any, any>>();

	getNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(astNode: N): MappedNode<N, T, O> {
		// console.log(`Get: ${astNode.uuid} -> ${astNode.raw.trim()}(${astNode.type})`);
		const node = this.#store.get(astNode.uuid);
		if (!node) {
			throw new ParserError('Broke mapping nodes.', {
				line: astNode.startLine,
				col: astNode.startCol,
				raw: astNode.raw,
				nodeName: astNode.nodeName,
			});
		}
		return node as MappedNode<N, T, O>;
	}

	setNode<A extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(astNode: A, node: MLNode<T, O, A>) {
		this.#store.set(astNode.uuid, node);
	}
}

/**
 * `NodeStore` Singleton
 */
export const nodeStore = new NodeStore();
