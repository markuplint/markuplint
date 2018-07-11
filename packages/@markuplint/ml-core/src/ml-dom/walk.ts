// import Element from './element';
// import GhostNode from './ghost-node';
// import Node from './node';
// import OmittedElement from './omitted-element';

// export type Walker<T, O, N = Node<T, O> | GhostNode<T, O>> = (node: N) => Promise<void>;

// export async function walk<T, O>(nodeList: (Node<T, O> | GhostNode<T, O>)[], walker: Walker<T, O>) {
// 	for (const node of nodeList) {
// 		await walker(node);
// 		if (node instanceof Element || node instanceof OmittedElement) {
// 			await walk(node.childNodes, walker);
// 		}
// 		if (node instanceof Element && node.endTagNode) {
// 			await walker(node.endTagNode);
// 		}
// 	}
// }
