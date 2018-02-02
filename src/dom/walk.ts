import Element from '../dom/element';
import GhostNode from '../dom/ghost-node';
import Node from '../dom/node';
import OmittedElement from '../dom/omitted-element';

export type Walker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => Promise<void>;

export async function walk<T, O> (nodeList: (Node | GhostNode)[], walker: Walker<T, O>) {
	for (const node of nodeList) {
		await walker(node);
		if (node instanceof Element || node instanceof OmittedElement) {
			await walk(node.childNodes, walker);
		}
		if (node instanceof Element && node.endTagNode) {
			await walker(node.endTagNode);
		}
	}
}
