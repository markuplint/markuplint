import { MLASTAbstructNode } from '@markuplint/ml-ast';
import MLDOMNode from '../tokens/node';
import { MappedNode } from './mapped-nodes';
import { RuleConfigValue } from '@markuplint/ml-config';

const store = new WeakMap<MLASTAbstructNode, MLDOMNode<any, any, any>>();

export function setNode<A extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(
	astNode: A,
	node: MLDOMNode<T, O, A>,
) {
	store.set(astNode, node);
}

export function getNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(astNode: N) {
	const node = store.get(astNode);
	if (!node) {
		throw new Error(`Can not store node from "${astNode.raw}"`);
	}
	return node as MappedNode<N, T, O>;
}
