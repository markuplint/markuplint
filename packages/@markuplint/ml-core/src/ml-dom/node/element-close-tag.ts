import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { MLASTElementCloseTag } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLNode } from './node.js';

export class MLElementCloseTag<T extends RuleConfigValue, O extends PlainData = undefined> extends MLNode<
	T,
	O,
	MLASTElementCloseTag
> {
	readonly pair: MLElement<T, O>;

	constructor(
		astNode: MLASTElementCloseTag,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		pair: MLElement<T, O>,
	) {
		super(astNode, document);
		this.pair = pair;
	}

	/**
	 * Returns a string appropriate for the type of node as `MLBlock`
	 *
	 * @implements `@markuplint/ml-core` API: `MLBlock`
	 */
	get nodeName() {
		return this.pair.nodeName;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	get rawName() {
		return this._astToken.nodeName;
	}

	toString(fixed = false) {
		if (!fixed) {
			return this.raw;
		}

		if (this.nodeName.startsWith('#')) {
			return this.raw;
		}

		if (this.pair.isOmitted) {
			return this.raw;
		}

		return [
			this.pair.tagOpenChar,
			this.pair.tagOpenChar === '' ? '' : '/',
			this.pair.fixedNodeName === this.pair.rawName ? this.rawName : this.pair.fixedNodeName,
			this.pair.tagCloseChar,
		].join('');
	}
}
