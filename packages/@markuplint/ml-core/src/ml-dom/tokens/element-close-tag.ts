// import { NodeType } from '.';

// import Element from './element';
import { MLToken } from '@markuplint/ml-ast/src';
import Element from './element';
import Token from './token';

export default class ElementCloseTag<T, O> extends Token {
	// 	public readonly type: NodeType = 'EndTag';
	// 	// define when created instance frin parser/index.ts
	public readonly startTag: Element<T, O>;
	// 	// define when created instance frin parser/index.ts
	// 	public readonly isForeignElement!: boolean;
	// 	// define when created instance frin parser/index.ts
	// 	public readonly isPotentialCustomElement!: boolean;
	// 	public get raw() {
	// 		return `</${this.nodeName}>`;
	// 	}
	constructor(astNode: MLToken, startTag: Element<T, O>) {
		super(astNode);
		this.startTag = startTag;
	}
}
