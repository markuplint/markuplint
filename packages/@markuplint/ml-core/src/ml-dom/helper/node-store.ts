import { MLASTAbstructNode } from '@markuplint/ml-ast';
import MLDOMNode from '../tokens/node';
import { MappedNode } from './mapped-nodes';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class NodeStore {
	private _store = new Map<string, MLDOMNode<any, any, any>>();

	public setNode<A extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(
		astNode: A,
		node: MLDOMNode<T, O, A>,
	) {
		this._store.set(astNode.uuid, node);
	}

	public getNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(astNode: N) {
		// console.log(`Get: ${astNode.uuid} -> ${astNode.raw.trim()}(${astNode.type})`);
		const node = this._store.get(astNode.uuid);
		if (!node) {
			throw new Error(`Can not store "${astNode.raw}" by ${astNode.uuid}`);
		}
		return node as MappedNode<N, T, O>;
	}
}
