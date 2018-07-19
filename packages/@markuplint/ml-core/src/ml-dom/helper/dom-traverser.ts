import { MLASTAbstructNode } from '@markuplint/ml-ast/src';
import Node from '../tokens/node';
import { MappedNode } from './mapped-nodes';

const store = new WeakMap<MLASTAbstructNode, Node>();

export function setNode<N extends MLASTAbstructNode, T, O>(astNode: N, node: MappedNode<N, T, O>) {
	store.set(astNode, node);
}

export function getNode<N extends MLASTAbstructNode, T, O>(astNode: N) {
	return store.get(astNode) as MappedNode<N, T, O>;
}
