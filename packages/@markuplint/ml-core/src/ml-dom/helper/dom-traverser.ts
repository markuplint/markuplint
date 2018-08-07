import { MLASTAbstructNode } from '@markuplint/ml-ast';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import Node from '../tokens/node';
import { MappedNode } from './mapped-nodes';

// tslint:disable-next-line:no-any
const store = new WeakMap<MLASTAbstructNode, Node<any, any, any>>();

export function setNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O extends RuleConfigOptions>(
	astNode: N,
	node: MappedNode<N, T, O>,
) {
	store.set(astNode, node);
}

export function getNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O extends RuleConfigOptions>(
	astNode: N,
) {
	const node = store.get(astNode);
	if (!node) {
		throw new Error(`Can not store node from "${astNode.raw}"`);
	}
	return node as MappedNode<N, T, O>;
}
