import {
	NodeType,
} from '.';

import Element from './element';
import Node from './node';

export default class EndTagNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'EndTag';

	// define when created instance frin parser/index.ts
	public readonly startTagNode!: Element<T, O>;

	// define when created instance frin parser/index.ts
	public readonly isForeignElement!: boolean;

	// define when created instance frin parser/index.ts
	public readonly isPotentialCustomElement!: boolean;

	public get raw () {
		return `</${this.nodeName}>`;
	}
}
