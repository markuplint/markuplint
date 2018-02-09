import Element from './element';
import GhostNode from './ghost-node';
import Node from './node';
import OmittedElement from './omitted-element';

export type SyncWalker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => void;

export function syncWalk<T, O> (nodeList: (Node<T, O> | GhostNode<T, O>)[], walker: SyncWalker<T, O>) {
	for (const node of nodeList) {
		walker(node);
		if (node instanceof Element || node instanceof OmittedElement) {
			syncWalk(node.childNodes, walker);
		}
		if (node instanceof Element && node.endTagNode) {
			walker(node.endTagNode);
		}
	}
}
