import GhostNode from './ghost-node';
import Node from './node';
export declare type SyncWalker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => void;
export declare function syncWalk<T, O>(nodeList: (Node<T, O> | GhostNode<T, O>)[], walker: SyncWalker<T, O>): void;
