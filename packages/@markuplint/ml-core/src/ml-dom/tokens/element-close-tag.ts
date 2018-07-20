import { MLASTElementCloseTag } from '@markuplint/ml-ast/';
import { NodeType } from '../types';
import Element from './element';
import Token from './token';

export default class ElementCloseTag<T, O> extends Token<MLASTElementCloseTag> {
	public readonly type: NodeType = 'ElementCloseTag';
	// 	// define when created instance frin parser/index.ts
	public readonly startTag: Element<T, O>;
	// 	// define when created instance frin parser/index.ts
	// 	public readonly isForeignElement!: boolean;
	// 	// define when created instance frin parser/index.ts
	// 	public readonly isPotentialCustomElement!: boolean;
	// 	public get raw() {
	// 		return `</${this.nodeName}>`;
	// 	}
	constructor(astNode: MLASTElementCloseTag, startTag: Element<T, O>) {
		super(astNode);
		this.startTag = startTag;
	}
}
