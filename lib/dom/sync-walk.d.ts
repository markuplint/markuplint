import GhostNode from '../dom/ghost-node';
import Node from '../dom/node';
export declare type SyncWalker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => void;
export declare function syncWalk<T, O>(nodeList: (Node<T, O> | GhostNode<T, O>)[], walker: SyncWalker<T, O>): void;
