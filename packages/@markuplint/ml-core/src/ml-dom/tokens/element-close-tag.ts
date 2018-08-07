import { MLASTElementCloseTag } from '@markuplint/ml-ast';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import { setNode } from '../helper/dom-traverser';
import { NodeType } from '../types';
import Element from './element';
import Token from './token';

export default class ElementCloseTag<T extends RuleConfigValue, O extends RuleConfigOptions> extends Token<
	MLASTElementCloseTag
> {
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

		// TODO: type
		// @ts-ignore
		setNode(astNode, this);
	}
}
