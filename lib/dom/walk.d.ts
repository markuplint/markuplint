import GhostNode from './ghost-node';
import Node from './node';
export declare type Walker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => Promise<void>;
export declare function walk<T, O>(nodeList: (Node<T, O> | GhostNode<T, O>)[], walker: Walker<T, O>): Promise<void>;
