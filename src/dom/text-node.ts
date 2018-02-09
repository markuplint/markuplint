import {
	NodeType,
} from './';

import Node from './node';

export default class TextNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Text';
}
