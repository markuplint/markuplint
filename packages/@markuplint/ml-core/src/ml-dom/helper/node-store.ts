import { MLASTAbstructNode } from '@markuplint/ml-ast';
import MLDOMNode from '../tokens/node';
import MLParseError from '../../ml-error/ml-parse-error';
import { MappedNode } from './mapped-nodes';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class NodeStore {
	#store = new Map<string, MLDOMNode<any, any, any>>();

	setNode<A extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(
		astNode: A,
		node: MLDOMNode<T, O, A>,
	) {
		this.#store.set(astNode.uuid, node);
	}

	getNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(astNode: N) {
		// console.log(`Get: ${astNode.uuid} -> ${astNode.raw.trim()}(${astNode.type})`);
		const node = this.#store.get(astNode.uuid);
		if (!node) {
			throw new MLParseError(astNode.startLine, astNode.startCol, astNode.raw, astNode.nodeName);
		}
		return node as MappedNode<N, T, O>;
	}
}
