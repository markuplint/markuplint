import {
	NodeType,
} from './';

import Element from './element';
import Node from './node';

export default class EndTagNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'EndTag';
	public readonly startTagNode!: Element<T, O>;

	public get raw () {
		return `</${this.nodeName}>`;
	}
}
