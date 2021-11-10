import type { AnonymousNode, Document } from '../';
import type { IMLDOMPreprocessorSpecificBlock } from '../types';
import type { MLASTPreprocessorSpecificBlock } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import MLDOMNode from './node';

export default class MLDOMPreprocessorSpecificBlock<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTPreprocessorSpecificBlock>
	implements IMLDOMPreprocessorSpecificBlock
{
	readonly type = 'PSBlock';
	readonly nodeName: string;

	constructor(astNode: MLASTPreprocessorSpecificBlock, document: Document<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
	}

	get childNodes(): AnonymousNode<T, O>[] {
		const astChildren = this._astToken.childNodes || [];
		return astChildren.map(node => this.nodeStore.getNode<typeof node, T, O>(node));
	}
}
