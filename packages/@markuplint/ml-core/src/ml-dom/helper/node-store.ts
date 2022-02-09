import type MLDOMNode from '../tokens/node';
import type { MappedNode } from './mapped-nodes';
import type { MLASTAbstructNode } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { ParserError } from '@markuplint/parser-utils';

export default class NodeStore {
	#store = new Map<string, MLDOMNode<any, any, any>>();

	setNode<A extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(astNode: A, node: MLDOMNode<T, O, A>) {
		this.#store.set(astNode.uuid, node);
	}

	getNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(astNode: N) {
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
}
