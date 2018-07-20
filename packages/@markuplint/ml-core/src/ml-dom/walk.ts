// import { AnonymousNode } from './document';

// export type Walker<T, O, N = AnonymousNode<T, O>> = (node: N) => Promise<void>;

// export async function walk<T, O>(nodeList: AnonymousNode<T, O>[], walker: Walker<T, O>) {
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
