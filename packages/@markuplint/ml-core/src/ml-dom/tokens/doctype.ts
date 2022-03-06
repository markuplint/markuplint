import type { Document } from '../';
import type { IMLDOMDoctype } from '../types';
import type { MLASTDoctype, MLASTNode } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import MLDOMNode from './node';

export default class MLDOMDoctype<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTNode>
	implements IMLDOMDoctype
{
	readonly nodeType = 10;
	readonly type = 'Doctype';

	#name: string;
	#publicId: string;
	#systemId: string;

	constructor(astNode: MLASTDoctype, document: Document<T, O>) {
		super(astNode, document);
		this.#name = astNode.name;
		this.#publicId = astNode.publicId;
		this.#systemId = astNode.systemId;
	}

	get name() {
		return this.#name;
	}

	get publicId() {
		return this.#publicId;
	}

	get systemId() {
		return this.#systemId;
	}

	get textContent() {
		return null;
	}
}
