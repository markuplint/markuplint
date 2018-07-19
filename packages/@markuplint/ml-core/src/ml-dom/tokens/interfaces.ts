import Node from './node';

export type AmbiguousNode<T, O> = Node<T, O> | null;
export type ParentNode<T, O> = Node<T, O>;
